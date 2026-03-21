/**
 * useOfflineQueue — IndexedDB queue para ventas offline en POS
 * Cuando no hay internet, guarda la venta localmente.
 * Al recuperar conexión, sincroniza automáticamente con Supabase.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const DB_NAME    = 'pos_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_sales';

export interface OfflineSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OfflineSale {
  id: string;           // UUID local generado en frontend
  local_ticket: string; // Ej: OFL-20260316-001
  created_at: string;   // ISO timestamp local
  client_mode: 'generic' | 'student' | 'teacher';
  student_id:   string | null;
  teacher_id:   string | null;
  school_id:    string | null;
  cashier_id:   string;
  total: number;
  payment_method: string | null;  // para genérico
  is_free_account: boolean;
  items: OfflineSaleItem[];
  // Detalles de pago genérico
  cash_given?: number;
  payment_metadata?: Record<string, unknown>;
  synced: boolean;
  sync_failed?: boolean;  // true = falló definitivamente, no reintentar automáticamente
  sync_error?: string;
}

// ── IndexedDB helpers ──────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbPut(sale: OfflineSale): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(STORE_NAME, 'readwrite');
    const req  = tx.objectStore(STORE_NAME).put(sale);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function dbGetPending(): Promise<OfflineSale[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const idx   = store.index('synced');
    const req   = idx.getAll(IDBKeyRange.only(false));
    req.onsuccess = () => {
      // Excluir los que fallaron definitivamente — no contar como "pendientes"
      const result = (req.result as OfflineSale[]).filter(s => !s.sync_failed);
      resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Ticket local ───────────────────────────────────────────────────────────
// localSeq se inicializa desde IndexedDB para sobrevivir cierres de pestaña

let localSeq = 0; // 0 = sin inicializar

async function getNextLocalSeq(): Promise<number> {
  if (localSeq > 0) return ++localSeq;
  // Primera llamada: leer cuántos registros existen (sin importar si synced o no)
  const db = await openDB();
  const count: number = await new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  localSeq = count + 1;
  return localSeq;
}

async function nextLocalTicket(): Promise<string> {
  const now  = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq  = String(await getNextLocalSeq()).padStart(3, '0');
  return `OFL-${date}-${seq}`;
}

// ── Hook principal ─────────────────────────────────────────────────────────

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Actualizar contador de pendientes
  const refreshCount = useCallback(async () => {
    try {
      const pending = await dbGetPending();
      setPendingCount(pending.length);
    } catch { /* ignorar si IndexedDB no disponible */ }
  }, []);

  // Detectar cambios de conexión
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    refreshCount();
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refreshCount]);

  // ── Guardar venta offline ─────────────────────────────────────────────

  const saveOffline = useCallback(async (
    saleData: Omit<OfflineSale, 'id' | 'local_ticket' | 'created_at' | 'synced'>
  ): Promise<OfflineSale> => {
    const sale: OfflineSale = {
      ...saleData,
      id:           crypto.randomUUID(),
      local_ticket: await nextLocalTicket(),
      created_at:   new Date().toISOString(),
      synced:       false,
    };
    await dbPut(sale);
    await refreshCount();
    return sale;
  }, [refreshCount]);

  // ── Sincronizar una venta individual ─────────────────────────────────

  const syncOneSale = useCallback(async (sale: OfflineSale): Promise<void> => {
    const ticketCode = sale.local_ticket; // Mantener el ticket offline como código real

    if (sale.client_mode === 'student' && sale.student_id && !sale.is_free_account) {
      // Alumno con recarga — usar RPC atómica
      const { error } = await supabase.rpc('deduct_kiosk_balance', {
        p_student_id:  sale.student_id,
        p_amount:      sale.total,
        p_description: `Compra POS (offline) - Total: S/ ${sale.total.toFixed(2)}`,
        p_ticket_code: ticketCode,
        p_created_by:  sale.cashier_id,
        p_metadata:    { source: 'pos_offline', offline_id: sale.id, created_at_local: sale.created_at },
      });
      if (error) throw error;

    } else {
      // Alumno libre, profesor o genérico — insertar en transactions
      const isTeacher = sale.client_mode === 'teacher';
      const isGeneric = sale.client_mode === 'generic';

      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          student_id:     (!isTeacher && !isGeneric) ? sale.student_id : null,
          teacher_id:     isTeacher ? sale.teacher_id : null,
          school_id:      sale.school_id,
          type:           'purchase',
          amount:         -sale.total,
          description:    isTeacher
            ? `Compra Profesor (offline) - ${sale.items.length} items`
            : isGeneric
            ? `Compra Genérico (offline) - ${sale.items.length} items`
            : `Compra POS (offline Cuenta Libre) - Total: S/ ${sale.total.toFixed(2)}`,
          balance_after:  0,
          created_by:     sale.cashier_id,
          ticket_code:    ticketCode,
          payment_status: isGeneric ? 'paid' : 'pending',
          payment_method: isGeneric ? (sale.payment_method || 'efectivo') : null,
          metadata: {
            source:           'pos_offline',
            offline_id:       sale.id,
            created_at_local: sale.created_at,
            ...(sale.payment_metadata || {}),
          },
        })
        .select('id')
        .single();
      if (txError) throw txError;

      // transaction_items
      if (transaction?.id && sale.items.length > 0) {
        const { error: itemsError } = await supabase.from('transaction_items').insert(
          sale.items.map(item => ({
            transaction_id: transaction.id,
            product_id:     item.product_id,
            product_name:   item.product_name,
            quantity:       item.quantity,
            unit_price:     item.unit_price,
            subtotal:       item.subtotal,
          }))
        );
        if (itemsError) console.warn('[offline sync] transaction_items error:', itemsError.message);
      }
    }

    // Insertar en sales (best-effort)
    try {
      await supabase.from('sales').insert({
        transaction_id: ticketCode,
        student_id:     sale.student_id,
        teacher_id:     sale.teacher_id,
        school_id:      sale.school_id,
        cashier_id:     sale.cashier_id,
        total:          sale.total,
        subtotal:       sale.total,
        discount:       0,
        payment_method: sale.client_mode === 'teacher'
          ? 'teacher_account'
          : sale.client_mode === 'generic'
          ? (sale.payment_method || 'cash')
          : sale.is_free_account ? 'debt' : 'cash',
        cash_received:  sale.cash_given ?? null,
        change_given:   sale.cash_given ? sale.cash_given - sale.total : null,
        items: sale.items,
      });
    } catch { /* best-effort */ }

    await dbDelete(sale.id);
  }, []);

  // ── Sincronizar toda la cola ──────────────────────────────────────────

  const syncQueue = useCallback(async (): Promise<{ ok: number; failed: number }> => {
    if (syncingRef.current) return { ok: 0, failed: 0 };
    syncingRef.current = true;
    setIsSyncing(true);

    let ok = 0, failed = 0;
    try {
      const pending = await dbGetPending();
      for (const sale of pending) {
        try {
          await syncOneSale(sale);
          ok++;
        } catch (err: any) {
          failed++;
          // Marcar como fallido definitivamente para sacarlo del contador de pendientes
          await dbPut({ ...sale, sync_failed: true, sync_error: err.message });
        }
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshCount();
    }
    return { ok, failed };
  }, [syncOneSale, refreshCount]);

  // Auto-sincronizar al recuperar conexión
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncQueue().then(({ ok, failed }) => {
        if (failed > 0) {
          console.warn(`[offline] ${failed} venta(s) fallaron al sincronizar. Revisar en IndexedDB.`);
        }
      });
    }
  }, [isOnline]); // Solo cuando cambia isOnline

  return {
    isOnline,
    pendingCount,
    isSyncing,
    saveOffline,
    syncQueue,
  };
}
