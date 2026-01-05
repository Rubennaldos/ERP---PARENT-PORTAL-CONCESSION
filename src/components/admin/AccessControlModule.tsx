import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Lock, Users, Shield, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Loader2, Building2, UserPlus } from "lucide-react";
import { CreateProfileModal } from './CreateProfileModal';

interface School {
  id: string;
  name: string;
  code: string;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  name: string;
  description: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  school_id: string | null;
  school: { name: string; code: string } | null;
}

interface RolePermissionState {
  [permissionName: string]: boolean;
}

interface UserPermissionOverrideState {
  [permissionName: string]: 'granted' | 'revoked' | 'inherited';
}

const ROLES = [
  { value: 'supervisor_red', label: 'Supervisor de Red', icon: '🌐', description: 'Auditor multi-sede' },
  { value: 'gestor_unidad', label: 'Gestor de Unidad', icon: '🏢', description: 'Administrador de sede' },
  { value: 'operador_caja', label: 'Operador de Caja', icon: '💰', description: 'Cajero' },
  { value: 'operador_cocina', label: 'Operador de Cocina', icon: '👨‍🍳', description: 'Personal de cocina' },
];

export const AccessControlModule = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'users'
  const [createProfileModalOpen, setCreateProfileModalOpen] = useState(false);

  // State for Role Permissions Tab
  const [selectedRole, setSelectedRole] = useState<string>('operador_caja');
  const [rolePermissions, setRolePermissions] = useState<RolePermissionState>({});
  const [savingRolePermissions, setSavingRolePermissions] = useState(false);

  // State for User Permissions Tab
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userPermissionOverrides, setUserPermissionOverrides] = useState<UserPermissionOverrideState>({});
  const [savingUserPermissions, setSavingUserPermissions] = useState(false);
  const [userBasePermissions, setUserBasePermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (permissions.length > 0 && selectedRole) {
      fetchRolePermissions(selectedRole);
    }
  }, [selectedRole, permissions]);

  useEffect(() => {
    if (permissions.length > 0 && selectedUser) {
      fetchUserPermissionOverrides(selectedUser.id, selectedUser.role);
    }
  }, [selectedUser, permissions]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch permissions
      const { data: permsData, error: permsError } = await supabase
        .from('permissions')
        .select('*')
        .order('module')
        .order('action');
      
      if (permsError) throw permsError;
      setPermissions(permsData || []);

      // Fetch schools
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .order('name');
      
      if (schoolsError) throw schoolsError;
      setSchools(schoolsData || []);

      // Fetch users (staff only)
      await fetchUsers();

    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          school_id,
          school:schools(name, code)
        `)
        .in('role', ['supervisor_red', 'gestor_unidad', 'operador_caja', 'operador_cocina']);
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los usuarios.' });
    }
  };

  const fetchRolePermissions = async (role: string) => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id, granted, permissions(name)')
        .eq('role', role);
      
      if (error) throw error;

      const currentRolePerms: RolePermissionState = {};
      permissions.forEach(p => {
        const rolePerm = data?.find(rp => rp.permissions?.name === p.name);
        currentRolePerms[p.name] = rolePerm?.granted || false;
      });
      setRolePermissions(currentRolePerms);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los permisos del rol.' });
    }
  };

  const fetchUserPermissionOverrides = async (userId: string, userRole: string) => {
    try {
      // Get base permissions from role
      const { data: baseRolePerms, error: baseRolePermsError } = await supabase
        .from('role_permissions')
        .select('permission_id, granted, permissions(name)')
        .eq('role', userRole);
      
      if (baseRolePermsError) throw baseRolePermsError;
      
      const basePermsSet = new Set(
        baseRolePerms.filter(rp => rp.granted).map(rp => rp.permissions?.name).filter(Boolean) as string[]
      );
      setUserBasePermissions(basePermsSet);

      // Get user-specific overrides
      const { data: overrides, error: overridesError } = await supabase
        .from('user_permissions')
        .select('permission_id, granted, permissions(name)')
        .eq('user_id', userId);
      
      if (overridesError) throw overridesError;

      const currentUserOverrides: UserPermissionOverrideState = {};
      permissions.forEach(p => {
        const override = overrides?.find(o => o.permissions?.name === p.name);
        if (override) {
          currentUserOverrides[p.name] = override.granted ? 'granted' : 'revoked';
        } else {
          currentUserOverrides[p.name] = 'inherited';
        }
      });
      setUserPermissionOverrides(currentUserOverrides);
    } catch (error) {
      console.error('Error fetching user permission overrides:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los permisos del usuario.' });
    }
  };

  const handleRolePermissionChange = (permissionName: string, checked: boolean) => {
    setRolePermissions(prev => ({ ...prev, [permissionName]: checked }));
  };

  const handleUserPermissionOverrideChange = (permissionName: string, type: 'grant' | 'revoke' | 'inherit') => {
    setUserPermissionOverrides(prev => ({ 
      ...prev, 
      [permissionName]: type === 'grant' ? 'granted' : type === 'revoke' ? 'revoked' : 'inherited' 
    }));
  };

  const saveRolePermissions = async () => {
    setSavingRolePermissions(true);
    try {
      // Delete existing role permissions
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role', selectedRole);
      
      if (deleteError) throw deleteError;

      // Insert new role permissions
      const permissionsToInsert = permissions
        .filter(p => rolePermissions[p.name])
        .map(p => ({ role: selectedRole, permission_id: p.id, granted: true }));

      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);
        
        if (insertError) throw insertError;
      }

      toast({ 
        title: '✅ Permisos de Rol Actualizados', 
        description: `Los permisos para el rol "${ROLES.find(r => r.value === selectedRole)?.label}" han sido guardados.` 
      });
    } catch (error) {
      console.error('Error saving role permissions:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar los permisos del rol.' });
    } finally {
      setSavingRolePermissions(false);
    }
  };

  const saveUserPermissionOverrides = async () => {
    if (!selectedUser) return;
    setSavingUserPermissions(true);
    try {
      // Delete existing user overrides
      const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUser.id);
      
      if (deleteError) throw deleteError;

      // Insert new overrides
      const overridesToInsert = permissions
        .filter(p => userPermissionOverrides[p.name] !== 'inherited')
        .map(p => ({
          user_id: selectedUser.id,
          permission_id: p.id,
          granted: userPermissionOverrides[p.name] === 'granted',
        }));

      if (overridesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_permissions')
          .insert(overridesToInsert);
        
        if (insertError) throw insertError;
      }

      toast({ 
        title: '✅ Permisos de Usuario Guardados', 
        description: `Los permisos personalizados para "${selectedUser.email}" han sido actualizados.` 
      });
    } catch (error) {
      console.error('Error saving user permissions:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar los permisos del usuario.' });
    } finally {
      setSavingUserPermissions(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando sistema de permisos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón Crear Perfil */}
      <div className="flex justify-end">
        <Button 
          onClick={() => setCreateProfileModalOpen(true)}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Crear Nuevo Perfil
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Control de Acceso y Permisos
          </CardTitle>
          <CardDescription>
            Gestiona permisos granulares por rol y usuario. Define qué puede hacer cada persona en cada módulo del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permisos por Rol
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Permisos por Usuario
              </TabsTrigger>
            </TabsList>

            {/* TAB: Permisos por Rol */}
            <TabsContent value="roles" className="mt-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <Label htmlFor="select-role" className="text-base font-semibold text-blue-900">Seleccionar Rol:</Label>
                  <p className="text-sm text-blue-700">Define los permisos por defecto que tendrá este rol en todo el sistema.</p>
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="select-role" className="w-[280px]">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <span>{role.icon}</span>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{role.label}</span>
                            <span className="text-xs text-muted-foreground">{role.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([moduleName, modulePerms]) => (
                  <Card key={moduleName} className="border-l-4 border-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg uppercase">{moduleName}</CardTitle>
                      <CardDescription>
                        Define qué acciones puede realizar este rol en el módulo de {moduleName}.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {modulePerms.map(perm => (
                        <div key={perm.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent">
                          <Checkbox
                            id={`role-perm-${perm.id}`}
                            checked={rolePermissions[perm.name] || false}
                            onCheckedChange={(checked: boolean) => handleRolePermissionChange(perm.name, checked)}
                          />
                          <Label htmlFor={`role-perm-${perm.id}`} className="flex flex-col cursor-pointer flex-1">
                            <span className="font-medium">{perm.action}</span>
                            <span className="text-xs text-muted-foreground">{perm.description}</span>
                          </Label>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button 
                onClick={saveRolePermissions} 
                disabled={savingRolePermissions} 
                className="w-full"
                size="lg"
              >
                {savingRolePermissions ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Guardar Permisos de Rol
                  </>
                )}
              </Button>
            </TabsContent>

            {/* TAB: Permisos por Usuario */}
            <TabsContent value="users" className="mt-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
                <div className="flex-1">
                  <Label htmlFor="select-user" className="text-base font-semibold text-purple-900">Seleccionar Usuario:</Label>
                  <p className="text-sm text-purple-700">Personaliza los permisos específicos para un usuario individual.</p>
                </div>
                <Select
                  value={selectedUser?.id || ''}
                  onValueChange={(userId) => setSelectedUser(users.find(u => u.id === userId) || null)}
                >
                  <SelectTrigger id="select-user" className="w-[320px]">
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{user.email}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{ROLES.find(r => r.value === user.role)?.icon}</span>
                            <span>{ROLES.find(r => r.value === user.role)?.label || user.role}</span>
                            {user.school && (
                              <>
                                <span>•</span>
                                <Building2 className="h-3 w-3" />
                                <span>{user.school.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUser && (
                <div className="space-y-6">
                  {/* Permisos Base del Rol */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Permisos Base del Rol: {ROLES.find(r => r.value === selectedUser.role)?.label}
                      </CardTitle>
                      <CardDescription className="text-blue-700">
                        Estos son los permisos que {selectedUser.email} hereda automáticamente de su rol.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {permissions.map(perm => {
                        const hasBase = userBasePermissions.has(perm.name);
                        if (!hasBase) return null;
                        return (
                          <div key={perm.id} className="flex items-center space-x-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-blue-900">{perm.module}.{perm.action}</span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Overrides Personalizados */}
                  <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([moduleName, modulePerms]) => (
                      <Card key={moduleName} className="border-l-4 border-purple-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg uppercase">{moduleName}</CardTitle>
                          <CardDescription>
                            Personaliza los permisos de {selectedUser.email} para este módulo.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-4">
                          {modulePerms.map(perm => {
                            const overrideStatus = userPermissionOverrides[perm.name];
                            const isBaseGranted = userBasePermissions.has(perm.name);

                            return (
                              <div key={perm.id} className="flex flex-col space-y-2 p-3 border rounded-lg">
                                <div>
                                  <Label className="font-medium">{perm.action}</Label>
                                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant={overrideStatus === 'granted' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleUserPermissionOverrideChange(perm.name, 'grant')}
                                    className={overrideStatus === 'granted' ? 'bg-green-500 hover:bg-green-600' : ''}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" /> Otorgar
                                  </Button>
                                  <Button
                                    variant={overrideStatus === 'revoked' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleUserPermissionOverrideChange(perm.name, 'revoke')}
                                    className={overrideStatus === 'revoked' ? 'bg-red-500 hover:bg-red-600' : ''}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Revocar
                                  </Button>
                                  <Button
                                    variant={overrideStatus === 'inherited' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleUserPermissionOverrideChange(perm.name, 'inherit')}
                                    className={overrideStatus === 'inherited' ? 'bg-gray-500 hover:bg-gray-600' : ''}
                                  >
                                    <Lock className="h-4 w-4 mr-1" /> Heredar ({isBaseGranted ? 'Sí' : 'No'})
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button 
                    onClick={saveUserPermissionOverrides} 
                    disabled={savingUserPermissions} 
                    className="w-full"
                    size="lg"
                  >
                    {savingUserPermissions ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Guardar Permisos Personalizados
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Creación de Perfiles */}
      <CreateProfileModal 
        open={createProfileModalOpen}
        onOpenChange={setCreateProfileModalOpen}
        onSuccess={() => {
          fetchUsers(); // Recargar lista de usuarios
          toast({
            title: '✅ Perfil creado',
            description: 'El nuevo perfil ha sido agregado exitosamente.',
          });
        }}
      />
    </div>
  );
};

