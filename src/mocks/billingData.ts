export const MOCK_STUDENTS = [
  {
    id: "mock-student-1",
    nombre: "Juanito Pérez",
    school_id: "mock-school-1",
    school_name: "Nordic School",
    parent_id: "mock-parent-1",
    saldo: -150.50,
    cuenta_tipo: "Cuenta Libre"
  },
  {
    id: "mock-student-2",
    nombre: "María García",
    school_id: "mock-school-1",
    school_name: "Nordic School",
    parent_id: "mock-parent-1",
    saldo: -75.00,
    cuenta_tipo: "Recarga + Tope"
  },
  {
    id: "mock-student-3",
    nombre: "Ricardo Palma",
    school_id: "mock-school-2",
    school_name: "Jean LeBouch",
    parent_id: "mock-parent-2",
    saldo: -200.00,
    cuenta_tipo: "Híbrido"
  }
];

export const MOCK_PARENTS = [
  {
    id: "mock-parent-1",
    full_name: "Alberto Mock",
    phone: "999888777",
    email: "alberto.mock@example.com"
  },
  {
    id: "mock-parent-2",
    full_name: "Gisella Mock",
    phone: "999111222",
    email: "gisella.mock@example.com"
  }
];

export const MOCK_TRANSACTIONS = [
  {
    id: "t1",
    student_id: "mock-student-1",
    amount: 50.50,
    created_at: new Date().toISOString(),
    items: [{ name: "Menú Ejecutivo", quantity: 1, price: 50.50 }],
    school_id: "mock-school-1"
  },
  {
    id: "t2",
    student_id: "mock-student-1",
    amount: 100.00,
    created_at: new Date().toISOString(),
    items: [{ name: "Snacks", quantity: 5, price: 20.00 }],
    school_id: "mock-school-1"
  }
];

export const MOCK_BILLING_PERIODS = [
  {
    id: "period-1",
    name: "Enero 2026 - Prueba",
    start_date: "2026-01-01",
    end_date: "2026-01-31",
    status: "open",
    is_visible_to_parents: true
  }
];

