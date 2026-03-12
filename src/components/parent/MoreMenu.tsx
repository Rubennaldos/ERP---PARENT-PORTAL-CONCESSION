import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Lock, 
  HelpCircle, 
  UtensilsCrossed, 
  Phone, 
  Nfc, 
  BookOpen,
  ChevronRight,
  AlertTriangle,
  FileText,
  Settings,
  LogOut,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal';
import { ParentDataForm } from '@/components/parent/ParentDataForm';
import { NFCRequestModal } from '@/components/parent/NFCRequestModal';

interface Student {
  id: string;
  full_name: string;
  school_id?: string;
}

interface MoreMenuProps {
  userEmail: string;
  onLogout: () => void;
  students?: Student[];
  onGoToPayments?: () => void;
}

export const MoreMenu = ({ userEmail, onLogout, students = [], onGoToPayments }: MoreMenuProps) => {
  const { user } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showParentData, setShowParentData] = useState(false);
  const [showPhotoInfo, setShowPhotoInfo] = useState(false);
  const [photoConsentAccepted, setPhotoConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [selectedNFCStudent, setSelectedNFCStudent] = useState<Student | null>(null);

  // Verificar si ya aceptó el consentimiento
  useEffect(() => {
    const checkPhotoConsent = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('parent_profiles')
          .select('photo_consent')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          setPhotoConsentAccepted(data.photo_consent || false);
        }
      } catch (error) {
        console.error('Error checking photo consent:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPhotoConsent();
  }, [user?.id]);

  const menuSections = [
    {
      title: 'Mi Cuenta',
      items: [
        { icon: User, label: 'Perfil del Padre', badge: userEmail, action: () => setShowParentData(true) },
        { icon: Lock, label: 'Cambiar Contraseña', action: () => setShowChangePassword(true) },
        { 
          icon: Camera, 
          label: 'Gestionar Fotos', 
          badge: photoConsentAccepted ? '✓ Activado' : 'No activado', 
          badgeVariant: photoConsentAccepted ? 'default' : 'outline',
          action: () => setShowPhotoInfo(true) // Cambiado a setShowPhotoInfo
        },
      ]
    },
    {
      title: 'Servicios',
      items: [
        { icon: UtensilsCrossed, label: 'Catering Privado', badge: 'Próximamente', disabled: true },
        { 
          icon: Nfc, 
          label: 'Solicitar NFC', 
          badge: students.length > 0 ? `${students.length} hijo(s)` : undefined,
          action: students.length > 0 ? () => {
            if (students.length === 1) {
              setSelectedNFCStudent(students[0]);
            } else {
              setSelectedNFCStudent(null);
            }
            setShowNFCModal(true);
          } : undefined,
          disabled: students.length === 0,
        },
      ]
    },
    {
      title: 'Ayuda y Legal',
      items: [
        { icon: HelpCircle, label: 'Preguntas Frecuentes', action: () => window.open('https://maracuya.com/faq', '_blank') },
        { icon: Phone, label: 'Contacto', action: () => window.open('https://wa.me/51999999999', '_blank') },
        { icon: BookOpen, label: 'Libro de Reclamaciones', badge: 'Próximamente', disabled: true },
        { icon: FileText, label: 'Términos y Condiciones', action: () => window.open('https://maracuya.com/terminos', '_blank') },
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header con usuario */}
      <Card className="bg-gradient-to-br from-[#9E4D68] to-[#D2691E] text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Mi Cuenta</h3>
              <p className="text-sm text-white/80 flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {userEmail}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secciones del menú */}
      {menuSections.map((section, idx) => (
        <div key={idx}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-4">
            {section.title}
          </h3>
          <Card>
            <CardContent className="p-0">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx}>
                  <button
                    onClick={item.action}
                    disabled={item.disabled}
                    className={`w-full flex items-center justify-between p-4 transition-colors ${
                      item.disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-[#9E4D68]" />
                      <span className="font-medium text-gray-900">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <Badge 
                          variant={item.badgeVariant || 'outline'} 
                          className={`text-xs ${
                            item.badgeVariant === 'default' 
                              ? 'bg-green-500 hover:bg-green-600 text-white' 
                              : ''
                          }`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {!item.disabled && <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>
                  {itemIdx < section.items.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Botón de cerrar sesión */}
      <Button
        onClick={onLogout}
        variant="destructive"
        className="w-full h-14 text-lg font-bold"
        size="lg"
      >
        <LogOut className="mr-2 h-5 w-5" />
        Cerrar Sesión
      </Button>

      {/* Modal Cambiar Contraseña */}
      <ChangePasswordModal
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />

      {/* Modal Datos del Padre — editable con ParentDataForm */}
      <Dialog open={showParentData} onOpenChange={setShowParentData}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#9E4D68]" />
              Editar Datos del Padre
            </DialogTitle>
            <DialogDescription>
              Puedes actualizar tus datos de responsable principal y secundario.
            </DialogDescription>
          </DialogHeader>
          <div className="px-2 pb-2">
            <ParentDataForm
              isEditing
              onSuccess={() => {
                setShowParentData(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Consentimiento Fotos */}
      <Dialog open={showPhotoInfo} onOpenChange={setShowPhotoInfo}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Camera className="h-6 w-6 text-[#9E4D68]" />
              Estado del Consentimiento de Fotografías
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {photoConsentAccepted ? (
              <>
                <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-900 mb-2">
                    ✓ Consentimiento Activado
                  </h3>
                  <p className="text-green-800">
                    Ya has autorizado el uso de fotografías para tus hijos.
                    <br />
                    Puedes gestionar las fotos desde la tarjeta de cada estudiante.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2">Recordatorio de uso:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Identificación visual en el punto de venta (POS)</li>
                    <li>Facilitar el reconocimiento del estudiante</li>
                    <li>Mejorar la seguridad y rapidez del servicio</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Importante:</strong> Si deseas revocar el consentimiento o eliminar las fotos, 
                      contacta con el administrador del sistema.
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 text-center">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Consentimiento No Activado
                  </h3>
                  <p className="text-gray-600">
                    Para activar el uso de fotografías, haz clic en la foto de tu hijo/a 
                    desde la sección "Mis Hijos".
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2">¿Para qué se usan las fotos?</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Identificación visual en el punto de venta (POS)</li>
                    <li>Facilitar el reconocimiento del estudiante por el personal</li>
                    <li>Mejorar la seguridad y rapidez del servicio</li>
                  </ul>
                </div>
              </>
            )}

            <Button 
              onClick={() => setShowPhotoInfo(false)}
              className="w-full bg-[#9E4D68] hover:bg-[#B86880]"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selector de estudiante para NFC (si hay más de 1) */}
      {showNFCModal && students.length > 1 && !selectedNFCStudent && (
        <Dialog open={true} onOpenChange={() => setShowNFCModal(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Nfc className="h-5 w-5 text-blue-600" />
                ¿Para cuál hijo/a?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {students.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  className="w-full justify-start text-left h-12"
                  onClick={() => setSelectedNFCStudent(s)}
                >
                  <User className="h-4 w-4 mr-2 text-[#9E4D68]" />
                  {s.full_name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal NFC */}
      {selectedNFCStudent && (
        <NFCRequestModal
          isOpen={showNFCModal}
          onClose={() => {
            setShowNFCModal(false);
            setSelectedNFCStudent(null);
          }}
          studentId={selectedNFCStudent.id}
          studentName={selectedNFCStudent.full_name}
          schoolId={selectedNFCStudent.school_id}
          onGoToPayments={() => {
            setShowNFCModal(false);
            setSelectedNFCStudent(null);
            onGoToPayments?.();
          }}
        />
      )}
    </div>
  );
};

