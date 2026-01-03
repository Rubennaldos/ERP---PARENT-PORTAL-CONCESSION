import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  UserPlus, 
  Users, 
  School, 
  Mail, 
  Phone, 
  CreditCard, 
  MapPin, 
  Trash2, 
  Eye, 
  EyeOff,
  Edit,
  FileText,
  Download,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface School {
  id: string;
  name: string;
  code: string;
  address: string;
  is_active: boolean;
}

interface ParentProfile {
  id: string;
  email: string;
  full_name: string;
  nickname?: string; // 🆕 Sobrenombre personalizado
  dni: string;
  phone_1: string;
  address: string;
  school_id: string;
  school?: School;
  children_count?: number;
  is_active?: boolean;
  created_at?: string;
  total_recharges?: number;
  last_recharge_date?: string;
  children?: Array<{ // 🆕 Lista de hijos
    id: string;
    full_name: string;
    grade: string;
    section: string;
    balance: number;
    is_active: boolean;
  }>;
}

interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  description: string;
  type: string;
  student?: {
    full_name: string;
    grade: string;
  };
}

export default function ParentsManagement() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showChildrenModal, setShowChildrenModal] = useState(false); // 🆕 Modal de hijos
  const [selectedParent, setSelectedParent] = useState<ParentProfile | null>(null);
  const [parentTransactions, setParentTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Formulario de creación
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [dni, setDNI] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Formulario de edición
  const [editFullName, setEditFullName] = useState('');
  const [editNickname, setEditNickname] = useState(''); // 🆕 Sobrenombre
  const [editDNI, setEditDNI] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar sedes
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Cargar padres con información de hijos (LEFT JOIN para incluir padres sin sede)
      const { data: parentsData } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          school_id,
          created_at,
          school:schools (
            id,
            name,
            code,
            address,
            is_active
          )
        `)
        .eq('role', 'parent')
        .order('email');
      
      console.log('📊 Padres encontrados:', parentsData?.length || 0);

      // Cargar datos de parent_profiles (incluye nickname)
      const { data: parentProfilesData } = await supabase
        .from('parent_profiles')
        .select('*');

      // Cargar estudiantes completos (no solo contar)
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, parent_id, full_name, grade, section, balance, is_active');

      const childrenCount = studentsData?.reduce((acc, s) => {
        acc[s.parent_id] = (acc[s.parent_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Cargar transacciones de recargas por padre
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('created_at, amount, student_id')
        .eq('type', 'recharge');

      // Agrupar recargas por padre (a través de student_id)
      const rechargesByParent: Record<string, { total: number; lastDate: string }> = {};
      
      if (transactionsData && studentsData) {
        transactionsData.forEach(t => {
          const student = studentsData.find(s => s.parent_id);
          if (student) {
            const parentId = student.parent_id;
            if (!rechargesByParent[parentId]) {
              rechargesByParent[parentId] = { total: 0, lastDate: t.created_at };
            }
            rechargesByParent[parentId].total += t.amount;
            if (new Date(t.created_at) > new Date(rechargesByParent[parentId].lastDate)) {
              rechargesByParent[parentId].lastDate = t.created_at;
            }
          }
        });
      }

      // Combinar datos
      const combinedParents = parentsData?.map(p => {
        const parentProfile = parentProfilesData?.find(pp => pp.user_id === p.id);
        const rechargeInfo = rechargesByParent[p.id] || { total: 0, lastDate: null };
        const parentChildren = studentsData?.filter(s => s.parent_id === p.id) || []; // 🆕 Hijos del padre
        
        return {
          ...p,
          school: Array.isArray(p.school) ? p.school[0] : p.school,
          full_name: p.full_name || parentProfile?.full_name || 'Sin nombre',
          nickname: parentProfile?.nickname || '', // 🆕 Sobrenombre
          dni: parentProfile?.dni || '',
          phone_1: parentProfile?.phone_1 || '',
          address: parentProfile?.address || '',
          school_id: p.school_id || parentProfile?.school_id || '',
          children_count: parentChildren.length, // 🆕 Usar length de hijos reales
          children: parentChildren, // 🆕 Lista completa de hijos
          is_active: parentProfile?.is_active !== false,
          total_recharges: rechargeInfo.total,
          last_recharge_date: rechargeInfo.lastDate,
        };
      });

      console.log('✅ Padres procesados:', combinedParents?.length || 0);

      setSchools(schoolsData || []);
      setParents(combinedParents as ParentProfile[] || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchParentTransactions = async (parentId: string) => {
    setLoadingTransactions(true);
    try {
      // Obtener estudiantes del padre
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, grade')
        .eq('parent_id', parentId);

      if (!students || students.length === 0) {
        setParentTransactions([]);
        return;
      }

      const studentIds = students.map(s => s.id);

      // Obtener transacciones de los estudiantes
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .in('student_id', studentIds)
        .eq('type', 'recharge')
        .order('created_at', { ascending: false });

      const enrichedTransactions = transactions?.map(t => {
        const student = students.find(s => s.id === t.student_id);
        return {
          ...t,
          student: student ? {
            full_name: student.full_name,
            grade: student.grade
          } : undefined
        };
      });

      setParentTransactions(enrichedTransactions || []);
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las transacciones',
        variant: 'destructive',
      });
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleCreateParent = async () => {
    if (!email || !password || !fullName || !selectedSchool) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'parent',
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      const userId = authData.user.id;
      await new Promise(resolve => setTimeout(resolve, 1500));

      await supabase
        .from('profiles')
        .update({
          role: 'parent',
          full_name: fullName,
          school_id: selectedSchool,
        })
        .eq('id', userId);

      await supabase
        .from('parent_profiles')
        .upsert({
          user_id: userId,
          full_name: fullName,
          dni: dni || null,
          phone_1: phone || null,
          address: address || null,
          school_id: selectedSchool,
          is_active: true,
        });

      toast({
        title: '✅ Padre creado exitosamente',
        description: `El padre ${fullName} fue registrado en el sistema`,
      });

      setEmail('');
      setPassword('');
      setFullName('');
      setDNI('');
      setPhone('');
      setAddress('');
      setSelectedSchool('');
      setShowCreateModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error al crear padre:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el padre',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (parent: ParentProfile) => {
    setSelectedParent(parent);
    setEditFullName(parent.full_name);
    setEditNickname(parent.nickname || ''); // 🆕 Cargar sobrenombre
    setEditDNI(parent.dni);
    setEditPhone(parent.phone_1);
    setEditAddress(parent.address);
    setEditSchool(parent.school_id);
    setEditIsActive(parent.is_active !== false);
    setShowEditModal(true);
  };

  const handleUpdateParent = async () => {
    if (!selectedParent) return;

    try {
      await supabase
        .from('profiles')
        .update({
          full_name: editFullName,
          school_id: editSchool,
        })
        .eq('id', selectedParent.id);

      await supabase
        .from('parent_profiles')
        .update({
          full_name: editFullName,
          nickname: editNickname || null, // 🆕 Guardar sobrenombre
          dni: editDNI || null,
          phone_1: editPhone || null,
          address: editAddress || null,
          school_id: editSchool,
          is_active: editIsActive,
        })
        .eq('user_id', selectedParent.id);

      toast({
        title: '✅ Padre actualizado',
        description: 'Los datos del padre fueron actualizados correctamente',
      });

      setShowEditModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error al actualizar padre:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el padre',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteParent = async (parentId: string, parentName: string) => {
    if (!confirm(`¿Estás seguro de eliminar al padre ${parentName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('parent_id', parentId);

      if (students && students.length > 0) {
        toast({
          title: 'No se puede eliminar',
          description: `Este padre tiene ${students.length} hijo(s) registrado(s). Elimina primero a los estudiantes.`,
          variant: 'destructive',
        });
        return;
      }

      await supabase
        .from('parent_profiles')
        .delete()
        .eq('user_id', parentId);

      await supabase
        .from('profiles')
        .delete()
        .eq('id', parentId);

      toast({
        title: '✅ Padre eliminado',
        description: 'El padre fue eliminado del sistema',
      });

      fetchData();
    } catch (error: any) {
      console.error('Error al eliminar padre:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el padre',
        variant: 'destructive',
      });
    }
  };

  const handleViewPayments = (parent: ParentProfile) => {
    setSelectedParent(parent);
    fetchParentTransactions(parent.id);
    setShowPaymentsModal(true);
  };

  // 🆕 Ver hijos del padre
  const handleViewChildren = (parent: ParentProfile) => {
    setSelectedParent(parent);
    setShowChildrenModal(true);
  };

  // Filtrado de padres
  const filteredParents = parents.filter(p => {
    const matchesSearch = 
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.dni && p.dni.includes(searchTerm));
    
    const matchesSchool = filterSchool === 'all' || p.school_id === filterSchool;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && p.is_active) ||
      (filterStatus === 'inactive' && !p.is_active);

    return matchesSearch && matchesSchool && matchesStatus;
  });

  // Exportar a Excel
  const handleExportExcel = () => {
    const dataToExport = filteredParents.map(p => ({
      'Nombre Completo': p.full_name,
      'Email': p.email,
      'DNI': p.dni || '-',
      'Teléfono': p.phone_1 || '-',
      'Dirección': p.address || '-',
      'Sede': p.school?.name || '-',
      'Hijos': p.children_count || 0,
      'Total Recargas': `S/ ${(p.total_recharges || 0).toFixed(2)}`,
      'Última Recarga': p.last_recharge_date 
        ? format(new Date(p.last_recharge_date), 'dd/MM/yyyy', { locale: es })
        : '-',
      'Estado': p.is_active ? 'Activo' : 'Inactivo',
      'Fecha Registro': p.created_at 
        ? format(new Date(p.created_at), 'dd/MM/yyyy', { locale: es })
        : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Padres');
    
    // Ajustar anchos de columna
    ws['!cols'] = [
      { width: 25 }, // Nombre
      { width: 30 }, // Email
      { width: 12 }, // DNI
      { width: 15 }, // Teléfono
      { width: 30 }, // Dirección
      { width: 25 }, // Sede
      { width: 8 },  // Hijos
      { width: 15 }, // Total Recargas
      { width: 15 }, // Última Recarga
      { width: 10 }, // Estado
      { width: 15 }, // Fecha Registro
    ];

    XLSX.writeFile(wb, `Padres_LimaCafe28_${format(new Date(), 'ddMMyyyy')}.xlsx`);

    toast({
      title: '✅ Excel exportado',
      description: 'El archivo se ha descargado correctamente',
    });
  };

  // Exportar a PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');

    // Logo ARQUISIA (pequeño, esquina superior izquierda)
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Desarrollado por', 10, 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204);
    doc.text('ARQUISIA', 10, 15);
    doc.setFont('helvetica', 'normal');

    // Logo Lima Café 28 (centrado, arriba)
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('LIMA CAFÉ 28', 148, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text('Gestión de Padres de Familia', 148, 22, { align: 'center' });

    // Fecha del reporte
    doc.setFontSize(9);
    doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 240, 15);

    // Estadísticas
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total Padres: ${filteredParents.length}`, 10, 32);
    doc.text(`Activos: ${filteredParents.filter(p => p.is_active).length}`, 60, 32);
    doc.text(`Inactivos: ${filteredParents.filter(p => !p.is_active).length}`, 100, 32);

    // Tabla
    const tableData = filteredParents.map(p => [
      p.full_name,
      p.email,
      p.dni || '-',
      p.school?.name || '-',
      p.children_count || 0,
      `S/ ${(p.total_recharges || 0).toFixed(2)}`,
      p.is_active ? 'Activo' : 'Inactivo',
    ]);

    autoTable(doc, {
      head: [['Nombre', 'Email', 'DNI', 'Sede', 'Hijos', 'Recargas', 'Estado']],
      body: tableData,
      startY: 38,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 55 },
        2: { cellWidth: 25 },
        3: { cellWidth: 45 },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 20, halign: 'center' },
      },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        148,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
      doc.text(
        '© 2026 Lima Café 28 - Sistema ERP por ARQUISIA',
        148,
        doc.internal.pageSize.height - 5,
        { align: 'center' }
      );
    }

    doc.save(`Padres_LimaCafe28_${format(new Date(), 'ddMMyyyy')}.pdf`);

    toast({
      title: '✅ PDF exportado',
      description: 'El archivo se ha descargado correctamente',
    });
  };

  // Calcular estadísticas
  const stats = {
    total: filteredParents.length,
    active: filteredParents.filter(p => p.is_active).length,
    inactive: filteredParents.filter(p => !p.is_active).length,
    totalChildren: filteredParents.reduce((sum, p) => sum + (p.children_count || 0), 0),
    totalRecharges: filteredParents.reduce((sum, p) => sum + (p.total_recharges || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gestión de Padres</h1>
            <p className="text-muted-foreground">
              Administra perfiles, historial de pagos y exportaciones
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Crear Padre
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Padres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Inactivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats.inactive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Estudiantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalChildren}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Total Recargas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              S/ {stats.totalRecharges.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Nombre, email o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Sede</Label>
              <Select value={filterSchool} onValueChange={setFilterSchool}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sedes</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Padres */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Padres ({filteredParents.length})</CardTitle>
          <CardDescription>
            Padres registrados con su información completa y historial
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : filteredParents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay padres que coincidan con los filtros</p>
          ) : (
            <div className="space-y-3">
              {filteredParents.map(parent => {
                const needsCompletion = !parent.school_id || !parent.dni || !parent.phone_1;
                return (
                <Card key={parent.id} className={`border-l-4 ${parent.is_active ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardContent className="pt-4">
                    {needsCompletion && (
                      <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <p className="text-xs text-yellow-700">
                          Este padre necesita completar su información (sede, DNI o teléfono)
                        </p>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Información Personal */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">{parent.full_name}</p>
                            {parent.is_active ? (
                              <Badge variant="default" className="bg-green-600">Activo</Badge>
                            ) : (
                              <Badge variant="destructive">Inactivo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {parent.email}
                          </p>
                          {parent.dni && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              DNI: {parent.dni}
                            </p>
                          )}
                          {parent.phone_1 && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {parent.phone_1}
                            </p>
                          )}
                        </div>

                        {/* Sede */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">SEDE</p>
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4 text-primary" />
                            <div>
                              {parent.school ? (
                                <>
                                  <p className="font-medium">{parent.school.name}</p>
                                  <Badge variant="outline">{parent.school.code}</Badge>
                                </>
                              ) : (
                                <>
                                  <p className="font-medium text-muted-foreground">Sin sede asignada</p>
                                  <Badge variant="destructive" className="text-xs">Sin asignar</Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Estudiantes */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">HIJOS</p>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            <div>
                              <p className="font-bold text-2xl text-purple-600">
                                {parent.children_count || 0}
                              </p>
                              <p className="text-xs text-muted-foreground">Estudiantes</p>
                            </div>
                          </div>
                        </div>

                        {/* Recargas */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">RECARGAS</p>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="font-bold text-xl text-blue-600">
                                S/ {(parent.total_recharges || 0).toFixed(2)}
                              </p>
                              {parent.last_recharge_date && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(parent.last_recharge_date), 'dd/MM/yy', { locale: es })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPayments(parent)}
                          title="Ver historial de pagos"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(parent)}
                          title="Editar padre"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteParent(parent.id, parent.full_name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar padre"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Crear Padre */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Crear Nuevo Padre
            </DialogTitle>
            <DialogDescription>
              Completa todos los datos del padre. La sede es obligatoria.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="school" className="flex items-center gap-2">
                <School className="h-4 w-4" />
                Sede <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sede" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{school.code}</Badge>
                        {school.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="padre@email.com"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="password">Contraseña <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="col-span-2">
              <Label htmlFor="fullName">Nombre Completo <span className="text-red-500">*</span></Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez García"
              />
            </div>

            <div>
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                value={dni}
                onChange={(e) => setDNI(e.target.value)}
                placeholder="12345678"
                maxLength={8}
              />
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="987654321"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. Principal 123, Lima"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateParent} disabled={isCreating}>
              {isCreating ? 'Creando...' : 'Crear Padre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Padre */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Editar Padre: {selectedParent?.full_name}
            </DialogTitle>
            <DialogDescription>
              Modifica los datos del padre. El email no se puede cambiar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Email (No editable)</Label>
              <Input value={selectedParent?.email || ''} disabled />
            </div>

            <div className="col-span-2">
              <Label htmlFor="editFullName">Nombre Completo</Label>
              <Input
                id="editFullName"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="editDNI">DNI</Label>
              <Input
                id="editDNI"
                value={editDNI}
                onChange={(e) => setEditDNI(e.target.value)}
                maxLength={8}
              />
            </div>

            <div>
              <Label htmlFor="editPhone">Teléfono</Label>
              <Input
                id="editPhone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="editAddress">Dirección</Label>
              <Input
                id="editAddress"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="editSchool">Sede</Label>
              <Select value={editSchool} onValueChange={setEditSchool}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="editIsActive">Estado</Label>
              <Select 
                value={editIsActive ? 'active' : 'inactive'} 
                onValueChange={(v) => setEditIsActive(v === 'active')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateParent}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Historial de Pagos */}
      <Dialog open={showPaymentsModal} onOpenChange={setShowPaymentsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Historial de Pagos: {selectedParent?.full_name}
            </DialogTitle>
            <DialogDescription>
              Todas las recargas realizadas por este padre
            </DialogDescription>
          </DialogHeader>

          {loadingTransactions ? (
            <p className="text-center py-8 text-muted-foreground">Cargando transacciones...</p>
          ) : parentTransactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay recargas registradas</p>
          ) : (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Recargas</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {parentTransactions.length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Monto Total</p>
                    <p className="text-2xl font-bold text-green-600">
                      S/ {parentTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Última Recarga</p>
                    <p className="text-lg font-bold">
                      {parentTransactions[0] 
                        ? format(new Date(parentTransactions[0].created_at), 'dd/MM/yyyy', { locale: es })
                        : '-'
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de Transacciones */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parentTransactions.map(transaction => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(transaction.created_at), 'HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.student?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {transaction.student?.grade || '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        S/ {transaction.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentsModal(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
