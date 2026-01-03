import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface ThermalTicketProps {
  ticketCode: string;
  date: Date;
  cashierEmail: string;
  clientName: string;
  documentType: 'ticket' | 'boleta' | 'factura';
  items: TicketItem[];
  total: number;
  paymentMethod?: string;
  newBalance?: number;
  clientDNI?: string;
  clientRUC?: string;
  isReprint?: boolean;
}

export const ThermalTicket = ({
  ticketCode,
  date,
  cashierEmail,
  clientName,
  documentType,
  items,
  total,
  paymentMethod,
  newBalance,
  clientDNI,
  clientRUC,
  isReprint = false
}: ThermalTicketProps) => {
  const getDocumentTitle = () => {
    switch (documentType) {
      case 'boleta':
        return 'BOLETA DE VENTA ELECTRÓNICA';
      case 'factura':
        return 'FACTURA ELECTRÓNICA';
      default:
        return 'TICKET DE VENTA';
    }
  };

  return (
    <div className="hidden print:block">
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            width: 80mm;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
      
      <div style={{ 
        width: '80mm', 
        fontFamily: 'monospace', 
        fontSize: '11px', 
        padding: '8px',
        lineHeight: '1.3'
      }}>
        {/* HEADER - Logo y Datos de la Empresa */}
        <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '2px dashed #000', paddingBottom: '10px' }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            letterSpacing: '1px',
            marginBottom: '4px'
          }}>
            LIMA CAFÉ 28
          </div>
          <div style={{ fontSize: '9px', marginBottom: '2px' }}>
            Kiosco Escolar
          </div>
          <div style={{ fontSize: '9px', marginBottom: '2px' }}>
            RUC: 20XXXXXXXXX
          </div>
          {documentType !== 'ticket' && (
            <div style={{ 
              fontSize: '10px', 
              fontWeight: 'bold',
              marginTop: '6px',
              padding: '4px',
              border: '1px solid #000'
            }}>
              {getDocumentTitle()}
            </div>
          )}
        </div>

        {/* DATOS DEL COMPROBANTE */}
        <div style={{ fontSize: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>N°:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{ticketCode}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>FECHA:</span>
            <span>{format(date, "dd/MM/yyyy HH:mm", { locale: es })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>CAJERO:</span>
            <span style={{ fontSize: '9px' }}>{cashierEmail.split('@')[0]}</span>
          </div>
        </div>

        {/* DATOS DEL CLIENTE */}
        <div style={{ 
          fontSize: '10px', 
          marginBottom: '10px',
          paddingTop: '6px',
          borderTop: '1px solid #000'
        }}>
          <div style={{ marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>CLIENTE: </span>
            <span>{clientName}</span>
          </div>
          {documentType === 'boleta' && clientDNI && (
            <div style={{ marginBottom: '2px' }}>
              <span style={{ fontWeight: 'bold' }}>DNI: </span>
              <span>{clientDNI}</span>
            </div>
          )}
          {documentType === 'factura' && clientRUC && (
            <div style={{ marginBottom: '2px' }}>
              <span style={{ fontWeight: 'bold' }}>RUC: </span>
              <span>{clientRUC}</span>
            </div>
          )}
        </div>

        {/* SEPARADOR */}
        <div style={{ 
          borderTop: '2px dashed #000', 
          margin: '8px 0' 
        }}></div>

        {/* ITEMS */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '9px',
            fontWeight: 'bold',
            marginBottom: '4px',
            paddingBottom: '2px',
            borderBottom: '1px solid #000'
          }}>
            <span>DESCRIPCIÓN</span>
            <span>IMPORTE</span>
          </div>
          
          {items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '6px' }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: 'bold',
                marginBottom: '1px'
              }}>
                {item.product_name}
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '9px'
              }}>
                <span>{item.quantity} x S/ {item.unit_price.toFixed(2)}</span>
                <span style={{ fontWeight: 'bold' }}>S/ {item.subtotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* SEPARADOR */}
        <div style={{ 
          borderTop: '2px dashed #000', 
          margin: '8px 0' 
        }}></div>

        {/* TOTAL */}
        <div style={{ 
          textAlign: 'right',
          marginBottom: '10px'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            TOTAL: S/ {total.toFixed(2)}
          </div>
          {paymentMethod && (
            <div style={{ fontSize: '9px' }}>
              Forma de pago: {paymentMethod.toUpperCase()}
            </div>
          )}
          {newBalance !== undefined && (
            <div style={{ 
              fontSize: '9px',
              marginTop: '4px',
              padding: '3px',
              backgroundColor: '#f0f0f0',
              borderRadius: '2px'
            }}>
              Saldo restante: S/ {newBalance.toFixed(2)}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ 
          borderTop: '1px solid #000',
          paddingTop: '8px',
          textAlign: 'center',
          fontSize: '9px'
        }}>
          {isReprint && (
            <div style={{ 
              marginBottom: '6px',
              fontWeight: 'bold',
              fontSize: '8px'
            }}>
              *** REIMPRESIÓN ***
            </div>
          )}
          <div style={{ marginBottom: '3px' }}>
            ¡Gracias por su compra!
          </div>
          <div style={{ fontSize: '8px', color: '#666' }}>
            Sistema ERP - ARQUISIA
          </div>
          {documentType !== 'ticket' && (
            <div style={{ 
              marginTop: '8px',
              fontSize: '8px',
              padding: '4px',
              border: '1px solid #000'
            }}>
              Representación impresa de comprobante electrónico
              <br />
              Consulte su comprobante en: www.limacafe28.com/comprobantes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

