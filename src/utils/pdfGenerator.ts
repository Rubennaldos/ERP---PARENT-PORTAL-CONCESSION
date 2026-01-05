import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { APP_CONFIG } from '@/config/app.config';

interface Transaction {
  id: string;
  created_at: string;
  ticket_code: string;
  description: string;
  amount: number;
}

interface PDFData {
  student_name: string;
  parent_name: string;
  parent_dni?: string;
  parent_phone?: string;
  school_name: string;
  period_name: string;
  start_date: string;
  end_date: string;
  transactions: Transaction[];
  total_amount: number;
  paid_amount?: number;
  pending_amount?: number;
  logo_base64?: string;
}

export const generateBillingPDF = (data: PDFData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colores
  const primaryColor: [number, number, number] = [220, 38, 38]; // red-600
  const darkColor: [number, number, number] = [31, 41, 55]; // gray-800
  const secondaryColor: [number, number, number] = [107, 114, 128]; // gray-500
  const tableHeaderColor: [number, number, number] = [243, 244, 246]; // gray-100

  // Header decorativo lateral
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 5, 40, 'F');

  // Logo (si existe)
  if (data.logo_base64) {
    try {
      doc.addImage(data.logo_base64, 'PNG', 14, 10, 35, 35, undefined, 'FAST');
    } catch (e) {
      console.error('Error adding logo to PDF:', e);
    }
  }

  // Título y Tipo de Documento
  doc.setTextColor(...darkColor);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('LIMA CAFÉ 28', pageWidth - 14, 20, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('ESTADO DE CUENTA', pageWidth - 14, 30, { align: 'right' });

  // Información del período
  let yPos = 55;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL PERÍODO', 14, yPos);
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Período:`, 14, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.period_name, 40, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Rango:`, 14, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${format(new Date(data.start_date), 'dd/MM/yyyy', { locale: es })} al ${format(new Date(data.end_date), 'dd/MM/yyyy', { locale: es })}`,
    40,
    yPos
  );

  // Información del cliente
  yPos = 55;
  const rightColX = 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DATOS DEL CLIENTE', rightColX, yPos);
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Estudiante:', rightColX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.student_name, rightColX + 25, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Padre/Tutor:', rightColX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.parent_name, rightColX + 25, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Sede:', rightColX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.school_name, rightColX + 25, yPos);

  // Línea separadora
  yPos += 10;
  doc.setDrawColor(229, 231, 235); // gray-200
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);

  // Título de la tabla
  yPos += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('DETALLE DE CONSUMOS', 14, yPos);

  // Tabla de transacciones
  yPos += 5;
  
  const tableData = data.transactions.map((transaction, index) => [
    (index + 1).toString(),
    format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: es }),
    transaction.ticket_code || '-',
    transaction.description || 'Consumo',
    `S/ ${transaction.amount.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Fecha', 'Ticket', 'Descripción', 'Monto']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: tableHeaderColor,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 80 },
      4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Obtener la posición final de la tabla
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;

  // Resumen de totales
  const summaryY = finalY + 15;
  const summaryX = pageWidth - 80;

  // Fondo del resumen
  doc.setFillColor(254, 242, 242); // red-50
  doc.roundedRect(summaryX - 5, summaryY - 5, 70, data.paid_amount !== undefined ? 35 : 25, 3, 3, 'F');

  // Total
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL:', summaryX, summaryY);
  doc.setTextColor(...primaryColor);
  doc.text(`S/ ${data.total_amount.toFixed(2)}`, pageWidth - 20, summaryY, { align: 'right' });

  // Si hay pago parcial
  if (data.paid_amount !== undefined && data.paid_amount > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('Pagado:', summaryX, summaryY + 7);
    doc.setTextColor(34, 197, 94); // green-500
    doc.text(`S/ ${data.paid_amount.toFixed(2)}`, pageWidth - 20, summaryY + 7, { align: 'right' });
  }

  // Saldo pendiente
  if (data.pending_amount !== undefined && data.pending_amount > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('SALDO PENDIENTE:', summaryX, summaryY + 15);
    doc.text(`S/ ${data.pending_amount.toFixed(2)}`, pageWidth - 20, summaryY + 15, { align: 'right' });
  }

  // Nota al pie
  const noteY = Math.max(summaryY + 35, pageHeight - 45);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...secondaryColor);
  doc.text(
    'Este documento es un estado de cuenta informativo de consumos realizados.',
    pageWidth / 2,
    noteY,
    { align: 'center' }
  );
  doc.text(
    'Para cualquier duda o aclaración, por favor contacte con administración.',
    pageWidth / 2,
    noteY + 5,
    { align: 'center' }
  );

  // Footer
  const footerY = pageHeight - 20;
  
  // Línea separadora del footer
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);

  // Texto del footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175); // gray-400
  
  const footerLine1 = `© 2026 ERP Profesional diseñado por ARQUISIA Soluciones para Lima Café 28 — Versión ${APP_CONFIG.version} ${APP_CONFIG.status}`;
  const footerLine2 = `Generado automáticamente el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`;
  
  doc.text(footerLine1, pageWidth / 2, footerY + 2, { align: 'center' });
  doc.text(footerLine2, pageWidth / 2, footerY + 7, { align: 'center' });

  // Guardar el PDF
  const fileName = `Estado_Cuenta_${data.student_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);

  return doc;
};

// Función para generar múltiples PDFs (masivo)
export const generateMultipleBillingPDFs = async (dataArray: PDFData[]) => {
  const pdfs: { name: string; data: jsPDF }[] = [];

  for (const data of dataArray) {
    const pdf = generateBillingPDF(data);
    pdfs.push({
      name: `${data.student_name.replace(/\s+/g, '_')}.pdf`,
      data: pdf,
    });
  }

  return pdfs;
};

// Función para obtener el blob del PDF (útil para enviar por WhatsApp)
export const getBillingPDFBlob = (data: PDFData): Blob => {
  const doc = new jsPDF();
  // ... mismo código de arriba pero sin el save()
  // Retornar el blob
  return doc.output('blob');
};

