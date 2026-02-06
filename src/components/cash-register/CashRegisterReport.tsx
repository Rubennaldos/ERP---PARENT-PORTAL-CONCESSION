// 🖨️ COMPONENTE DE REPORTE DE CIERRE DE CAJA PARA IMPRESIÓN
// Formato: Ticket térmico 80mm

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CashRegisterClosure, CashRegisterSummary } from '@/types/cashRegister';

interface CashRegisterReportProps {
  closure: CashRegisterClosure;
  summary: CashRegisterSummary;
  schoolName?: string;
  closedByName?: string;
}

export function CashRegisterReport({ 
  closure, 
  summary, 
  schoolName = 'MI COLEGIO',
  closedByName = 'USUARIO'
}: CashRegisterReportProps) {
  
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes para imprimir');
      return;
    }

    const html = generateReportHTML();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const generateReportHTML = () => {
    const date = format(new Date(closure.closure_date), "dd/MM/yyyy", { locale: es });
    const time = format(new Date(closure.closure_time), "HH:mm", { locale: es });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cierre de Caja - ${date}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 80mm;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      line-height: 1.3;
      padding: 5mm;
      color: #000;
      background: #fff;
    }
    
    .header {
      text-align: center;
      margin-bottom: 3mm;
      border-bottom: 1px dashed #000;
      padding-bottom: 2mm;
    }
    
    .header h1 {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 1mm;
    }
    
    .header p {
      font-size: 9px;
    }
    
    .section {
      margin: 3mm 0;
      border-bottom: 1px dashed #000;
      padding-bottom: 2mm;
    }
    
    .section-title {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 2mm;
      text-align: center;
    }
    
    .row {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
    }
    
    .row.bold {
      font-weight: bold;
    }
    
    .row.total {
      font-weight: bold;
      font-size: 11px;
      margin-top: 2mm;
      padding-top: 2mm;
      border-top: 1px solid #000;
    }
    
    .indent {
      padding-left: 3mm;
      font-size: 9px;
    }
    
    .alert {
      background: #000;
      color: #fff;
      padding: 2mm;
      text-align: center;
      font-weight: bold;
      margin: 2mm 0;
    }
    
    .signature {
      margin-top: 10mm;
      text-align: center;
    }
    
    .signature-line {
      border-top: 1px solid #000;
      width: 50mm;
      margin: 5mm auto 2mm auto;
    }
    
    .footer {
      text-align: center;
      margin-top: 5mm;
      font-size: 8px;
      color: #666;
    }
    
    @media print {
      body {
        background: #fff;
      }
    }
  </style>
</head>
<body>
  
  <!-- HEADER -->
  <div class="header">
    <h1>${schoolName.toUpperCase()}</h1>
    <p>REPORTE DE CIERRE DE CAJA</p>
    <p>Fecha: ${date} - Hora: ${time}</p>
    <p>Estado: ${closure.status === 'closed' ? 'CERRADO' : 'ABIERTO'}</p>
  </div>

  <!-- RESUMEN EJECUTIVO -->
  <div class="section">
    <div class="section-title">RESUMEN</div>
    <div class="row">
      <span>Caja Inicial:</span>
      <span>S/ ${summary.openingBalance.toFixed(2)}</span>
    </div>
    <div class="row bold">
      <span>Saldo Esperado:</span>
      <span>S/ ${summary.expectedBalance.toFixed(2)}</span>
    </div>
    <div class="row bold">
      <span>Saldo Real:</span>
      <span>S/ ${(summary.actualBalance || 0).toFixed(2)}</span>
    </div>
    ${Math.abs(summary.difference || 0) > 0.01 ? `
    <div class="row alert">
      <span>DIFERENCIA: S/ ${Math.abs(summary.difference || 0).toFixed(2)}</span>
      <span>${(summary.difference || 0) > 0 ? 'SOBRANTE' : 'FALTANTE'}</span>
    </div>
    ` : ''}
  </div>

  <!-- PUNTO DE VENTA -->
  <div class="section">
    <div class="section-title">PUNTO DE VENTA</div>
    <div class="row indent">
      <span>Efectivo:</span>
      <span>S/ ${summary.posCash.toFixed(2)}</span>
    </div>
    <div class="row indent">
      <span>Tarjeta:</span>
      <span>S/ ${summary.posCard.toFixed(2)}</span>
    </div>
    <div class="row indent">
      <span>Yape:</span>
      <span>S/ ${summary.posYape.toFixed(2)}</span>
    </div>
    <div class="row indent">
      <span>Yape QR:</span>
      <span>S/ ${summary.posYapeQR.toFixed(2)}</span>
    </div>
    <div class="row indent">
      <span>Crédito:</span>
      <span>S/ ${summary.posCredit.toFixed(2)}</span>
    </div>
    <div class="row total">
      <span>Total POS:</span>
      <span>S/ ${summary.posTotal.toFixed(2)}</span>
    </div>
  </div>

  <!-- ALMUERZOS -->
  <div class="section">
    <div class="section-title">ALMUERZOS</div>
    <div class="row indent">
      <span>Efectivo:</span>
      <span>S/ ${summary.lunchCash.toFixed(2)}</span>
    </div>
    <div class="row indent">
      <span>Crédito:</span>
      <span>S/ ${summary.lunchCredit.toFixed(2)}</span>
    </div>
    <div class="row total">
      <span>Total Almuerzos:</span>
      <span>S/ ${summary.lunchTotal.toFixed(2)}</span>
    </div>
  </div>

  <!-- MOVIMIENTOS -->
  <div class="section">
    <div class="section-title">MOVIMIENTOS</div>
    <div class="row">
      <span>Ingresos (+):</span>
      <span style="color: green;">S/ ${summary.totalIncome.toFixed(2)}</span>
    </div>
    <div class="row">
      <span>Egresos (-):</span>
      <span style="color: red;">S/ ${summary.totalExpenses.toFixed(2)}</span>
    </div>
  </div>

  <!-- DIVISIÓN DE EFECTIVO -->
  ${(closure.petty_cash || closure.safe_cash) ? `
  <div class="section">
    <div class="section-title">DIVISIÓN DE EFECTIVO</div>
    <div class="row">
      <span>Caja Chica:</span>
      <span>S/ ${(closure.petty_cash || 0).toFixed(2)}</span>
    </div>
    <div class="row">
      <span>Caja Fuerte/Extracción:</span>
      <span>S/ ${(closure.safe_cash || 0).toFixed(2)}</span>
    </div>
  </div>
  ` : ''}

  <!-- AJUSTE (si hay) -->
  ${closure.adjustment_reason ? `
  <div class="section">
    <div class="section-title">AJUSTE DE CAJA</div>
    <p style="font-size: 9px; text-align: center;">${closure.adjustment_reason}</p>
  </div>
  ` : ''}

  <!-- OBSERVACIONES -->
  ${closure.notes ? `
  <div class="section">
    <div class="section-title">OBSERVACIONES</div>
    <p style="font-size: 9px; text-align: center;">${closure.notes}</p>
  </div>
  ` : ''}

  <!-- FIRMAS -->
  <div class="signature">
    <div class="signature-line"></div>
    <p>Cerrado por: ${closedByName}</p>
    <p style="font-size: 8px; margin-top: 2mm;">Firma del Responsable</p>
    
    <div class="signature-line" style="margin-top: 8mm;"></div>
    <p>Aprobado por: Administrador</p>
    <p style="font-size: 8px; margin-top: 2mm;">Firma del Administrador</p>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p>Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
    <p>Sistema de Gestión Escolar</p>
  </div>

</body>
</html>
    `;
  };

  return { printReport };
}

// Hook para usar el reporte
export function useCashRegisterReport(
  closure: CashRegisterClosure | null,
  summary: CashRegisterSummary | null
) {
  const printReport = () => {
    if (!closure || !summary) {
      alert('No hay datos para imprimir');
      return;
    }

    const reporter = CashRegisterReport({ closure, summary });
    reporter.printReport();
  };

  return { printReport };
}
