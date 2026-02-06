// 💰 TIPOS PARA SISTEMA DE CIERRE DE CAJA

export interface CashRegisterClosure {
  id: string;
  school_id: string;
  
  // Información del cierre
  closure_date: string;
  closure_time: string;
  closed_by: string;
  status: 'open' | 'closed' | 'auto_closed';
  
  // Caja inicial
  opening_balance: number;
  opening_time: string;
  opened_by: string;
  
  // Ventas POS (por método de pago)
  pos_cash: number;
  pos_card: number;
  pos_yape: number;
  pos_yape_qr: number;
  pos_credit: number;
  pos_mixed_cash: number;
  pos_mixed_card: number;
  pos_mixed_yape: number;
  
  // Almuerzos
  lunch_cash: number;
  lunch_credit: number;
  
  // Movimientos de caja
  total_income: number;
  total_expenses: number;
  
  // Caja final
  expected_balance: number;
  actual_balance: number | null;
  difference: number | null;
  
  // División de efectivo
  petty_cash: number | null;
  safe_cash: number | null;
  
  // Ajustes
  adjustment_reason: string | null;
  adjustment_approved_by: string | null;
  adjustment_approved_at: string | null;
  
  // Auditoría
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  closure_id: string;
  school_id: string;
  
  // Tipo de movimiento
  movement_type: 'income' | 'expense' | 'adjustment' | 'opening_adjustment';
  
  // Detalles
  amount: number;
  reason: string;
  category: string | null;
  
  // Responsable
  registered_by: string;
  authorized_by: string | null;
  authorized_at: string | null;
  
  // Comprobante
  voucher_number: string | null;
  voucher_printed: boolean;
  voucher_printed_at: string | null;
  
  // Auditoría
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashRegisterConfig {
  id: string;
  school_id: string;
  
  // Cierre automático
  auto_close_enabled: boolean;
  auto_close_time: string;
  
  // Alertas
  alert_on_difference: boolean;
  alert_threshold: number;
  
  // Reportes
  whatsapp_number: string | null;
  whatsapp_enabled: boolean;
  
  // Impresión
  print_on_close: boolean;
  include_signatures: boolean;
  
  created_at: string;
  updated_at: string;
}

// Tipos para el resumen del dashboard
export interface CashRegisterSummary {
  openingBalance: number;
  
  // Ventas POS
  posTotal: number;
  posCash: number;
  posCard: number;
  posYape: number;
  posYapeQR: number;
  posCredit: number;
  posMixedCash: number;
  posMixedCard: number;
  posMixedYape: number;
  
  // Almuerzos
  lunchTotal: number;
  lunchCash: number;
  lunchCredit: number;
  
  // Movimientos
  totalIncome: number;
  totalExpenses: number;
  
  // Totales
  totalCash: number; // Todo el efectivo junto
  totalCredit: number; // Todo el crédito
  expectedBalance: number;
  actualBalance: number | null;
  difference: number | null;
}

// Tipo para estadísticas por método de pago
export interface PaymentMethodStats {
  method: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
}
