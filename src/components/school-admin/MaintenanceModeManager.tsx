import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Wrench, ShieldCheck, Plus, X, AlertTriangle, Eye } from 'lucide-react';

interface MaintenanceConfig {
  id: string;
  module_key: string;
  module_name: string;
  is_active: boolean;
  title: string;
  message: string;
  bypass_emails: string[];
  updated_at: string;
}

interface MaintenanceModeManagerProps {
  schoolId?: string | null;
}

export function MaintenanceModeManager({ schoolId }: MaintenanceModeManagerProps) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<MaintenanceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<MaintenanceConfig | null>(null);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('module_maintenance')
        .select('*')
        .order('module_name');

      if (error) throw error;
      setConfigs(data || []);
      if (data && data.length > 0) {
        setEditingConfig({ ...data[0] });
      }
    } catch (err: any) {
      console.error('Error loading maintenance configs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (config: MaintenanceConfig, newValue: boolean) => {
    setSaving(config.id);
    try {
      const { error } = await supabase
        .from('module_maintenance')
        .update({
          is_active: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;

      setConfigs(prev => prev.map(c => c.id === config.id ? { ...c, is_active: newValue } : c));
      if (editingConfig?.id === config.id) {
        setEditingConfig(prev => prev ? { ...prev, is_active: newValue } : prev);
      }

      toast({
        title: newValue ? '🔧 Mantenimiento activado' : '✅ Módulo restaurado',
        description: newValue
          ? `"${config.module_name}" ya no es visible para los padres (excepto correos bypass).`
          : `"${config.module_name}" ya está disponible para todos los padres.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cambiar el estado.' });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveMessage = async () => {
    if (!editingConfig) return;
    setSaving(editingConfig.id);
    try {
      const { error } = await supabase
        .from('module_maintenance')
        .update({
          title: editingConfig.title,
          message: editingConfig.message,
          bypass_emails: editingConfig.bypass_emails,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingConfig.id);

      if (error) throw error;

      setConfigs(prev => prev.map(c => c.id === editingConfig.id ? { ...editingConfig } : c));

      toast({
        title: '✅ Guardado',
        description: 'Configuración de mantenimiento actualizada.',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar.' });
    } finally {
      setSaving(null);
    }
  };

  const addBypassEmail = () => {
    if (!editingConfig || !newEmail.trim()) return;
    const email = newEmail.trim().toLowerCase();
    if (editingConfig.bypass_emails.includes(email)) {
      toast({ variant: 'destructive', title: 'Ya existe', description: 'Ese correo ya está en la lista.' });
      return;
    }
    setEditingConfig(prev => prev ? {
      ...prev,
      bypass_emails: [...prev.bypass_emails, email]
    } : prev);
    setNewEmail('');
  };

  const removeBypassEmail = (email: string) => {
    if (!editingConfig) return;
    setEditingConfig(prev => prev ? {
      ...prev,
      bypass_emails: prev.bypass_emails.filter(e => e !== email)
    } : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#9E4D68]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="h-5 w-5 text-[#9E4D68]" />
        <h3 className="text-base font-bold text-gray-800">Modo Mantenimiento por Módulo</h3>
      </div>

      <p className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
        💡 Activa el mantenimiento de un módulo para que los padres no puedan usarlo temporalmente. Agrega correos de <strong>prueba / bypass</strong> para que esos usuarios sí puedan ver el módulo aunque esté en mantenimiento.
      </p>

      {configs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Wrench className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No hay módulos configurados.</p>
          <p className="text-xs text-gray-400 mt-1">Ejecuta el SQL FIX_MODULE_MAINTENANCE.sql en Supabase</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card
              key={config.id}
              className={`border-2 cursor-pointer transition-all ${
                editingConfig?.id === config.id ? 'border-[#9E4D68] shadow-md' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setEditingConfig({ ...config })}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold text-gray-800">
                      {config.module_name}
                    </CardTitle>
                    <Badge
                      className={config.is_active
                        ? 'bg-red-100 text-red-700 border border-red-300 text-xs'
                        : 'bg-green-100 text-green-700 border border-green-300 text-xs'
                      }
                    >
                      {config.is_active ? '🔧 En Mantenimiento' : '✅ Activo'}
                    </Badge>
                    {config.bypass_emails.length > 0 && (
                      <Badge className="bg-purple-100 text-purple-700 border border-purple-300 text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        {config.bypass_emails.length} bypass
                      </Badge>
                    )}
                  </div>

                  {/* Toggle ON/OFF */}
                  <div className="flex items-center gap-2">
                    {saving === config.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Label className="text-xs text-gray-500">
                          {config.is_active ? 'Desactivar' : 'Activar'}
                        </Label>
                        <Switch
                          checked={config.is_active}
                          onCheckedChange={(val) => {
                            handleToggle(config, val);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-red-500"
                        />
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Panel de edición del módulo seleccionado */}
      {editingConfig && (
        <Card className="border-2 border-[#9E4D68]/30 bg-[#9E4D68]/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-[#9E4D68] flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Editar: {editingConfig.module_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            {/* Título de la pantalla de mantenimiento */}
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                Título que ven los padres
              </Label>
              <Input
                value={editingConfig.title}
                onChange={(e) => setEditingConfig(prev => prev ? { ...prev, title: e.target.value } : prev)}
                placeholder="🔧 Módulo en Mantenimiento"
                className="text-sm"
              />
            </div>

            {/* Mensaje de la pantalla de mantenimiento */}
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                Mensaje para los padres
              </Label>
              <Textarea
                value={editingConfig.message}
                onChange={(e) => setEditingConfig(prev => prev ? { ...prev, message: e.target.value } : prev)}
                placeholder="Mensaje que verán los padres..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            {/* Correos que pueden saltarse el mantenimiento */}
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1 block flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                Correos que ven el módulo aunque esté en mantenimiento (bypass)
              </Label>

              {/* Lista de correos bypass */}
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {editingConfig.bypass_emails.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">Sin correos bypass</span>
                ) : (
                  editingConfig.bypass_emails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-1 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full border border-purple-200"
                    >
                      <Eye className="h-3 w-3" />
                      <span>{email}</span>
                      <button
                        onClick={() => removeBypassEmail(email)}
                        className="hover:text-red-600 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Agregar correo */}
              <div className="flex gap-2">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addBypassEmail()}
                  placeholder="correo@ejemplo.com"
                  className="text-sm flex-1"
                  type="email"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addBypassEmail}
                  disabled={!newEmail.trim()}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Estos correos pueden ver y usar el módulo aunque esté en mantenimiento. Ideal para pruebas.
              </p>
            </div>

            {/* Alerta si está activo */}
            {editingConfig.is_active && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">
                  <strong>⚠️ Mantenimiento ACTIVO:</strong> Los padres que no estén en la lista bypass verán la pantalla de mantenimiento en lugar del módulo.
                </p>
              </div>
            )}

            {/* Botón guardar */}
            <Button
              onClick={handleSaveMessage}
              disabled={saving === editingConfig.id}
              className="w-full bg-[#9E4D68] hover:bg-[#7d3d54]"
            >
              {saving === editingConfig.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                '💾 Guardar Configuración'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
