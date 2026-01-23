# 🎯 MEJORAS COMPLETAS AL POS

## 📋 CAMBIOS A IMPLEMENTAR

### 1. ✅ CATEGORÍAS DINÁMICAS CON ICONOS

**Problema actual:**
- Categorías hardcodeadas: `bebidas`, `snacks`, `menu`
- No se adapta a las categorías de la carga masiva

**Solución:**
```typescript
// Mapeo de iconos por palabra clave
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  
  if (name.includes('bebida')) return Coffee;
  if (name.includes('snack') || name.includes('golosina')) return Cookie;
  if (name.includes('menu') || name.includes('almuerzo') || name.includes('comida')) return UtensilsCrossed;
  if (name.includes('dulce') || name.includes('postre')) return Gift;
  if (name.includes('fruta')) return '🍎'; // Emoji como fallback
  if (name.includes('sandwich')) return '🥪';
  
  // Default
  return ShoppingCart;
};

// Cargar categorías dinámicamente de los productos
useEffect(() => {
  const uniqueCategories = Array.from(
    new Set(products.map(p => p.category))
  ).sort();
  
  const dynamicCategories = [
    { id: 'todos', label: 'Todos', icon: ShoppingCart },
    ...uniqueCategories.map(cat => ({
      id: cat,
      label: cat,
      icon: getCategoryIcon(cat)
    }))
  ];
  
  setOrderedCategories(dynamicCategories);
}, [products]);
```

---

### 2. ✅ CAMPO "CON CUÁNTO PAGA" Y VUELTO

**Ubicación:** Modal de confirmación de pago

```typescript
const [cashGiven, setCashGiven] = useState('');

// En el modal de Efectivo
{selectedPaymentMethod === 'efectivo' && (
  <div className="space-y-3">
    <div className="bg-blue-50 p-4 rounded-lg">
      <p className="text-sm text-blue-900 font-semibold">
        Total a pagar: S/ {totalAmount.toFixed(2)}
      </p>
    </div>
    
    <div>
      <Label>¿Con cuánto paga el cliente?</Label>
      <Input
        type="number"
        step="0.50"
        value={cashGiven}
        onChange={(e) => setCashGiven(e.target.value)}
        placeholder="Ej: 50.00"
        className="text-lg text-center"
      />
    </div>
    
    {parseFloat(cashGiven) > 0 && (
      <div className="bg-emerald-50 p-4 rounded-lg border-2 border-emerald-500">
        <p className="text-sm text-emerald-700">Vuelto:</p>
        <p className="text-3xl font-bold text-emerald-900">
          S/ {(parseFloat(cashGiven) - totalAmount).toFixed(2)}
        </p>
      </div>
    )}
  </div>
)}
```

---

### 3. ✅ PAGO CON MÚLTIPLES MÉTODOS

**Problema:** Solo permite un método de pago

**Solución:**
```typescript
interface PaymentSplit {
  method: string;
  amount: number;
}

const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
const [currentSplit, setCurrentSplit] = useState<PaymentSplit>({
  method: '',
  amount: 0
});

// Total pagado hasta ahora
const totalPaid = paymentSplits.reduce((sum, p) => sum + p.amount, 0);
const remaining = totalAmount - totalPaid;

// Botón para agregar método de pago
<Button 
  onClick={() => {
    if (currentSplit.method && currentSplit.amount > 0) {
      setPaymentSplits([...paymentSplits, currentSplit]);
      setCurrentSplit({ method: '', amount: 0 });
    }
  }}
>
  Agregar Método de Pago
</Button>

// Mostrar splits
{paymentSplits.map((split, i) => (
  <div key={i} className="flex items-center justify-between p-2 bg-gray-100 rounded">
    <span>{split.method}</span>
    <span>S/ {split.amount.toFixed(2)}</span>
    <Button 
      size="sm" 
      variant="ghost" 
      onClick={() => setPaymentSplits(paymentSplits.filter((_, idx) => idx !== i))}
    >
      <X className="h-4 w-4" />
    </Button>
  </div>
))}

<div className="bg-blue-50 p-3 rounded-lg">
  <p className="text-sm">Total pagado: S/ {totalPaid.toFixed(2)}</p>
  <p className="text-lg font-bold">Falta: S/ {remaining.toFixed(2)}</p>
</div>
```

---

### 4. ✅ MODAL TICKET/BOLETA/FACTURA

**Después de "CONFIRMAR COBRO", mostrar:**

```typescript
const [showDocumentTypeDialog, setShowDocumentTypeDialog] = useState(false);
const [selectedDocumentType, setSelectedDocumentType] = useState('');

// Modal después de confirmar cobro
<Dialog open={showDocumentTypeDialog} onOpenChange={setShowDocumentTypeDialog}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>Selecciona Tipo de Comprobante</DialogTitle>
    </DialogHeader>
    
    <div className="grid grid-cols-3 gap-4 py-6">
      {/* TICKET */}
      <button
        onClick={() => setSelectedDocumentType('ticket')}
        className="flex flex-col items-center gap-3 p-6 border-2 rounded-lg hover:border-primary transition"
      >
        <Receipt className="h-16 w-16" />
        <span className="font-semibold">TICKET</span>
        <span className="text-xs text-muted-foreground">Sin datos fiscales</span>
      </button>
      
      {/* BOLETA - DESHABILITADO */}
      <button
        disabled
        className="flex flex-col items-center gap-3 p-6 border-2 rounded-lg opacity-50 cursor-not-allowed"
      >
        <Printer className="h-16 w-16" />
        <span className="font-semibold">BOLETA</span>
        <Badge variant="secondary">Próximamente</Badge>
        <span className="text-xs">SUNAT</span>
      </button>
      
      {/* FACTURA - DESHABILITADO */}
      <button
        disabled
        className="flex flex-col items-center gap-3 p-6 border-2 rounded-lg opacity-50 cursor-not-allowed"
      >
        <Building2 className="h-16 w-16" />
        <span className="font-semibold">FACTURA</span>
        <Badge variant="secondary">Próximamente</Badge>
        <span className="text-xs">SUNAT</span>
      </button>
    </div>
    
    <Button 
      size="lg" 
      onClick={() => {
        setShowDocumentTypeDialog(false);
        printTicket();
      }}
      disabled={!selectedDocumentType}
    >
      <Printer className="h-5 w-5 mr-2" />
      Imprimir {selectedDocumentType === 'ticket' ? 'Ticket' : 'Comprobante'}
    </Button>
  </DialogContent>
</Dialog>
```

---

### 5. ✅ IMPRIMIR COMPROBANTE

```typescript
const printTicket = () => {
  const printWindow = window.open('', '', 'width=300,height=600');
  
  const ticketHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket</title>
      <style>
        @media print {
          body { margin: 0; padding: 10px; font-family: monospace; font-size: 12px; }
          .center { text-align: center; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="center">
        <h2>LIMA CAFÉ 28</h2>
        <p>Kiosco Escolar</p>
        <p>${new Date().toLocaleString('es-PE')}</p>
      </div>
      <div class="line"></div>
      
      <p><strong>Cliente:</strong> ${selectedStudent ? selectedStudent.full_name : 'Genérico'}</p>
      <p><strong>Atendió:</strong> ${user?.email}</p>
      <p><strong>Ticket:</strong> #${ticketNumber}</p>
      
      <div class="line"></div>
      
      <table>
        <thead>
          <tr>
            <th>Cant</th>
            <th>Producto</th>
            <th>Precio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${cart.map(item => `
            <tr>
              <td>${item.quantity}</td>
              <td>${item.product.name}</td>
              <td>S/ ${item.product.price.toFixed(2)}</td>
              <td>S/ ${(item.product.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="line"></div>
      
      <p><strong>TOTAL: S/ ${totalAmount.toFixed(2)}</strong></p>
      <p>Método de pago: ${selectedPaymentMethod}</p>
      ${cashGiven ? `<p>Efectivo: S/ ${cashGiven}</p>` : ''}
      ${cashGiven ? `<p>Vuelto: S/ ${(parseFloat(cashGiven) - totalAmount).toFixed(2)}</p>` : ''}
      
      <div class="line"></div>
      <div class="center">
        <p>¡Gracias por tu compra!</p>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(ticketHTML);
  printWindow.document.close();
  printWindow.print();
};
```

---

### 6. ✅ CORRELATIVO POR ADMIN GENERAL

**Tabla en Supabase:**
```sql
CREATE TABLE IF NOT EXISTS ticket_sequences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  current_number INTEGER DEFAULT 0,
  prefix TEXT DEFAULT 'T',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Función para obtener siguiente número
CREATE OR REPLACE FUNCTION get_next_ticket_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_number INTEGER;
  v_prefix TEXT;
BEGIN
  -- Incrementar contador
  UPDATE ticket_sequences
  SET current_number = current_number + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING current_number, prefix INTO v_number, v_prefix;
  
  -- Si no existe, crear
  IF NOT FOUND THEN
    INSERT INTO ticket_sequences (user_id, current_number, prefix)
    VALUES (p_user_id, 1, 'T')
    RETURNING current_number, prefix INTO v_number, v_prefix;
  END IF;
  
  -- Retornar número formateado
  RETURN v_prefix || LPAD(v_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

**En el frontend:**
```typescript
const getNextTicketNumber = async () => {
  const { data, error } = await supabase.rpc('get_next_ticket_number', {
    p_user_id: user.id
  });
  
  if (error) throw error;
  return data; // Ej: "T000123"
};
```

---

## 🚀 IMPLEMENTACIÓN

Por la complejidad, voy a implementar estos cambios en archivos separados y luego te los paso.

**Archivos a modificar:**
1. `src/pages/POS.tsx` - Los 6 cambios
2. SQL para correlativo de tickets
3. Actualizar estilos de impresión

¿Empiezo con la implementación completa?
