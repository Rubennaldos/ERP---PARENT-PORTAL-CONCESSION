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
  Camera
} from 'lucide-react';
import { useState } from 'react';

interface MoreMenuProps {
  userEmail: string;
  onLogout: () => void;
}

export const MoreMenu = ({ userEmail, onLogout }: MoreMenuProps) => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showParentData, setShowParentData] = useState(false);
  const [showPhotoConsent, setShowPhotoConsent] = useState(false);

  const menuSections = [
    {
      title: 'Mi Cuenta',
      items: [
        { icon: User, label: 'Perfil del Padre', badge: userEmail, action: () => setShowParentData(true) },
        { icon: Lock, label: 'Cambiar Contraseña', action: () => setShowChangePassword(true) },
        { icon: Camera, label: 'Gestionar Fotos', badge: 'Consentimiento', action: () => setShowPhotoConsent(true) },
      ]
    },
    {
      title: 'Servicios',
      items: [
        { icon: UtensilsCrossed, label: 'Catering Privado', badge: 'Próximamente', disabled: true },
        { icon: Nfc, label: 'Activar NFC', badge: 'Próximamente', disabled: true },
      ]
    },
    {
      title: 'Ayuda y Legal',
      items: [
        { icon: HelpCircle, label: 'Preguntas Frecuentes', action: () => window.open('https://limacafe28.com/faq', '_blank') },
        { icon: Phone, label: 'Contacto', action: () => window.open('https://wa.me/51999999999', '_blank') },
        { icon: BookOpen, label: 'Libro de Reclamaciones', badge: 'Próximamente', disabled: true },
        { icon: FileText, label: 'Términos y Condiciones', action: () => window.open('https://limacafe28.com/terminos', '_blank') },
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header con usuario */}
      <Card className="bg-gradient-to-br from-[#8B4513] to-[#D2691E] text-white border-0">
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
                      <item.icon className="h-5 w-5 text-[#8B4513]" />
                      <span className="font-medium text-gray-900">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <Badge variant="outline" className="text-xs">
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
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Próximamente podrás cambiar tu contraseña desde aquí
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <Lock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              Esta funcionalidad estará disponible pronto.
              <br />
              Por ahora, contacta al administrador.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Datos del Padre */}
      <Dialog open={showParentData} onOpenChange={setShowParentData}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Datos del Padre</DialogTitle>
            <DialogDescription>
              <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Importante:</strong> Si cambias el responsable principal, se actualizarán los accesos y notificaciones.
                  Esta acción debe hacerse con precaución.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              Funcionalidad en desarrollo.
              <br />
              Contacta al administrador para cambios.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Consentimiento Fotos */}
      <Dialog open={showPhotoConsent} onOpenChange={setShowPhotoConsent}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Consentimiento de Uso de Fotografías</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-900 mb-2">¿Para qué se usan las fotos?</h4>
              <p className="text-sm text-blue-800">
                Las fotografías de los menores se utilizan <strong>exclusivamente</strong> para:
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                <li>Identificación visual en el punto de venta (POS)</li>
                <li>Facilitar el reconocimiento del estudiante por el personal del kiosco</li>
                <li>Mejorar la seguridad y rapidez del servicio</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Protección de Datos
              </h4>
              <p className="text-sm text-green-800">
                ✓ Las fotos <strong>NO</strong> se comparten con terceros
                <br />
                ✓ Solo el personal autorizado puede verlas
                <br />
                ✓ Puedes eliminar o cambiar la foto en cualquier momento
                <br />
                ✓ Los datos se almacenan de forma segura y encriptada
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <Switch id="consent" />
              <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                <strong>Autorizo</strong> el uso de la fotografía de mi hijo/a para fines de <strong>identificación</strong> en el servicio de kiosco escolar de Lima Café 28, 
                bajo los términos descritos. Entiendo que puedo revocar este consentimiento en cualquier momento.
              </Label>
            </div>

            <Button className="w-full bg-[#8B4513] hover:bg-[#A0522D]">
              Guardar Preferencias
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

