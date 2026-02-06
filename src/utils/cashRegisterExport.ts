// 📊 UTILIDADES DE EXPORTACIÓN PARA CIERRE DE CAJA
// Exportación a Excel, PDF y envío por WhatsApp

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CashRegisterClosure, CashRegisterSummary } from '@/types/cashRegister';

// ============================================
// EXPORTAR A EXCEL
// ============================================
export function exportToExcel(
  closure: CashRegisterClosure,
  summary: CashRegisterSummary,
  schoolName: string = 'MI COLEGIO'
) {
  try {
    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const resumenData = [
      ['REPORTE DE CIERRE DE CAJA'],
      ['Sede:', schoolName],
      ['Fecha:', format(new Date(closure.closure_date), "dd 'de' MMMM, yyyy", { locale: es })],
      ['Hora de Cierre:', format(new Date(closure.closure_time), 'HH:mm')],
      ['Estado:', closure.status === 'closed' ? 'CERRADO' : 'ABIERTO'],
      [],
      ['RESUMEN FINANCIERO'],
      ['Caja Inicial:', `S/ ${summary.openingBalance.toFixed(2)}`],
      ['Saldo Esperado:', `S/ ${summary.expectedBalance.toFixed(2)}`],
      ['Saldo Real:', `S/ ${(summary.actualBalance || 0).toFixed(2)}`],
      ['Diferencia:', `S/ ${(summary.difference || 0).toFixed(2)}`],
    ];

    if (Math.abs(summary.difference || 0) > 0.01) {
      resumenData.push([
        'ALERTA:',
        (summary.difference || 0) > 0 ? 'SOBRANTE' : 'FALTANTE'
      ]);
    }

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Hoja 2: Punto de Venta
    const posData = [
      ['PUNTO DE VENTA'],
      ['Método de Pago', 'Monto'],
      ['Efectivo', `S/ ${summary.posCash.toFixed(2)}`],
      ['Tarjeta', `S/ ${summary.posCard.toFixed(2)}`],
      ['Yape', `S/ ${summary.posYape.toFixed(2)}`],
      ['Yape QR', `S/ ${summary.posYapeQR.toFixed(2)}`],
      ['Crédito', `S/ ${summary.posCredit.toFixed(2)}`],
      [],
      ['TOTAL POS', `S/ ${summary.posTotal.toFixed(2)}`],
    ];

    const wsPOS = XLSX.utils.aoa_to_sheet(posData);
    XLSX.utils.book_append_sheet(wb, wsPOS, 'Punto de Venta');

    // Hoja 3: Almuerzos
    const lunchData = [
      ['ALMUERZOS'],
      ['Método de Pago', 'Monto'],
      ['Efectivo', `S/ ${summary.lunchCash.toFixed(2)}`],
      ['Crédito', `S/ ${summary.lunchCredit.toFixed(2)}`],
      [],
      ['TOTAL ALMUERZOS', `S/ ${summary.lunchTotal.toFixed(2)}`],
    ];

    const wsLunch = XLSX.utils.aoa_to_sheet(lunchData);
    XLSX.utils.book_append_sheet(wb, wsLunch, 'Almuerzos');

    // Hoja 4: Movimientos
    const movimientosData = [
      ['MOVIMIENTOS DE CAJA'],
      ['Tipo', 'Monto'],
      ['Ingresos (+)', `S/ ${summary.totalIncome.toFixed(2)}`],
      ['Egresos (-)', `S/ ${summary.totalExpenses.toFixed(2)}`],
      [],
      ['Neto', `S/ ${(summary.totalIncome - summary.totalExpenses).toFixed(2)}`],
    ];

    const wsMovimientos = XLSX.utils.aoa_to_sheet(movimientosData);
    XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos');

    // Hoja 5: División de Efectivo (si existe)
    if (closure.petty_cash || closure.safe_cash) {
      const divisionData = [
        ['DIVISIÓN DE EFECTIVO'],
        ['Concepto', 'Monto'],
        ['Caja Chica', `S/ ${(closure.petty_cash || 0).toFixed(2)}`],
        ['Caja Fuerte / Extracción', `S/ ${(closure.safe_cash || 0).toFixed(2)}`],
        [],
        ['TOTAL', `S/ ${((closure.petty_cash || 0) + (closure.safe_cash || 0)).toFixed(2)}`],
      ];

      const wsDivision = XLSX.utils.aoa_to_sheet(divisionData);
      XLSX.utils.book_append_sheet(wb, wsDivision, 'División Efectivo');
    }

    // Descargar archivo
    const fileName = `Cierre_Caja_${format(new Date(closure.closure_date), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
}

// ============================================
// EXPORTAR A PDF
// ============================================
export function exportToPDF(
  closure: CashRegisterClosure,
  summary: CashRegisterSummary,
  schoolName: string = 'MI COLEGIO'
) {
  try {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE CIERRE DE CAJA', 105, 20, { align: 'center' });

    // Información general
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sede: ${schoolName}`, 20, 35);
    doc.text(`Fecha: ${format(new Date(closure.closure_date), "dd 'de' MMMM, yyyy", { locale: es })}`, 20, 42);
    doc.text(`Hora: ${format(new Date(closure.closure_time), 'HH:mm')}`, 20, 49);
    doc.text(`Estado: ${closure.status === 'closed' ? 'CERRADO' : 'ABIERTO'}`, 20, 56);

    // Resumen Financiero
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN FINANCIERO', 20, 70);

    autoTable(doc, {
      startY: 75,
      head: [['Concepto', 'Monto']],
      body: [
        ['Caja Inicial', `S/ ${summary.openingBalance.toFixed(2)}`],
        ['Saldo Esperado', `S/ ${summary.expectedBalance.toFixed(2)}`],
        ['Saldo Real', `S/ ${(summary.actualBalance || 0).toFixed(2)}`],
        ['Diferencia', `S/ ${(summary.difference || 0).toFixed(2)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Punto de Venta
    const posY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PUNTO DE VENTA', 20, posY);

    autoTable(doc, {
      startY: posY + 5,
      head: [['Método de Pago', 'Monto']],
      body: [
        ['Efectivo', `S/ ${summary.posCash.toFixed(2)}`],
        ['Tarjeta', `S/ ${summary.posCard.toFixed(2)}`],
        ['Yape', `S/ ${summary.posYape.toFixed(2)}`],
        ['Yape QR', `S/ ${summary.posYapeQR.toFixed(2)}`],
        ['Crédito', `S/ ${summary.posCredit.toFixed(2)}`],
      ],
      foot: [['TOTAL POS', `S/ ${summary.posTotal.toFixed(2)}`]],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [52, 73, 94], fontStyle: 'bold' },
    });

    // Almuerzos
    const lunchY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ALMUERZOS', 20, lunchY);

    autoTable(doc, {
      startY: lunchY + 5,
      head: [['Método de Pago', 'Monto']],
      body: [
        ['Efectivo', `S/ ${summary.lunchCash.toFixed(2)}`],
        ['Crédito', `S/ ${summary.lunchCredit.toFixed(2)}`],
      ],
      foot: [['TOTAL ALMUERZOS', `S/ ${summary.lunchTotal.toFixed(2)}`]],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [52, 73, 94], fontStyle: 'bold' },
    });

    // Movimientos
    const movY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MOVIMIENTOS', 20, movY);

    autoTable(doc, {
      startY: movY + 5,
      head: [['Tipo', 'Monto']],
      body: [
        ['Ingresos (+)', `S/ ${summary.totalIncome.toFixed(2)}`],
        ['Egresos (-)', `S/ ${summary.totalExpenses.toFixed(2)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Si hay diferencia, agregar alerta
    if (Math.abs(summary.difference || 0) > 0.01) {
      const alertY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(255, 230, 0);
      doc.rect(15, alertY, 180, 15, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const alertText = (summary.difference || 0) > 0 ? 'SOBRANTE' : 'FALTANTE';
      doc.text(`ALERTA: ${alertText} DE S/ ${Math.abs(summary.difference || 0).toFixed(2)}`, 105, alertY + 10, { align: 'center' });
    }

    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")} - Página ${i} de ${pageCount}`,
        105,
        285,
        { align: 'center' }
      );
    }

    // Descargar
    const fileName = `Cierre_Caja_${format(new Date(closure.closure_date), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);

    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return false;
  }
}

// ============================================
// ENVIAR POR WHATSAPP
// ============================================
export async function sendViaWhatsApp(
  closure: CashRegisterClosure,
  summary: CashRegisterSummary,
  phoneNumber: string,
  schoolName: string = 'MI COLEGIO'
) {
  try {
    // Preparar el mensaje
    const date = format(new Date(closure.closure_date), "dd/MM/yyyy");
    const time = format(new Date(closure.closure_time), "HH:mm");

    const message = `
*📊 CIERRE DE CAJA*
*${schoolName}*

📅 Fecha: ${date}
🕐 Hora: ${time}
Estado: ${closure.status === 'closed' ? '🔒 CERRADO' : '🔓 ABIERTO'}

*💰 RESUMEN*
Caja Inicial: S/ ${summary.openingBalance.toFixed(2)}
Esperado: S/ ${summary.expectedBalance.toFixed(2)}
Real: S/ ${(summary.actualBalance || 0).toFixed(2)}
${Math.abs(summary.difference || 0) > 0.01 ? `⚠️ Diferencia: S/ ${Math.abs(summary.difference || 0).toFixed(2)} ${(summary.difference || 0) > 0 ? '(SOBRANTE)' : '(FALTANTE)'}` : '✅ Sin diferencias'}

*🏪 PUNTO DE VENTA*
Efectivo: S/ ${summary.posCash.toFixed(2)}
Tarjeta: S/ ${summary.posCard.toFixed(2)}
Yape: S/ ${summary.posYape.toFixed(2)}
Yape QR: S/ ${summary.posYapeQR.toFixed(2)}
Crédito: S/ ${summary.posCredit.toFixed(2)}
*Total POS: S/ ${summary.posTotal.toFixed(2)}*

*🍽️ ALMUERZOS*
Efectivo: S/ ${summary.lunchCash.toFixed(2)}
Crédito: S/ ${summary.lunchCredit.toFixed(2)}
*Total: S/ ${summary.lunchTotal.toFixed(2)}*

*📊 MOVIMIENTOS*
Ingresos (+): S/ ${summary.totalIncome.toFixed(2)}
Egresos (-): S/ ${summary.totalExpenses.toFixed(2)}

---
_Generado automáticamente_
    `.trim();

    // Codificar el mensaje para URL
    const encodedMessage = encodeURIComponent(message);

    // Limpiar número de teléfono (remover espacios, guiones, etc.)
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

    // Crear URL de WhatsApp
    const whatsappURL = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    // Abrir WhatsApp
    window.open(whatsappURL, '_blank');

    return true;
  } catch (error) {
    console.error('Error sending via WhatsApp:', error);
    return false;
  }
}

// ============================================
// HOOK COMBINADO PARA EXPORTACIÓN
// ============================================
export function useExport(
  closure: CashRegisterClosure | null,
  summary: CashRegisterSummary | null,
  config?: { schoolName?: string; whatsappNumber?: string }
) {
  const handleExportExcel = () => {
    if (!closure || !summary) {
      alert('No hay datos para exportar');
      return false;
    }
    
    const success = exportToExcel(closure, summary, config?.schoolName);
    if (success) {
      alert('Reporte exportado a Excel exitosamente');
    } else {
      alert('Error al exportar a Excel');
    }
    return success;
  };

  const handleExportPDF = () => {
    if (!closure || !summary) {
      alert('No hay datos para exportar');
      return false;
    }
    
    const success = exportToPDF(closure, summary, config?.schoolName);
    if (success) {
      alert('Reporte exportado a PDF exitosamente');
    } else {
      alert('Error al exportar a PDF');
    }
    return success;
  };

  const handleSendWhatsApp = async () => {
    if (!closure || !summary) {
      alert('No hay datos para enviar');
      return false;
    }

    if (!config?.whatsappNumber) {
      alert('No se ha configurado un número de WhatsApp');
      return false;
    }
    
    const success = await sendViaWhatsApp(
      closure,
      summary,
      config.whatsappNumber,
      config.schoolName
    );
    
    if (success) {
      alert('Abriendo WhatsApp...');
    } else {
      alert('Error al enviar por WhatsApp');
    }
    return success;
  };

  return {
    exportExcel: handleExportExcel,
    exportPDF: handleExportPDF,
    sendWhatsApp: handleSendWhatsApp,
  };
}
