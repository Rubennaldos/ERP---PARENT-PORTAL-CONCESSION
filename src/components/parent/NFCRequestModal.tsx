import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Check, Nfc, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NFCRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  schoolId?: string;
}

interface NFCOption {
  type: 'sticker' | 'llavero' | 'tarjeta';
  name: string;
  price: number;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  advantages: string[];
}

const NFC_OPTIONS: NFCOption[] = [
  {
    type: 'sticker',
    name: 'Sticker NFC',
    price: 3.00,
    icon: '🏷️',
    color: 'text-blue-700',
    borderColor: 'border-blue-300',
    bgColor: 'bg-blue-50',
    advantages: [
      'Se adhiere a cualquier superficie (celular, cuaderno, carnet)',
      'Muy difícil de perder',
      'El más económico',
      'Discreto y compacto',
    ],
  },
  {
    type: 'llavero',
    name: 'Llavero / Pulsera NFC',
    price: 6.00,
    icon: '🔑',
    color: 'text-purple-700',
    borderColor: 'border-purple-300',
    bgColor: 'bg-purple-50',
    advantages: [
      'Fácil de usar y transportar',
      'Liviano y resistente',
      'Se puede colocar en cualquier pulsera o mochila',
      'Ideal para niños pequeños',
    ],
  },
  {
    type: 'tarjeta',
    name: 'Tarjeta Personalizada',
    price: 15.00,
    icon: '💳',
    color: 'text-amber-700',
    borderColor: 'border-amber-300',
    bgColor: 'bg-amber-50',
    advantages: [
      'Uso profesional y elegante',
      'Personalizada con nombre del alumno',
      'Duradera y resistente',
      'Tamaño estándar de tarjeta de crédito',
    ],
  },
];

export function NFCRequestModal({ isOpen, onClose, studentId, studentName, schoolId }: NFCRequestModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<NFCOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [changingType, setChangingType] = useState(false);

  // Verificar si ya existe una solicitud pendiente
  useEffect(() => {
    if (isOpen && studentId && user) {
      checkExistingRequest();
    }
  }, [isOpen, studentId, user]);

  const [tableError, setTableError] = useState(false);

  const checkExistingRequest = async () => {
    try {
      setLoadingExisting(true);
      setTableError(false);
      const { data, error } = await supabase
        .from('nfc_requests')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        const msg = error.message || '';
        if (msg.includes('nfc_requests') || msg.includes('relation') || error.code === '42P01' || error.code === 'PGRST204') {
          setTableError(true);
          return;
        }
      }

      if (!error && data) {
        setExistingRequest(data);
      } else {
        setExistingRequest(null);
      }
    } catch (err) {
      console.error('Error checking existing NFC request:', err);
      setExistingRequest(null);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('nfc_requests')
        .insert([{
          student_id: studentId,
          parent_id: user.id,
          school_id: schoolId || null,
          nfc_type: selectedType.type,
          price: selectedType.price,
          status: 'pending',
        }]);

      if (error) throw error;

      toast({
        title: '✅ Solicitud enviada',
        description: `Se envió la solicitud de ${selectedType.name} para ${studentName}. El administrador la revisará pronto.`,
      });

      setSelectedType(null);
      setChangingType(false);
      onClose();
    } catch (error: any) {
      console.error('Error creating NFC request:', error);
      
      let msg = 'No se pudo enviar la solicitud';
      const errMsg = error?.message || '';
      if (error.code === '23505') {
        msg = 'Ya existe una solicitud pendiente para este alumno';
      } else if (errMsg.includes('nfc_requests') || errMsg.includes('relation') || error.code === '42P01') {
        msg = 'El módulo NFC no está configurado. Contacta al administrador.';
      }

      toast({
        variant: 'destructive',
        title: 'Error',
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeType = async () => {
    if (!selectedType || !user || !existingRequest) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('nfc_requests')
        .update({
          nfc_type: selectedType.type,
          price: selectedType.price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRequest.id)
        .eq('status', 'pending'); // Solo si sigue pendiente

      if (error) throw error;

      toast({
        title: '✅ Dispositivo cambiado',
        description: `Se cambió a ${selectedType.name} (S/ ${selectedType.price.toFixed(2)}) correctamente.`,
      });

      setSelectedType(null);
      setChangingType(false);
      setExistingRequest(null);
      checkExistingRequest(); // Recargar
    } catch (error: any) {
      console.error('Error updating NFC request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cambiar el tipo de dispositivo',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: '⏳ Pendiente de revisión', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'approved': return { label: '✅ Aprobada', color: 'bg-green-100 text-green-800 border-green-300' };
      case 'rejected': return { label: '❌ Rechazada', color: 'bg-red-100 text-red-800 border-red-300' };
      case 'delivered': return { label: '📦 Entregada', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      default: return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getNfcTypeName = (type: string) => {
    const option = NFC_OPTIONS.find(o => o.type === type);
    return option ? `${option.icon} ${option.name}` : type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Nfc className="h-5 w-5 text-blue-600" />
            Activar NFC — {studentName}
          </DialogTitle>
          <DialogDescription>
            Solicita una identificación NFC para que tu hijo/a sea identificado de forma rápida y segura en el punto de venta.
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : tableError ? (
          <div className="py-6 space-y-3">
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Módulo NFC no configurado</p>
                <p className="text-sm text-amber-800 mt-1">
                  El sistema de solicitudes NFC aún no está habilitado. Contacta al administrador del colegio para activar esta funcionalidad.
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={onClose}>Cerrar</Button>
          </div>
        ) : existingRequest && !changingType ? (
          // Ya tiene una solicitud — mostrar estado + opción de cambiar
          <div className="space-y-4 py-4">
            <div className={cn(
              "p-4 rounded-xl border-2 text-center",
              existingRequest.status === 'pending' && "bg-yellow-50 border-yellow-300",
              existingRequest.status === 'approved' && "bg-green-50 border-green-300",
            )}>
              <div className="text-3xl mb-2">
                {NFC_OPTIONS.find(o => o.type === existingRequest.nfc_type)?.icon || '📱'}
              </div>
              <p className="font-semibold text-gray-900 text-lg">
                {getNfcTypeName(existingRequest.nfc_type)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Precio: S/ {existingRequest.price?.toFixed(2)}
              </p>
              <Badge className={cn("mt-3", getStatusLabel(existingRequest.status).color)}>
                {getStatusLabel(existingRequest.status).label}
              </Badge>
              {existingRequest.rejection_reason && (
                <p className="text-sm text-red-600 mt-2 italic">
                  Motivo: {existingRequest.rejection_reason}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                {existingRequest.status === 'pending' 
                  ? 'Tu solicitud está siendo revisada por el administrador. Te notificaremos cuando sea aprobada.'
                  : existingRequest.status === 'approved'
                  ? 'Tu solicitud fue aprobada. Pronto recibirás el NFC para tu hijo/a.'
                  : 'Ya tienes una solicitud activa para este alumno.'}
              </p>
            </div>

            {/* Botón para cambiar tipo de dispositivo — solo si está pendiente */}
            {existingRequest.status === 'pending' && (
              <Button
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  setChangingType(true);
                  setSelectedType(null);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Cambiar tipo de dispositivo
              </Button>
            )}
          </div>
        ) : (
          // Selección de tipo NFC (nuevo o cambio)
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600 font-medium text-center">
              {changingType 
                ? <>Elige el nuevo tipo de NFC para <strong>{studentName}</strong>:</>
                : <>Elige el tipo de NFC que deseas para <strong>{studentName}</strong>:</>
              }
            </p>

            <div className="space-y-3">
              {NFC_OPTIONS.map((option) => (
                <Card
                  key={option.type}
                  className={cn(
                    "p-4 cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                    selectedType?.type === option.type
                      ? `${option.borderColor} ${option.bgColor} ring-2 ring-offset-1 ring-blue-400`
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setSelectedType(option)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icono y radio */}
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <span className="text-3xl">{option.icon}</span>
                      {selectedType?.type === option.type && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={cn("font-bold text-base", option.color)}>
                          {option.name}
                        </h4>
                        <Badge className={cn("text-sm font-bold px-3 py-1", option.bgColor, option.color)}>
                          S/ {option.price.toFixed(2)}
                        </Badge>
                      </div>

                      {/* Ventajas */}
                      <ul className="mt-2 space-y-1">
                        {option.advantages.map((adv, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <span className="text-green-500 mt-0.5">✓</span>
                            {adv}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          {changingType ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => { setChangingType(false); setSelectedType(null); }} 
                disabled={submitting}
              >
                Cancelar cambio
              </Button>
              <Button
                onClick={handleChangeType}
                disabled={!selectedType || submitting}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Confirmar Cambio
                    {selectedType && ` — S/ ${selectedType.price.toFixed(2)}`}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                {existingRequest ? 'Cerrar' : 'Cancelar'}
              </Button>
              {!existingRequest && !loadingExisting && (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedType || submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Nfc className="h-4 w-4 mr-2" />
                      Enviar Solicitud
                      {selectedType && ` — S/ ${selectedType.price.toFixed(2)}`}
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
