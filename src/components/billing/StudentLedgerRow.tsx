import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronUp, Loader2,
  TrendingUp, TrendingDown, Receipt, Clock,
  AlertTriangle, CheckCircle2, History,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface LedgerEvent {
  event_id:       string;
  event_type:     string;  // 'purchase' | 'recharge'
  source:         string;  // 'pos' | 'historical_kiosk_entry' | 'recharge_request' | ...
  amount:         number;  // SIGNED: positivo = ingreso, negativo = gasto
  description:    string;
  event_date:     string;
  payment_status: string;
  ticket_code:    string | null;
  reference_code: string | null;
  voucher_url:    string | null;
  running_balance?: number; // calculado en cliente
}

export interface StudentLedgerGroup {
  student_id:       string;
  student_name:     string;
  school_name:      string;
  current_balance:  number;
  historical_count: number;   // nº de ventas históricas
  historical_total: number;   // suma de montos históricos
  free_account:     boolean;
}

interface Props {
  group:      StudentLedgerGroup;
  canViewAll: boolean;
}

// ── Helpers visuales ───────────────────────────────────────────────────────

const isHistorical  = (e: LedgerEvent) => e.source === 'historical_kiosk_entry' || e.ticket_code?.startsWith('HIS-');
const isRecharge    = (e: LedgerEvent) => e.event_type === 'recharge' || e.source === 'recharge_request';
const isPosPurchase = (e: LedgerEvent) => !isHistorical(e) && !isRecharge(e);

function eventStyle(e: LedgerEvent): { border: string; bg: string; icon: JSX.Element; label?: JSX.Element } {
  if (isRecharge(e)) return {
    border: 'border-l-emerald-500',
    bg:     'bg-emerald-50/60',
    icon:   <TrendingUp  className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />,
  };
  if (isHistorical(e)) return {
    border: 'border-l-amber-400',
    bg:     'bg-amber-50/60',
    icon:   <History className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />,
    label:  <span className="text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded-full">Histórico</span>,
  };
  return {
    border: 'border-l-red-400',
    bg:     'bg-red-50/40',
    icon:   <TrendingDown className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />,
  };
}

// ── Componente ─────────────────────────────────────────────────────────────

export const StudentLedgerRow = ({ group, canViewAll }: Props) => {
  const [expanded,      setExpanded]      = useState(false);
  const [timeline,      setTimeline]      = useState<LedgerEvent[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerLoaded,  setLedgerLoaded]  = useState(false);

  const balanceNegative = group.current_balance < 0;

  const toggleExpand = async () => {
    if (!expanded && !ledgerLoaded) {
      setLoadingLedger(true);
      try {
        const { data, error } = await supabase.rpc('get_student_ledger', {
          p_student_id: group.student_id,
        });
        if (error) throw error;

        // Calcular running balance cronológico (data ya viene ASC por event_date)
        let running = 0;
        const enriched: LedgerEvent[] = (data || []).map((e: LedgerEvent) => {
          running += e.amount;
          return { ...e, running_balance: running };
        });

        setTimeline(enriched.reverse()); // mostrar más reciente arriba
        setLedgerLoaded(true);
      } catch (err) {
        console.error('Error cargando ledger:', err);
      } finally {
        setLoadingLedger(false);
      }
    }
    setExpanded(v => !v);
  };

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200 overflow-hidden',
      expanded
        ? 'border-slate-300 shadow-md'
        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
    )}>
      {/* ── Fila principal (cabecera del acordeón) ── */}
      <button
        onClick={toggleExpand}
        className="w-full text-left bg-white px-4 py-3 flex items-center gap-3"
      >
        {/* Avatar inicial */}
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0 text-slate-700 font-black text-sm">
          {group.student_name.charAt(0).toUpperCase()}
        </div>

        {/* Nombre + sede */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-800 truncate">{group.student_name}</p>
          {canViewAll && (
            <p className="text-[11px] text-slate-400 truncate">{group.school_name}</p>
          )}
        </div>

        {/* Resumen compacto */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
          <span className="flex items-center gap-1">
            <History className="h-3 w-3 text-amber-500" />
            {group.historical_count} venta{group.historical_count !== 1 ? 's' : ''} hist.
          </span>
          <span className="text-amber-700 font-semibold">
            S/ {group.historical_total.toFixed(2)}
          </span>
        </div>

        {/* Saldo actual — muy visible, rojo si negativo */}
        <div className={cn(
          'flex-shrink-0 rounded-xl px-3 py-1.5 text-center min-w-[90px]',
          balanceNegative
            ? 'bg-red-50 border border-red-200'
            : group.free_account
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-emerald-50 border border-emerald-200',
        )}>
          {balanceNegative && (
            <AlertTriangle className="h-2.5 w-2.5 text-red-500 mx-auto mb-0.5" />
          )}
          <p className={cn(
            'text-sm font-black leading-tight',
            balanceNegative      ? 'text-red-600'
            : group.free_account ? 'text-blue-600'
            :                      'text-emerald-700',
          )}>
            {group.free_account ? 'Libre' : `S/ ${group.current_balance.toFixed(2)}`}
          </p>
          <p className="text-[9px] text-slate-400 leading-none mt-0.5">saldo actual</p>
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0 ml-1 text-slate-400">
          {loadingLedger
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : expanded
              ? <ChevronUp   className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />
          }
        </div>
      </button>

      {/* ── Línea de tiempo (acordeón) ── */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 space-y-1.5">

          {/* Alerta si saldo negativo */}
          {balanceNegative && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Saldo negativo: el alumno consumió más de lo recargado. Pendiente de regularización.</span>
            </div>
          )}

          {timeline.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Sin movimientos registrados</p>
          ) : (
            <>
              {/* Leyenda */}
              <div className="flex items-center gap-3 text-[10px] text-slate-400 pb-1 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Recarga</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Compra POS</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Venta Histórica</span>
              </div>

              {/* Eventos */}
              {timeline.map((event) => {
                const style = eventStyle(event);
                const isIncome = event.amount > 0;
                return (
                  <div
                    key={event.event_id}
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border-l-[3px] px-3 py-2 text-xs',
                      style.border, style.bg,
                    )}
                  >
                    {/* Icono tipo */}
                    <div className="mt-0.5">{style.icon}</div>

                    {/* Descripción + fecha */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-700 truncate max-w-[260px]">
                          {event.description || '—'}
                        </span>
                        {style.label}
                        {event.payment_status === 'pending' && (
                          <span className="text-[9px] bg-orange-100 text-orange-700 border border-orange-300 px-1.5 py-0.5 rounded-full font-bold">
                            ⏳ Pendiente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(event.event_date), "d 'de' MMM yyyy · HH:mm", { locale: es })}
                        </span>
                        {event.ticket_code && (
                          <span className="flex items-center gap-1 font-mono">
                            <Receipt className="h-2.5 w-2.5" />
                            {event.ticket_code}
                          </span>
                        )}
                        {event.reference_code && (
                          <span className="font-mono">Nº op. {event.reference_code}</span>
                        )}
                      </div>
                    </div>

                    {/* Monto + running balance */}
                    <div className="text-right flex-shrink-0">
                      <p className={cn(
                        'font-black text-sm',
                        isIncome ? 'text-emerald-600' : 'text-red-500',
                      )}>
                        {isIncome ? '+' : ''}S/ {Math.abs(event.amount).toFixed(2)}
                      </p>
                      {event.running_balance !== undefined && (
                        <p className={cn(
                          'text-[10px] font-semibold',
                          event.running_balance < 0 ? 'text-red-400' : 'text-slate-400',
                        )}>
                          = {event.running_balance < 0 ? '-' : ''}S/ {Math.abs(event.running_balance).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Footer: saldo final */}
              <div className={cn(
                'flex items-center justify-between rounded-xl px-4 py-2.5 mt-2 border text-sm font-bold',
                balanceNegative
                  ? 'bg-red-600 border-red-700 text-white'
                  : 'bg-emerald-600 border-emerald-700 text-white',
              )}>
                <span className="flex items-center gap-1.5">
                  {balanceNegative
                    ? <AlertTriangle className="h-4 w-4" />
                    : <CheckCircle2  className="h-4 w-4" />
                  }
                  Saldo actual
                </span>
                <span className="text-lg font-black">
                  {group.current_balance < 0 ? '-' : ''}S/ {Math.abs(group.current_balance).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
