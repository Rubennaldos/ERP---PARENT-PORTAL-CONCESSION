import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Loader2, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';

interface GatewayConfig {
  id: string;
  gateway_name: string;
  is_active: boolean;
  is_production: boolean;
  merchant_id: string | null;
  api_key: string | null;
  api_secret: string | null;
  webhook_secret: string | null;
  api_url: string | null;
  webhook_url: string | null;
  callback_url: string | null;
  settings: any;
  min_amount: number;
  max_amount: number;
  commission_percentage: number;
  commission_fixed: number;
}

export function PaymentGatewaysConfig() {
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_gateway_config')
        .select('*')
        .order('gateway_name');

      if (error) throw error;
      setGateways(data || []);
    } catch (error: any) {
      console.error('Error fetching gateways:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar las pasarelas',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (gateway: GatewayConfig) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('payment_gateway_config')
        .update({
          is_active: gateway.is_active,
          is_production: gateway.is_production,
          merchant_id: gateway.merchant_id || null,
          api_key: gateway.api_key || null,
          api_secret: gateway.api_secret || null,
          webhook_secret: gateway.webhook_secret || null,
          api_url: gateway.api_url || null,
          webhook_url: gateway.webhook_url || null,
          callback_url: gateway.callback_url || null,
          settings: gateway.settings,
          min_amount: gateway.min_amount,
          max_amount: gateway.max_amount,
          commission_percentage: gateway.commission_percentage,
          commission_fixed: gateway.commission_fixed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gateway.id);

      if (error) throw error;

      toast({
        title: '✅ Guardado',
        description: `Configuración de ${gateway.gateway_name} actualizada`,
      });

      fetchGateways();
    } catch (error: any) {
      console.error('Error saving gateway:', error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const updateGateway = (index: number, field: keyof GatewayConfig, value: any) => {
    const updated = [...gateways];
    updated[index] = { ...updated[index], [field]: value };
    setGateways(updated);
  };

  const toggleShowSecret = (gatewayName: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [gatewayName]: !prev[gatewayName]
    }));
  };

  const getGatewayInfo = (name: string) => {
    const info: Record<string, any> = {
      niubiz: {
        name: 'Niubiz (Visa)',
        description: 'Procesador de pagos de Visa Perú. Ideal para tarjetas de crédito/débito.',
        docs: 'https://www.niubiz.com.pe/',
        icon: '💳',
        recommended: true,
      },
      izipay: {
        name: 'Izipay',
        description: 'Pasarela peruana que soporta Yape, Plin y tarjetas.',
        docs: 'https://secure.micuentaweb.pe/',
        icon: '📱',
        recommended: true,
      },
      culqi: {
        name: 'Culqi',
        description: 'Pasarela moderna para tarjetas y otros métodos.',
        docs: 'https://www.culqi.com/',
        icon: '🔷',
        recommended: false,
      },
      mercadopago: {
        name: 'Mercado Pago',
        description: 'Múltiples métodos de pago, pero comisiones más altas.',
        docs: 'https://www.mercadopago.com.pe/',
        icon: '💰',
        recommended: false,
      },
      manual: {
        name: 'Pago Manual',
        description: 'Verificación manual por administrador (sin costo).',
        docs: null,
        icon: '✋',
        recommended: false,
      },
    };
    return info[name] || { name, description: '', docs: null, icon: '🔧' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>⚠️ Zona de Configuración Crítica:</strong> Las credenciales aquí ingresadas son sensibles. 
          Solo el programador o SuperAdmin debe tener acceso. El Admin General solo verá reportes.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue={gateways[0]?.gateway_name || 'manual'} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          {gateways.map((gateway) => {
            const info = getGatewayInfo(gateway.gateway_name);
            return (
              <TabsTrigger key={gateway.id} value={gateway.gateway_name}>
                <span className="mr-1">{info.icon}</span>
                {info.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {gateways.map((gateway, index) => {
          const info = getGatewayInfo(gateway.gateway_name);
          return (
            <TabsContent key={gateway.id} value={gateway.gateway_name}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{info.icon}</span>
                        {info.name}
                        {info.recommended && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-normal">
                            Recomendado
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2">{info.description}</CardDescription>
                    </div>
                    {info.docs && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(info.docs, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Documentación
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Estado */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-semibold">Pasarela Activa</Label>
                      <p className="text-sm text-muted-foreground">
                        {gateway.is_active 
                          ? 'Los padres pueden usar esta pasarela para recargar' 
                          : 'Pasarela desactivada, no disponible para los usuarios'}
                      </p>
                    </div>
                    <Switch
                      checked={gateway.is_active}
                      onCheckedChange={(checked) => updateGateway(index, 'is_active', checked)}
                    />
                  </div>

                  {/* Modo Producción */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-semibold">Modo Producción</Label>
                      <p className="text-sm text-muted-foreground">
                        {gateway.is_production 
                          ? '🔴 PAGOS REALES - Se procesarán transacciones con dinero real' 
                          : '🟡 MODO PRUEBA - Usa credenciales sandbox para testing'}
                      </p>
                    </div>
                    <Switch
                      checked={gateway.is_production}
                      onCheckedChange={(checked) => updateGateway(index, 'is_production', checked)}
                    />
                  </div>

                  {/* Credenciales */}
                  {gateway.gateway_name !== 'manual' && (
                    <div className="space-y-4 border-t pt-6">
                      <h3 className="font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Credenciales (Sensibles)
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Merchant ID / Public Key</Label>
                          <Input
                            type="text"
                            placeholder="Tu merchant ID"
                            value={gateway.merchant_id || ''}
                            onChange={(e) => updateGateway(index, 'merchant_id', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>API Key</Label>
                          <div className="relative">
                            <Input
                              type={showSecrets[gateway.gateway_name] ? 'text' : 'password'}
                              placeholder="Tu API key"
                              value={gateway.api_key || ''}
                              onChange={(e) => updateGateway(index, 'api_key', e.target.value)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => toggleShowSecret(gateway.gateway_name)}
                            >
                              {showSecrets[gateway.gateway_name] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>API Secret</Label>
                          <Input
                            type={showSecrets[gateway.gateway_name] ? 'text' : 'password'}
                            placeholder="Tu API secret"
                            value={gateway.api_secret || ''}
                            onChange={(e) => updateGateway(index, 'api_secret', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Webhook Secret</Label>
                          <Input
                            type={showSecrets[gateway.gateway_name] ? 'text' : 'password'}
                            placeholder="Tu webhook secret"
                            value={gateway.webhook_secret || ''}
                            onChange={(e) => updateGateway(index, 'webhook_secret', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* URLs */}
                  {gateway.gateway_name !== 'manual' && (
                    <div className="space-y-4 border-t pt-6">
                      <h3 className="font-semibold">URLs de Integración</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>API URL</Label>
                          <Input
                            type="url"
                            placeholder="https://api.example.com"
                            value={gateway.api_url || ''}
                            onChange={(e) => updateGateway(index, 'api_url', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Webhook URL (Para notificaciones de pago)</Label>
                          <Input
                            type="url"
                            placeholder="https://tu-proyecto.supabase.co/functions/v1/payment-webhook"
                            value={gateway.webhook_url || ''}
                            onChange={(e) => updateGateway(index, 'webhook_url', e.target.value)}
                            disabled
                          />
                          <p className="text-xs text-muted-foreground">
                            Esta URL se configura automáticamente cuando crees la Edge Function
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Límites y Comisiones */}
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="font-semibold">Límites y Comisiones</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Monto Mínimo (S/)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={gateway.min_amount}
                          onChange={(e) => updateGateway(index, 'min_amount', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Monto Máximo (S/)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={gateway.max_amount}
                          onChange={(e) => updateGateway(index, 'max_amount', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Comisión % (opcional)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={gateway.commission_percentage}
                          onChange={(e) => updateGateway(index, 'commission_percentage', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Comisión Fija S/ (opcional)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={gateway.commission_fixed}
                          onChange={(e) => updateGateway(index, 'commission_fixed', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Estas comisiones son informativas. Puedes decidir si las absorbes o las pasas al cliente.
                    </p>
                  </div>

                  {/* Botón Guardar */}
                  <Button
                    onClick={() => handleSave(gateway)}
                    disabled={saving}
                    className="w-full"
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Configuración
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

