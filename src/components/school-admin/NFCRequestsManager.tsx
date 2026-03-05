import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Nfc,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Loader2,
  Search,
  User,
  GraduationCap,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NFCRequest {
  id: string;
  student_id: string;
  parent_id: string;
  school_id: string | null;
  nfc_type: 'sticker' | 'llavero' | 'tarjeta';
  price: number;
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  student_name?: string;
  student_grade?: string;
  student_section?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
}

interface NFCRequestsManagerProps {
  schoolId: string | null;
}

const NFC_TYPE_CONFIG = {
  sticker: {
    icon: '🏷️',
    name: 'Sticker NFC',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  llavero: {
    icon: '🔑',
    name: 'Llavero / Pulsera',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  tarjeta: {
    icon: '💳',
    name: 'Tarjeta Personalizada',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  approved: { label: 'Aprobada', icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-300' },
  rejected: { label: 'Rechazada', icon: XCircle, color: 'bg-red-100 text-red-800 border-red-300' },
  delivered: { label: 'Entregada', icon: Package, color: 'bg-blue-100 text-blue-800 border-blue-300' },
};

export function NFCRequestsManager({ schoolId }: NFCRequestsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<NFCRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal de acción
  const [actionRequest, setActionRequest] = useState<NFCRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'deliver' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [schoolId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      // Fetch NFC requests
      let query = supabase
        .from('nfc_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setRequests([]);
        return;
      }

      // Enrich with student and parent data
      const enrichedRequests: NFCRequest[] = [];

      for (const req of data) {
        let studentInfo: any = {};
        let parentInfo: any = {};

        // Get student info
        try {
          const { data: student } = await supabase
            .from('students')
            .select('full_name, grade, section')
            .eq('id', req.student_id)
            .single();
          if (student) {
            studentInfo = {
              student_name: student.full_name,
              student_grade: student.grade,
              student_section: student.section,
            };
          }
        } catch (e) { /* ignore */ }

        // Get parent info
        try {
          const { data: parentProfile } = await supabase
            .from('parent_profiles')
            .select('full_name, phone_1')
            .eq('user_id', req.parent_id)
            .maybeSingle();
          
          if (parentProfile) {
            parentInfo = {
              parent_name: parentProfile.full_name,
              parent_phone: parentProfile.phone_1,
            };
          }

          // Get email from auth
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', req.parent_id)
            .maybeSingle();
          if (profile) {
            parentInfo.parent_email = profile.email;
          }
        } catch (e) { /* ignore */ }

        enrichedRequests.push({
          ...req,
          ...studentInfo,
          ...parentInfo,
        });
      }

      setRequests(enrichedRequests);
    } catch (error: any) {
      console.error('Error loading NFC requests:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las solicitudes NFC',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionRequest || !actionType || !user) return;

    setProcessing(true);
    try {
      const updates: any = {
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (actionType === 'approve') {
        updates.status = 'approved';
      } else if (actionType === 'reject') {
        updates.status = 'rejected';
        updates.rejection_reason = rejectionReason || 'Sin motivo especificado';
      } else if (actionType === 'deliver') {
        updates.status = 'delivered';
      }

      const { error } = await supabase
        .from('nfc_requests')
        .update(updates)
        .eq('id', actionRequest.id);

      if (error) throw error;

      const actionLabels = {
        approve: 'aprobada',
        reject: 'rechazada',
        deliver: 'marcada como entregada',
      };

      toast({
        title: '✅ Solicitud actualizada',
        description: `La solicitud fue ${actionLabels[actionType]} correctamente.`,
      });

      setActionRequest(null);
      setActionType(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error updating NFC request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la solicitud',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Filter
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      !searchTerm ||
      req.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.parent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.parent_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Nfc className="h-5 w-5 text-blue-600" />
                Solicitudes NFC
                {pendingCount > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 ml-2">
                    {pendingCount} pendiente{pendingCount !== 1 && 's'}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Gestiona las solicitudes de tarjetas/stickers NFC de los padres
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRequests}
              className="flex-shrink-0"
            >
              Actualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por alumno o padre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'pending', label: '⏳ Pendientes' },
                { value: 'approved', label: '✅ Aprobados' },
                { value: 'rejected', label: '❌ Rechazados' },
                { value: 'delivered', label: '📦 Entregados' },
              ].map((f) => (
                <Button
                  key={f.value}
                  variant={filterStatus === f.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(f.value)}
                  className={cn(
                    "whitespace-nowrap text-xs",
                    filterStatus === f.value && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Lista de solicitudes */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Nfc className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="font-medium">No hay solicitudes NFC</p>
              <p className="text-sm mt-1">
                {filterStatus !== 'all'
                  ? 'No hay solicitudes con este filtro'
                  : 'Las solicitudes de los padres aparecerán aquí'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const typeConfig = NFC_TYPE_CONFIG[req.nfc_type];
                const statusConfig = STATUS_CONFIG[req.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <Card
                    key={req.id}
                    className={cn(
                      "border transition-all hover:shadow-sm",
                      req.status === 'pending' && "border-yellow-200 bg-yellow-50/30"
                    )}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Info principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xl">{typeConfig.icon}</span>
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                              {req.student_name || 'Alumno desconocido'}
                            </h4>
                            <Badge className={cn("text-xs border", statusConfig.color)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>

                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            {req.student_grade && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                {req.student_grade} - {req.student_section}
                              </span>
                            )}
                            {req.parent_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {req.parent_name}
                              </span>
                            )}
                            {req.parent_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {req.parent_phone}
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 flex items-center gap-3 text-xs">
                            <Badge className={cn("border text-xs", typeConfig.color)}>
                              {typeConfig.name}
                            </Badge>
                            <span className="font-bold text-gray-700">
                              S/ {req.price?.toFixed(2)}
                            </span>
                            <span className="text-gray-400">
                              {format(new Date(req.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                            </span>
                          </div>

                          {req.rejection_reason && req.status === 'rejected' && (
                            <p className="text-xs text-red-600 mt-1 italic">
                              Motivo: {req.rejection_reason}
                            </p>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2 flex-shrink-0">
                          {req.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                onClick={() => {
                                  setActionRequest(req);
                                  setActionType('approve');
                                }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
                                onClick={() => {
                                  setActionRequest(req);
                                  setActionType('reject');
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Rechazar
                              </Button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                              onClick={() => {
                                setActionRequest(req);
                                setActionType('deliver');
                              }}
                            >
                              <Package className="h-3.5 w-3.5 mr-1" />
                              Marcar Entregado
                            </Button>
                          )}
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

      {/* Modal de confirmación de acción */}
      <Dialog
        open={!!actionRequest && !!actionType}
        onOpenChange={() => {
          setActionRequest(null);
          setActionType(null);
          setRejectionReason('');
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {actionType === 'reject' && <XCircle className="h-5 w-5 text-red-600" />}
              {actionType === 'deliver' && <Package className="h-5 w-5 text-blue-600" />}
              {actionType === 'approve' && 'Aprobar Solicitud'}
              {actionType === 'reject' && 'Rechazar Solicitud'}
              {actionType === 'deliver' && 'Confirmar Entrega'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && `¿Aprobar la solicitud de ${NFC_TYPE_CONFIG[actionRequest?.nfc_type || 'sticker'].name} para ${actionRequest?.student_name}?`}
              {actionType === 'reject' && `¿Rechazar la solicitud de ${NFC_TYPE_CONFIG[actionRequest?.nfc_type || 'sticker'].name} para ${actionRequest?.student_name}?`}
              {actionType === 'deliver' && `¿Confirmar que se entregó el ${NFC_TYPE_CONFIG[actionRequest?.nfc_type || 'sticker'].name} a ${actionRequest?.student_name}?`}
            </DialogDescription>
          </DialogHeader>

          {actionRequest && (
            <div className="py-2 space-y-3">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-2xl">{NFC_TYPE_CONFIG[actionRequest.nfc_type].icon}</span>
                <div>
                  <p className="font-semibold text-sm">{actionRequest.student_name}</p>
                  <p className="text-xs text-gray-500">
                    {NFC_TYPE_CONFIG[actionRequest.nfc_type].name} — S/ {actionRequest.price?.toFixed(2)}
                  </p>
                </div>
              </div>

              {actionType === 'reject' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Motivo del rechazo (opcional)
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ej: Stock agotado, datos incorrectos..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setActionRequest(null);
                setActionType(null);
                setRejectionReason('');
              }}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={cn(
                actionType === 'approve' && 'bg-green-600 hover:bg-green-700',
                actionType === 'reject' && 'bg-red-600 hover:bg-red-700',
                actionType === 'deliver' && 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : actionType === 'approve' ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : actionType === 'reject' ? (
                <XCircle className="h-4 w-4 mr-2" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              {actionType === 'approve' && 'Confirmar Aprobación'}
              {actionType === 'reject' && 'Confirmar Rechazo'}
              {actionType === 'deliver' && 'Confirmar Entrega'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
