import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  Menu as MenuIcon,
  Home,
  Wallet,
  UtensilsCrossed,
  Calendar
} from 'lucide-react';
import maracuyaLogo from '@/assets/maracuya-logo.png';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { AddStudentModal } from '@/components/AddStudentModal';
import { UploadPhotoModal } from '@/components/UploadPhotoModal';
import { StudentCard } from '@/components/parent/StudentCard';
import { VersionBadge } from '@/components/VersionBadge';
import { FreeAccountOnboardingModal } from '@/components/parent/FreeAccountOnboardingModal';
import { PaymentsTab } from '@/components/parent/PaymentsTab';
import { MoreMenu } from '@/components/parent/MoreMenu';
import { PhotoConsentModal } from '@/components/parent/PhotoConsentModal';
import { PurchaseHistoryModal } from '@/components/parent/PurchaseHistoryModal';
import { UnifiedLunchCalendarV2 } from '@/components/lunch/UnifiedLunchCalendarV2';
import { ParentLunchOrders } from '@/components/parent/ParentLunchOrders';
import { ParentDataForm } from '@/components/parent/ParentDataForm';
import { NFCRequestModal } from '@/components/parent/NFCRequestModal';
import { KioskAccountModal } from '@/components/parent/KioskAccountModal';
import { MaintenanceScreen } from '@/components/parent/MaintenanceScreen';
import { useOnboardingCheck } from '@/hooks/useOnboardingCheck';

interface Student {
  id: string;
  full_name: string;
  photo_url: string | null;
  balance: number;
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  limit_type: string;
  grade: string;
  section: string;
  is_active: boolean;
  school_id?: string;
  free_account?: boolean;
  school?: { id: string; name: string } | null;
}

const Index = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { isChecking } = useOnboardingCheck();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [studentDebts, setStudentDebts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState<string>('');
  const [parentProfileData, setParentProfileData] = useState<any>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('parentPortalTab') || 'alumnos';
  });

  useEffect(() => {
    sessionStorage.setItem('parentPortalTab', activeTab);
  }, [activeTab]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showParentDataForm, setShowParentDataForm] = useState(false);
  const [isParentFormLoading, setIsParentFormLoading] = useState(false);
  
  // Modales
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showUploadPhoto, setShowUploadPhoto] = useState(false);
  const [showPhotoConsent, setShowPhotoConsent] = useState(false);
  const [photoConsentAccepted, setPhotoConsentAccepted] = useState(false);
  const [photoConsentRefresh, setPhotoConsentRefresh] = useState(0);
  
  // Estudiante seleccionado
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // NFC
  const [showNFCModal, setShowNFCModal] = useState(false);

  // Kiosco
  const [showKioskModal, setShowKioskModal] = useState(false);

  // Modo mantenimiento
  const [lunchMaintenance, setLunchMaintenance] = useState<{ is_active: boolean; title: string; message: string; bypass_emails: string[] } | null>(null);

  // Estado para evitar doble apertura
  const [isOpeningPhotoModal, setIsOpeningPhotoModal] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchParentProfile();
    checkOnboardingStatus();
    checkLunchMaintenance();
  }, [user]);

  const checkLunchMaintenance = async () => {
    try {
      const { data } = await supabase
        .from('module_maintenance')
        .select('is_active, title, message, bypass_emails')
        .eq('module_key', 'parent_lunch')
        .maybeSingle();
      if (data) setLunchMaintenance(data);
    } catch {
      // Si falla (tabla no existe aún), no bloquear nada
    }
  };

  const fetchParentProfile = async () => {
    if (!user) return;
    try {
      // ✅ Solo columnas que siempre existen en parent_profiles
      const { data: parentProfileData, error: ppError } = await supabase
        .from('parent_profiles')
        .select('full_name, school_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Intentar también photo_consent por separado (puede no existir aún)
      if (!ppError && parentProfileData?.full_name) {
        setParentName(parentProfileData.full_name);
        setParentProfileData(parentProfileData);

        // Verificar photo_consent por separado de forma segura
        const { data: consentData } = await supabase
          .from('parent_profiles')
          .select('photo_consent')
          .eq('user_id', user.id)
          .maybeSingle();

        if (consentData?.photo_consent === true) {
          setPhotoConsentAccepted(true);
        }
      } else if (ppError) {
        console.warn('fetchParentProfile: error en parent_profiles, usando fallback de profiles:', ppError.message);
      }

      if (!parentProfileData?.full_name) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, school_id')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          if (profileData.full_name) {
            setParentName(profileData.full_name);
          }
          setParentProfileData(profileData);
        }
      }
    } catch (e) {
      console.error("Error fetching parent profile:", e);
    }
  };

  const checkOnboardingStatus = async () => {
    if (!user) return;
    try {
      // ✅ Query robusta: solo campos que sabemos que existen
      const { data: parentData, error: parentError } = await supabase
        .from('parent_profiles')
        .select('full_name, dni, phone_1, address')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentError) {
        // Si la query falla por columnas faltantes u otro error,
        // mostrar el formulario de datos del padre de todas formas
        console.warn('checkOnboardingStatus: error en parent_profiles, mostrando formulario:', parentError.message);
        setShowParentDataForm(true);
        return;
      }

      // Si no hay datos del perfil o faltan campos básicos → mostrar formulario
      const mainResponsibleComplete = parentData?.full_name && parentData?.dni && parentData?.phone_1 && parentData?.address;

      if (!parentData || !mainResponsibleComplete) {
        setShowParentDataForm(true);
        return;
      }

      // Datos básicos completos → verificar onboarding de cuenta libre
      const { data, error } = await supabase
        .from('profiles')
        .select('free_account_onboarding_completed')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.warn('checkOnboardingStatus: error en profiles:', error.message);
        return;
      }
      
      if (!data?.free_account_onboarding_completed) {
        setShowOnboarding(true);
      }
    } catch (e) {
      console.error("Error checking onboarding status:", e);
      // En caso de error inesperado, mostrar el formulario para no bloquear al usuario
      setShowParentDataForm(true);
    }
  };

  const handleOnboardingComplete = async () => {
    if (!user) return;
    try {
      await supabase
        .from('profiles')
        .update({ free_account_onboarding_completed: true })
        .eq('id', user.id);
      
      setShowOnboarding(false);
      
      const { data: studentsData } = await supabase
        .from('students')
        .select('id')
        .eq('parent_id', user.id)
        .limit(1);
      
      if (!studentsData || studentsData.length === 0) {
        toast({
          title: '👨‍👩‍👧‍👦 Agregar tus hijos',
          description: 'Por favor, agrega a tus hijos para comenzar a usar el portal',
          duration: 5000,
        });
        setShowAddStudent(true);
      } else {
        toast({
          title: '✅ ¡Bienvenido!',
          description: 'Ya puedes comenzar a usar el portal',
        });
      }
    } catch (e) {
      console.error("Error completing onboarding:", e);
    }
  };

  const fetchStudents = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*, school:schools(id, name)')
        .eq('parent_id', user.id)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      
      setStudents(data || []);
      
      if (data && data.length > 0) {
        await calculateStudentDebts(data);
      }
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

  // ✅ Calcular deuda de cada estudiante — SOLO consumos de kiosco (excluye almuerzos)
  const calculateStudentDebts = async (studentsData: Student[]) => {
    const debtsMap: Record<string, number> = {};
    
    for (const student of studentsData) {
      try {
        // Solo deudas del KIOSCO: excluye transacciones cuyo metadata.source sea de almuerzo
        // Los almuerzos usan source: 'physical_order_wizard', 'parent_app', 'teacher_app', etc.
        // El kiosco usa source: 'pos' y 'historical_kiosk_entry'
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, metadata')
          .eq('student_id', student.id)
          .eq('type', 'purchase')
          .eq('payment_status', 'pending');

        const kioskDebt = (transactions || [])
          .filter(t => {
            const src = t.metadata?.source as string | undefined;
            // Incluir solo si la fuente es del kiosco o si no tiene source definido
            // Excluir explícitamente todas las fuentes de almuerzo
            const lunchSources = ['physical_order_wizard', 'parent_app', 'teacher_app', 'lunch', 'lunch_order'];
            if (!src) return true; // Sin source → kiosco (comportamiento legacy)
            return !lunchSources.includes(src);
          })
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

        debtsMap[student.id] = kioskDebt;
      } catch (error) {
        console.error(`Error calculating debt for student ${student.id}:`, error);
        debtsMap[student.id] = 0;
      }
    }
    
    setStudentDebts(debtsMap);
  };

  const openHistoryModal = (student: Student) => {
    setSelectedStudent(student);
    setShowHistoryModal(true);
  };

  const openPayDebtModal = (_student: Student) => {
    setActiveTab('pagos');
  };

  const openPhotoModal = async (student: Student) => {
    if (isOpeningPhotoModal) return;

    setIsOpeningPhotoModal(true);
    setSelectedStudent(student);
    
    if (user?.id) {
      try {
        const { data: consentData, error } = await supabase
          .from('parent_profiles')
          .select('photo_consent')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking consent:', error);
        }

        const hasConsent = consentData?.photo_consent === true;

        if (hasConsent) {
          setPhotoConsentAccepted(true);
          setShowUploadPhoto(true);
        } else {
          setShowPhotoConsent(true);
        }
      } catch (error) {
        console.error('Exception in openPhotoModal:', error);
      }
    }

    setTimeout(() => {
      setIsOpeningPhotoModal(false);
    }, 500);
  };

  const handlePhotoConsentAccept = () => {
    setPhotoConsentAccepted(true);
    setShowPhotoConsent(false);
    setShowUploadPhoto(true);
    setPhotoConsentRefresh(prev => prev + 1);
    fetchParentProfile();
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
    <div className="min-h-screen bg-[#FAFAF9] pb-20 sm:pb-24">
      {/* Header */}
      <header className="bg-white border-b border-stone-200/50 sticky top-0 z-40 shadow-sm backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <img 
                src={maracuyaLogo} 
                alt="Maracuyá" 
                className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 object-contain rounded-xl sm:rounded-2xl"
              />
              <div>
                <h1 className="text-base sm:text-lg md:text-xl font-light text-[#8B4060] tracking-wide">Maracuyá</h1>
                <p className="text-[8px] sm:text-[9px] font-medium text-stone-400 uppercase tracking-[0.15em] sm:tracking-[0.2em]">Tiendas & Concesionarias Saludables</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="hidden md:block text-right">
                <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Bienvenido</p>
                <p className="text-sm font-medium text-stone-700">{parentName || 'Padre de Familia'}</p>
              </div>
              <div className="hidden sm:block">
                <VersionBadge />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-10">
        {/* Pestaña Alumnos */}
        <div className={activeTab !== 'alumnos' ? 'hidden' : ''}>
          <div className="space-y-6 sm:space-y-8">
            <div className="mb-4 sm:mb-6 md:mb-8">
              <h2 className="text-2xl sm:text-2xl md:text-3xl font-light text-stone-800 tracking-wide mb-1 sm:mb-2">Mis Hijos</h2>
              <p className="text-stone-400 font-normal text-xs sm:text-sm tracking-wide">Gestión centralizada de cuentas escolares</p>
            </div>

            {students.length === 0 ? (
              <Card className="border border-dashed border-stone-300/50 bg-white shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4">
                  <img src={maracuyaLogo} alt="Maracuyá" className="h-14 w-14 sm:h-16 sm:w-16 object-contain opacity-40 mb-4 sm:mb-5 md:mb-6" />
                  <h3 className="text-lg sm:text-xl font-normal text-stone-800 mb-2 sm:mb-3 tracking-wide text-center">
                    No hay estudiantes registrados
                  </h3>
                  <p className="text-stone-500 mb-6 sm:mb-7 md:mb-8 text-center max-w-md text-xs sm:text-sm leading-relaxed px-2">
                    Agrega a tu primer hijo para empezar a usar el kiosco escolar
                  </p>
                  <Button 
                    size="lg" 
                    onClick={() => setShowAddStudent(true)}
                    className="bg-gradient-to-r from-emerald-600/90 via-[#A3566E] to-[#8B4060] hover:from-emerald-700/90 hover:via-[#8B4060] hover:to-[#7A3755] text-white shadow-md transition-all duration-300 h-12 sm:h-auto text-sm sm:text-base"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Agregar Mi Primer Hijo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {students.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      totalDebt={studentDebts[student.id] || 0}
                      onViewHistory={() => openHistoryModal(student)}
                      onPayDebt={() => openPayDebtModal(student)}
                      onPhotoClick={() => openPhotoModal(student)}
                      onActivateNFC={() => {
                        setSelectedStudent(student);
                        setShowNFCModal(true);
                      }}
                      onOpenKiosk={() => {
                        setSelectedStudent(student);
                        setShowKioskModal(true);
                      }}
                    />
                  ))}
                </div>

                <Card 
                  className="border border-dashed border-stone-300/50 hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all duration-300 cursor-pointer shadow-sm"
                  onClick={() => setShowAddStudent(true)}
                >
                  <CardContent className="flex items-center justify-center py-6 sm:py-7 md:py-8">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mr-2" />
                    <span className="text-emerald-700 font-normal tracking-wide text-sm sm:text-base">Agregar otro estudiante</span>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Pestaña Pagos */}
        <div className={activeTab !== 'pagos' ? 'hidden' : ''}>
          {user?.id && <PaymentsTab userId={user.id} />}
        </div>

        {/* Pestaña Almuerzos */}
        <div className={activeTab !== 'almuerzos' ? 'hidden' : ''}>
          {user && (() => {
            // Verificar si está en modo mantenimiento y el usuario NO está en la lista bypass
            const isInMaintenance =
              lunchMaintenance?.is_active === true &&
              !lunchMaintenance.bypass_emails
                .map(e => e.toLowerCase())
                .includes((user.email || '').toLowerCase());

            if (isInMaintenance) {
              return (
                <MaintenanceScreen
                  title={lunchMaintenance?.title}
                  message={lunchMaintenance?.message}
                />
              );
            }

            return (
              <div className="px-2 sm:px-4 space-y-4 sm:space-y-6">
                <Tabs defaultValue="hacer-pedido" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-auto">
                    <TabsTrigger value="hacer-pedido" className="text-xs sm:text-sm py-2 sm:py-3">
                      <UtensilsCrossed className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Hacer Pedido
                    </TabsTrigger>
                    <TabsTrigger value="mis-pedidos" className="text-xs sm:text-sm py-2 sm:py-3">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Mis Pedidos
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="hacer-pedido" className="mt-4 sm:mt-6">
                    {user && parentProfileData && (
                      <UnifiedLunchCalendarV2 
                        userType="parent"
                        userId={user.id}
                        userSchoolId={parentProfileData.school_id || ''}
                      />
                    )}
                  </TabsContent>
                  
                  <TabsContent value="mis-pedidos" className="mt-4 sm:mt-6">
                    <ParentLunchOrders parentId={user.id} />
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}
        </div>
      </main>

      {/* MODALES */}
      <AddStudentModal
        isOpen={showAddStudent}
        onClose={() => setShowAddStudent(false)}
        onSuccess={fetchStudents}
      />

      {selectedStudent && (
        <>
          <UploadPhotoModal
            isOpen={showUploadPhoto}
            onClose={() => setShowUploadPhoto(false)}
            studentId={selectedStudent.id}
            studentName={selectedStudent.full_name}
            onSuccess={fetchStudents}
            skipConsent={true}
          />

          <PurchaseHistoryModal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            studentId={selectedStudent.id}
            studentName={selectedStudent.full_name}
          />

          <PhotoConsentModal
            open={showPhotoConsent}
            onOpenChange={setShowPhotoConsent}
            onAccept={handlePhotoConsentAccept}
            studentName={selectedStudent.full_name}
            parentId={user?.id || ''}
          />

          <NFCRequestModal
            isOpen={showNFCModal}
            onClose={() => setShowNFCModal(false)}
            studentId={selectedStudent.id}
            studentName={selectedStudent.full_name}
            schoolId={selectedStudent.school_id}
            onGoToPayments={() => {
              setShowNFCModal(false);
              setActiveTab('pagos');
            }}
          />

          <KioskAccountModal
            isOpen={showKioskModal}
            onClose={() => setShowKioskModal(false)}
            studentId={selectedStudent.id}
            studentName={selectedStudent.full_name}
            currentBalance={selectedStudent.balance || 0}
            freeAccount={selectedStudent.free_account !== false}
            totalDebt={studentDebts[selectedStudent.id] || 0}
            schoolId={selectedStudent.school_id}
            onGoToPayments={() => {
              setShowKioskModal(false);
              setActiveTab('pagos');
            }}
            onAccountChanged={fetchStudents}
          />
        </>
      )}

      {activeTab === 'mas' && (
        <MoreMenu 
          key={photoConsentRefresh} 
          userEmail={user?.email || ''} 
          onLogout={handleLogout}
          students={students}
          onGoToPayments={() => setActiveTab('pagos')}
        />
      )}

      {/* Navegación Inferior Fija */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200/50 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-1 sm:px-2">
          <div className="grid grid-cols-4 gap-0.5 sm:gap-1">
            <button
              onClick={() => setActiveTab('alumnos')}
              className={`flex flex-col items-center justify-center py-2.5 sm:py-3 transition-all duration-200 rounded-lg ${
                activeTab === 'alumnos'
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-stone-400 hover:text-emerald-600 hover:bg-emerald-50/30'
              }`}
            >
              <Home className="h-5 w-5 sm:h-6 sm:w-6 mb-0.5 sm:mb-1" />
              <span className="text-[10px] sm:text-xs font-normal tracking-wide">Mis Hijos</span>
            </button>

            <button
              onClick={() => setActiveTab('almuerzos')}
              className={`flex flex-col items-center justify-center py-2.5 sm:py-3 transition-all duration-200 rounded-lg ${
                activeTab === 'almuerzos'
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-stone-400 hover:text-emerald-600 hover:bg-emerald-50/30'
              }`}
            >
              <UtensilsCrossed className="h-5 w-5 sm:h-6 sm:w-6 mb-0.5 sm:mb-1" />
              <span className="text-[10px] sm:text-xs font-normal tracking-wide">Almuerzos</span>
            </button>

            <button
              onClick={() => setActiveTab('pagos')}
              className={`flex flex-col items-center justify-center py-2.5 sm:py-3 transition-all duration-200 rounded-lg ${
                activeTab === 'pagos'
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-stone-400 hover:text-emerald-600 hover:bg-emerald-50/30'
              }`}
            >
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 mb-0.5 sm:mb-1" />
              <span className="text-[10px] sm:text-xs font-normal tracking-wide">Pagos</span>
            </button>

            <button
              onClick={() => setActiveTab('mas')}
              className={`flex flex-col items-center justify-center py-2.5 sm:py-3 transition-all duration-200 rounded-lg ${
                activeTab === 'mas'
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-stone-400 hover:text-emerald-600 hover:bg-emerald-50/30'
              }`}
            >
              <MenuIcon className="h-5 w-5 sm:h-6 sm:w-6 mb-0.5 sm:mb-1" />
              <span className="text-[10px] sm:text-xs font-normal tracking-wide">Más</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="fixed bottom-16 sm:bottom-20 left-0 right-0 pointer-events-none z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-emerald-50/80 to-blue-50/80 backdrop-blur-sm border border-emerald-200/50 rounded-lg shadow-sm py-2 px-4 pointer-events-auto">
            <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-gray-600">
              <span className="font-medium">©</span>
              <span>2026 <span className="font-semibold text-emerald-700">ERP Profesional</span></span>
            </div>
            <div className="text-center text-[9px] sm:text-[10px] text-gray-500 mt-1">
              Diseñado por <span className="font-semibold text-emerald-600">ARQUISIA Soluciones</span> para <span className="font-semibold text-blue-600">Maracuyá Tiendas y Concesionarias Saludables</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Formulario de Datos del Padre */}
      {showParentDataForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4 py-6">
            <div className="w-full max-w-md">
              <ParentDataForm
                onSuccess={() => {
                  setShowParentDataForm(false);
                  setShowOnboarding(true);
                }}
                isLoading={isParentFormLoading}
                setIsLoading={setIsParentFormLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Onboarding - Cuenta Libre */}
      <FreeAccountOnboardingModal
        open={showOnboarding}
        onAccept={handleOnboardingComplete}
        parentName={parentName || 'Padre de Familia'}
      />
    </div>
  );
};

export default Index;
