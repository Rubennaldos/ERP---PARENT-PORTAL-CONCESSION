import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  GraduationCap, 
  LogOut, 
  Plus,
  History,
  X,
  Settings,
  Receipt,
  Users as UsersIcon,
  AlertCircle,
  Menu as MenuIcon,
  Home,
  Wallet,
  UtensilsCrossed
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddStudentModal } from '@/components/AddStudentModal';
import { UploadPhotoModal } from '@/components/UploadPhotoModal';
import { StudentCard } from '@/components/parent/StudentCard';
import { RechargeModal } from '@/components/parent/RechargeModal';
import { PayDebtModal } from '@/components/parent/PayDebtModal';
import { WeeklyMenuModal } from '@/components/parent/WeeklyMenuModal';
import { VersionBadge } from '@/components/VersionBadge';
import { FreeAccountWarningModal } from '@/components/parent/FreeAccountWarningModal';
import { PaymentsTab } from '@/components/parent/PaymentsTab';
import { StudentLinksManager } from '@/components/parent/StudentLinksManager';
import { MoreMenu } from '@/components/parent/MoreMenu';
import { PhotoConsentModal } from '@/components/parent/PhotoConsentModal';
import { PurchaseHistoryModal } from '@/components/parent/PurchaseHistoryModal';
import { LunchCalendarView } from '@/components/parent/LunchCalendarView';
import { useOnboardingCheck } from '@/hooks/useOnboardingCheck';

interface Student {
  id: string;
  full_name: string;
  photo_url: string | null;
  balance: number;
  daily_limit: number;
  grade: string;
  section: string;
  is_active: boolean;
  school_id?: string;
  free_account?: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  balance_after: number;
  payment_method?: string;
  payment_status?: 'paid' | 'pending' | 'partial';
}

const Index = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { isChecking } = useOnboardingCheck();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [activeTab, setActiveTab] = useState('alumnos');
  
  // Modales
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showPayDebtModal, setShowPayDebtModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showUploadPhoto, setShowUploadPhoto] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showFreeAccountWarning, setShowFreeAccountWarning] = useState(false);
  const [showLinksManager, setShowLinksManager] = useState(false);
  const [showPhotoConsent, setShowPhotoConsent] = useState(false);
  const [photoConsentAccepted, setPhotoConsentAccepted] = useState(false);
  const [photoConsentRefresh, setPhotoConsentRefresh] = useState(0); // Para forzar refresh en MoreMenu
  const [showLunchFastConfirm, setShowLunchFastConfirm] = useState(false);
  const [todayMenu, setTodayMenu] = useState<any>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  
  // Estudiante seleccionado
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Para límite diario
  const [newLimit, setNewLimit] = useState('');
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [user]);

  const fetchStudents = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('parent_id', user.id)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      
      setStudents(data || []);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los estudiantes',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async (amount: number, method: string) => {
    if (!selectedStudent) return;
    
    try {
      const newBalance = selectedStudent.balance + amount;

      const { error: transError } = await supabase
        .from('transactions')
        .insert({
          student_id: selectedStudent.id,
          type: 'recharge',
          amount: amount,
          description: `Recarga vía ${method === 'yape' ? 'Yape' : method === 'plin' ? 'Plin' : method === 'card' ? 'Tarjeta' : 'Banco'}`,
          balance_after: newBalance,
          created_by: user?.id,
          payment_method: method,
        });

      if (transError) throw transError;

      const { error: updateError } = await supabase
        .from('students')
        .update({ balance: newBalance })
        .eq('id', selectedStudent.id);

      if (updateError) throw updateError;

      toast({
        title: '✅ ¡Recarga Exitosa!',
        description: `Nuevo saldo: S/ ${newBalance.toFixed(2)}`,
      });

      await fetchStudents();
      
    } catch (error: any) {
      console.error('Error en recarga:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo completar la recarga',
      });
      throw error;
    }
  };

  const handleUpdateLimit = async () => {
    if (!selectedStudent) return;
    
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit < 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ingresa un límite válido',
      });
      return;
    }

    setIsUpdatingLimit(true);

    try {
      const { error } = await supabase
        .from('students')
        .update({ daily_limit: limit })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      toast({
        title: '✅ Límite Actualizado',
        description: `Nuevo límite diario: S/ ${limit.toFixed(2)}`,
      });

      await fetchStudents();
      setShowLimitModal(false);
    } catch (error: any) {
      console.error('Error updating limit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el límite',
      });
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  const openRechargeModal = (student: Student) => {
    setSelectedStudent(student);
    
    // LOGICA SIMPLIFICADA: Si el balance es negativo (debe) → Pasarela, si no → Recarga
    const hasDebts = student.balance < 0;
    
    console.log('--- DIAGNOSTICO DE PAGO ---');
    console.log('Estudiante:', student.full_name);
    console.log('Deudas detectadas:', hasDebts);
    console.log('Saldo:', student.balance);
    
    if (hasDebts) {
      console.log('MODO: PASARELA DE PAGOS');
      setShowPayDebtModal(true);
      setShowRechargeModal(false);
    } else {
      console.log('MODO: RECARGA DE SALDO');
      setShowRechargeModal(true);
      setShowPayDebtModal(false);
    }
  };

  const openMenuModal = (student: Student) => {
    setSelectedStudent(student);
    setShowMenuModal(true);
  };

  const openHistoryModal = (student: Student) => {
    setSelectedStudent(student);
    setShowHistoryModal(true);
  };

  const openPhotoModal = (student: Student) => {
    setSelectedStudent(student);
    
    // Verificar si ya aceptó el consentimiento
    if (!photoConsentAccepted) {
      setShowPhotoConsent(true);
    } else {
      setShowUploadPhoto(true);
    }
  };

  const handlePhotoConsentAccept = () => {
    setPhotoConsentAccepted(true);
    setShowPhotoConsent(false);
    setShowUploadPhoto(true);
    setPhotoConsentRefresh(prev => prev + 1); // Forzar refresh del estado en MoreMenu
  };

  const openSettingsModal = (student: Student) => {
    setSelectedStudent(student);
    setNewLimit(student.daily_limit.toString());
    setShowLimitModal(true);
  };

  const handleLunchFast = async (student: Student) => {
    setSelectedStudent(student);
    try {
      const { data, error } = await supabase.rpc('get_today_lunch_menu', {
        p_school_id: student.school_id
      });

      if (error) throw error;

      const menu = data?.[0];
      if (!menu || menu.is_special_day || !menu.main_course) {
        toast({
          title: "Lunch Fast no disponible",
          description: menu?.special_day_title || "No hay menú programado para el día de hoy.",
          variant: "destructive"
        });
        return;
      }

      setTodayMenu(menu);
      setShowLunchFastConfirm(true);
    } catch (error) {
      console.error('Error in handleLunchFast:', error);
      toast({
        title: "Error",
        description: "No se pudo consultar el menú de hoy",
        variant: "destructive"
      });
    }
  };

  const handleConfirmLunchOrder = async () => {
    if (!selectedStudent || !todayMenu) return;
    
    setIsOrdering(true);
    try {
      // Registrar la orden de almuerzo como una compra inmediata
      const amount = todayMenu.price || 15.00;
      const { error } = await supabase.from('transactions').insert({
        student_id: selectedStudent.id,
        type: 'purchase',
        amount: amount,
        description: `LUNCH FAST: ${todayMenu.main_course}`,
        payment_status: selectedStudent.free_account !== false ? 'pending' : 'paid',
        created_by: user?.id,
        metadata: { lunch_menu_id: todayMenu.id, source: 'lunch_fast' }
      });

      if (error) throw error;

      // Actualizar balance del estudiante
      const { error: balanceError } = await supabase
        .from('students')
        .update({ balance: selectedStudent.balance - amount })
        .eq('id', selectedStudent.id);

      if (balanceError) throw balanceError;

      toast({
        title: "¡Pedido Confirmado! 🚀",
        description: `Se ha separado el almuerzo para ${selectedStudent.full_name}`,
      });

      await fetchStudents();
      setShowLunchFastConfirm(false);
    } catch (error) {
      console.error('Error confirming lunch order:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pedido",
        variant: "destructive"
      });
    } finally {
      setIsOrdering(false);
    }
  };

  const handleToggleFreeAccount = async (student: Student, newValue: boolean) => {
    // VALIDACIÓN: Si intenta pasar a Prepago (newValue = false) y TIENE DEUDA (balance < 0)
    if (newValue === false && student.balance < 0) {
      toast({
        variant: "destructive",
        title: "🚫 Acción Bloqueada",
        description: `Para pasar al modo Prepago, primero debes cancelar la deuda actual de S/ ${Math.abs(student.balance).toFixed(2)}.`,
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .update({ free_account: newValue })
        .eq('id', student.id);

      if (error) throw error;

      // Si pasa de Prepago a Cuenta Libre y tiene saldo a favor
      const saldoAFavor = !newValue && student.balance > 0;

      toast({
        title: newValue ? '✅ Cuenta Libre Activada' : '🔒 Cuenta Libre Desactivada',
        description: newValue 
          ? `${student.full_name} ahora puede consumir y pagar después. ${student.balance > 0 ? 'Tu saldo a favor se descontará automáticamente.' : ''}` 
          : `${student.full_name} ahora está en modo Prepago (Recargas).`,
      });

      await fetchStudents();
    } catch (error: any) {
      console.error('Error toggling free account:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cambiar el modo de cuenta',
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (isChecking || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3] pb-20">
      {/* Header Fijo con Logo Lima Café 28 */}
      <header className="bg-gradient-to-r from-[#8B4513] to-[#D2691E] text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                <GraduationCap className="h-7 w-7 text-[#8B4513]" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Lima Café 28</h1>
                <p className="text-xs text-white/80">Portal de Padres</p>
              </div>
            </div>
            
            <VersionBadge />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'alumnos' && (
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-[#8B4513] mb-1">Mis Hijos</h2>
              <p className="text-gray-600 text-sm">Gestiona las cuentas del kiosco escolar</p>
            </div>

            {students.length === 0 ? (
              <Card className="border-2 border-dashed border-[#D2691E]/30">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <GraduationCap className="h-16 w-16 text-[#D2691E]/40 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No hay estudiantes registrados
                  </h3>
                  <p className="text-gray-600 mb-6 text-center max-w-md text-sm">
                    Agrega a tu primer hijo para empezar a usar el kiosco escolar
                  </p>
                  <Button 
                    size="lg" 
                    onClick={() => setShowAddStudent(true)}
                    className="bg-[#8B4513] hover:bg-[#A0522D]"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Agregar Mi Primer Hijo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {students.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      onRecharge={() => openRechargeModal(student)}
                      onViewHistory={() => openHistoryModal(student)}
                      onLunchFast={() => handleLunchFast(student)}
                      onViewMenu={() => openMenuModal(student)}
                      onOpenSettings={() => openSettingsModal(student)}
                      onPhotoClick={() => openPhotoModal(student)}
                    />
                  ))}
                </div>

                <Card 
                  className="border-2 border-dashed border-[#D2691E]/30 hover:border-[#D2691E] hover:bg-[#FFF8E7] transition-all cursor-pointer"
                  onClick={() => setShowAddStudent(true)}
                >
                  <CardContent className="flex items-center justify-center py-8">
                    <Plus className="h-6 w-6 text-[#8B4513] mr-2" />
                    <span className="text-[#8B4513] font-semibold">Agregar otro estudiante</span>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {activeTab === 'pagos' && <PaymentsTab userId={user?.id || ''} />}

        {activeTab === 'almuerzos' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-[#8B4513] mb-1">Calendario de Almuerzos</h2>
              <p className="text-gray-600 text-sm">Consulta los menús programados para tus hijos</p>
            </div>
            <LunchCalendarView studentSchoolIds={Array.from(new Set(students.map(s => s.school_id).filter(Boolean) as string[]))} />
          </div>
        )}

      </main>

      {/* MODALES */}
      <AddStudentModal
        isOpen={showAddStudent}
        onClose={() => setShowAddStudent(false)}
        onSuccess={fetchStudents}
      />

      {selectedStudent && (
        <>
          <RechargeModal
            isOpen={showRechargeModal}
            onClose={() => setShowRechargeModal(false)}
            studentName={selectedStudent.full_name}
            studentId={selectedStudent.id}
            currentBalance={selectedStudent.balance}
            accountType="free"
            onRecharge={handleRecharge}
          />

          <PayDebtModal
            isOpen={showPayDebtModal}
            onClose={() => setShowPayDebtModal(false)}
            studentName={selectedStudent.full_name}
            studentId={selectedStudent.id}
            onPaymentComplete={fetchStudents}
          />

          <WeeklyMenuModal
            isOpen={showMenuModal}
            onClose={() => setShowMenuModal(false)}
            studentId={selectedStudent.id}
          />

          <UploadPhotoModal
            isOpen={showUploadPhoto}
            onClose={() => setShowUploadPhoto(false)}
            studentId={selectedStudent.id}
            studentName={selectedStudent.full_name}
            onSuccess={fetchStudents}
          />

          {/* Modal de Límite Diario */}
          <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Límite de Gasto Diario</DialogTitle>
                <DialogDescription>
                  Configura el monto máximo que {selectedStudent.full_name} puede gastar por día
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="limit">Límite Diario (S/)</Label>
                  <Input
                    id="limit"
                    type="number"
                    step="0.50"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="text-lg font-semibold"
                    placeholder="15.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Coloca 0 para sin límite</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    Este límite ayuda a controlar los gastos diarios del estudiante en el kiosco.
                  </p>
                </div>

                <Button 
                  onClick={handleUpdateLimit}
                  disabled={isUpdatingLimit}
                  className="w-full"
                >
                  {isUpdatingLimit ? 'Actualizando...' : 'Actualizar Límite'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal de Historial de Compras */}
          {selectedStudent && (
            <PurchaseHistoryModal
              isOpen={showHistoryModal}
              onClose={() => setShowHistoryModal(false)}
              studentId={selectedStudent.id}
              studentName={selectedStudent.full_name}
            />
          )}

          {/* Modal de Confirmación LUNCH FAST */}
          <Dialog open={showLunchFastConfirm} onOpenChange={setShowLunchFastConfirm}>
            <DialogContent className="max-w-md border-4 border-orange-500">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-center text-orange-600">
                  ¿CONFIRMAR ALMUERZO HOY?
                </DialogTitle>
                <DialogDescription className="text-center pt-2">
                  Se realizará el pedido para <span className="font-bold text-gray-900">{selectedStudent.full_name}</span>
                </DialogDescription>
              </DialogHeader>

              {todayMenu && (
                <div className="bg-orange-50 rounded-2xl p-6 border-2 border-orange-200 shadow-inner">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start border-b border-orange-200 pb-2">
                      <span className="text-xs font-bold text-orange-700 uppercase">Entrada</span>
                      <span className="text-sm font-semibold text-gray-800">{todayMenu.starter || 'Sopa del día'}</span>
                    </div>
                    <div className="flex justify-between items-start border-b border-orange-200 pb-2">
                      <span className="text-xs font-bold text-orange-700 uppercase">Segundo</span>
                      <span className="text-sm font-bold text-gray-900">{todayMenu.main_course}</span>
                    </div>
                    <div className="flex justify-between items-start border-b border-orange-200 pb-2">
                      <span className="text-xs font-bold text-orange-700 uppercase">Bebida</span>
                      <span className="text-sm font-semibold text-gray-800">{todayMenu.beverage || 'Refresco natural'}</span>
                    </div>
                    <div className="flex justify-center pt-4">
                      <div className="text-center">
                        <span className="text-xs font-bold text-gray-500 uppercase block">Total a pagar</span>
                        <span className="text-4xl font-black text-orange-600">S/ {(todayMenu.price || 15).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowLunchFastConfirm(false)}
                  className="h-14 font-bold border-2"
                  disabled={isOrdering}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmLunchOrder}
                  className="h-14 font-black bg-orange-600 hover:bg-orange-700 text-lg shadow-lg"
                  disabled={isOrdering}
                >
                  {isOrdering ? 'Procesando...' : '¡SÍ, PEDIR!'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Modal de Advertencia de Cuenta Libre */}
      {selectedStudent && (
        <>
          <PhotoConsentModal
            open={showPhotoConsent}
            onOpenChange={setShowPhotoConsent}
            onAccept={handlePhotoConsentAccept}
            studentName={selectedStudent.full_name}
            parentId={user?.id || ''}
          />

          <FreeAccountWarningModal
            open={showFreeAccountWarning}
            onOpenChange={setShowFreeAccountWarning}
            studentName={selectedStudent.full_name}
            onConfirmDisable={() => handleToggleFreeAccount(selectedStudent, false)}
          />

          <StudentLinksManager
            open={showLinksManager}
            onOpenChange={setShowLinksManager}
            student={selectedStudent}
            allStudents={students}
            onLinksUpdated={fetchStudents}
          />
        </>
      )}

      {activeTab === 'mas' && (
        <MoreMenu 
          key={photoConsentRefresh} 
          userEmail={user?.email || ''} 
          onLogout={handleLogout} 
        />
      )}

      {/* Navegación Inferior Fija - Colores Lima Café 28 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#8B4513]/20 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-2">
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => setActiveTab('alumnos')}
              className={`flex flex-col items-center justify-center py-3 transition-all ${
                activeTab === 'alumnos'
                  ? 'text-[#8B4513] bg-[#FFF8E7]'
                  : 'text-gray-500 hover:text-[#8B4513] hover:bg-gray-50'
              }`}
            >
              <Home className="h-6 w-6 mb-1" />
              <span className="text-xs font-semibold">Mis Hijos</span>
            </button>

            <button
              onClick={() => setActiveTab('almuerzos')}
              className={`flex flex-col items-center justify-center py-3 transition-all ${
                activeTab === 'almuerzos'
                  ? 'text-[#8B4513] bg-[#FFF8E7]'
                  : 'text-gray-500 hover:text-[#8B4513] hover:bg-gray-50'
              }`}
            >
              <UtensilsCrossed className="h-6 w-6 mb-1" />
              <span className="text-xs font-semibold">Almuerzos</span>
            </button>

            <button
              onClick={() => setActiveTab('pagos')}
              className={`flex flex-col items-center justify-center py-3 transition-all ${
                activeTab === 'pagos'
                  ? 'text-[#8B4513] bg-[#FFF8E7]'
                  : 'text-gray-500 hover:text-[#8B4513] hover:bg-gray-50'
              }`}
            >
              <Wallet className="h-6 w-6 mb-1" />
              <span className="text-xs font-semibold">Pagos</span>
            </button>

            <button
              onClick={() => setActiveTab('mas')}
              className={`flex flex-col items-center justify-center py-3 transition-all ${
                activeTab === 'mas'
                  ? 'text-[#8B4513] bg-[#FFF8E7]'
                  : 'text-gray-500 hover:text-[#8B4513] hover:bg-gray-50'
              }`}
            >
              <MenuIcon className="h-6 w-6 mb-1" />
              <span className="text-xs font-semibold">Más</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Index;
