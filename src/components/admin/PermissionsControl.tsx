import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, User, Save, RefreshCw, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  school_id: string;
  school?: {
    name: string;
    code: string;
  };
}

interface RolePermission {
  role: string;
  permission_id: string;
}

interface UserPermission {
  user_id: string;
  permission_id: string;
  granted: boolean;
}

const ROLES = [
  { value: 'admin_general', label: 'Admin General', color: 'bg-purple-500' },
  { value: 'pos', label: 'Cajero (POS)', color: 'bg-blue-500' },
  { value: 'comedor', label: 'Comedor', color: 'bg-green-500' },
  { value: 'parent', label: 'Padre de Familia', color: 'bg-orange-500' },
];

export default function PermissionsControl() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para pestaña de roles
  const [selectedRole, setSelectedRole] = useState('pos');
  const [rolePermsChanged, setRolePermsChanged] = useState(false);

  // Estado para pestaña de usuarios
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userPermsChanged, setUserPermsChanged] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar permisos
      const { data: permsData } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('name', { ascending: true });

      // Cargar permisos de roles
      const { data: rolePermsData } = await supabase
        .from('role_permissions')
        .select('role, permission_id');

      // Cargar permisos de usuarios
      const { data: userPermsData } = await supabase
        .from('user_permissions')
        .select('user_id, permission_id, granted');

      // Cargar usuarios (solo staff, no padres)
      const { data: usersData } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          school_id,
          school:schools!inner (
            name,
            code
          )
        `)
        .in('role', ['admin_general', 'pos', 'comedor'])
        .order('email');

      setPermissions(permsData || []);
      setRolePermissions(rolePermsData || []);
      setUserPermissions(userPermsData || []);
      setUsers((usersData || []).map(u => ({
        ...u,
        school: Array.isArray(u.school) ? u.school[0] : u.school
      })) as UserProfile[]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de permisos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Agrupar permisos por módulo
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Verificar si un rol tiene un permiso
  const roleHasPermission = (role: string, permissionId: string) => {
    return rolePermissions.some(
      rp => rp.role === role && rp.permission_id === permissionId
    );
  };

  // Verificar si un usuario tiene un permiso individual
  const userHasPermission = (userId: string, permissionId: string) => {
    const userPerm = userPermissions.find(
      up => up.user_id === userId && up.permission_id === permissionId
    );
    return userPerm ? userPerm.granted : null; // null = heredado del rol
  };

  // Toggle permiso de rol
  const toggleRolePermission = (role: string, permissionId: string) => {
    const exists = roleHasPermission(role, permissionId);
    if (exists) {
      setRolePermissions(
        rolePermissions.filter(
          rp => !(rp.role === role && rp.permission_id === permissionId)
        )
      );
    } else {
      setRolePermissions([...rolePermissions, { role, permission_id: permissionId }]);
    }
    setRolePermsChanged(true);
  };

  // Toggle permiso individual de usuario
  const toggleUserPermission = (userId: string, permissionId: string) => {
    const existingIndex = userPermissions.findIndex(
      up => up.user_id === userId && up.permission_id === permissionId
    );

    if (existingIndex >= 0) {
      const existing = userPermissions[existingIndex];
      // Ciclo: heredado -> otorgado -> revocado -> heredado
      if (existing.granted === null) {
        // Otorgar
        const updated = [...userPermissions];
        updated[existingIndex] = { ...existing, granted: true };
        setUserPermissions(updated);
      } else if (existing.granted === true) {
        // Revocar
        const updated = [...userPermissions];
        updated[existingIndex] = { ...existing, granted: false };
        setUserPermissions(updated);
      } else {
        // Volver a heredar (eliminar entrada)
        setUserPermissions(userPermissions.filter((_, i) => i !== existingIndex));
      }
    } else {
      // Crear nuevo permiso individual (otorgado)
      setUserPermissions([
        ...userPermissions,
        { user_id: userId, permission_id: permissionId, granted: true },
      ]);
    }
    setUserPermsChanged(true);
  };

  // Guardar permisos de rol
  const saveRolePermissions = async () => {
    try {
      // Eliminar permisos existentes del rol
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role', selectedRole);

      // Insertar nuevos permisos
      const permsToInsert = rolePermissions
        .filter(rp => rp.role === selectedRole)
        .map(rp => ({
          role: rp.role,
          permission_id: rp.permission_id,
        }));

      if (permsToInsert.length > 0) {
        await supabase.from('role_permissions').insert(permsToInsert);
      }

      toast({
        title: '✅ Permisos guardados',
        description: `Permisos del rol ${selectedRole} actualizados correctamente`,
      });

      setRolePermsChanged(false);
      fetchData();
    } catch (error) {
      console.error('Error al guardar permisos de rol:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los permisos',
        variant: 'destructive',
      });
    }
  };

  // Guardar permisos de usuario
  const saveUserPermissions = async () => {
    if (!selectedUser) return;

    try {
      // Eliminar permisos existentes del usuario
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUser);

      // Insertar nuevos permisos
      const permsToInsert = userPermissions
        .filter(up => up.user_id === selectedUser)
        .map(up => ({
          user_id: up.user_id,
          permission_id: up.permission_id,
          granted: up.granted,
        }));

      if (permsToInsert.length > 0) {
        await supabase.from('user_permissions').insert(permsToInsert);
      }

      toast({
        title: '✅ Permisos guardados',
        description: 'Permisos individuales actualizados correctamente',
      });

      setUserPermsChanged(false);
      fetchData();
    } catch (error) {
      console.error('Error al guardar permisos de usuario:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los permisos',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Control de Permisos</h1>
          <p className="text-muted-foreground">
            Gestiona permisos por rol y por usuario individual
          </p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="roles">
            <Users className="h-4 w-4 mr-2" />
            Por Rol
          </TabsTrigger>
          <TabsTrigger value="users">
            <User className="h-4 w-4 mr-2" />
            Por Usuario
          </TabsTrigger>
        </TabsList>

        {/* PESTAÑA: PERMISOS POR ROL */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Permisos por Rol</CardTitle>
              <CardDescription>
                Define qué permisos tiene cada rol del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selector de Rol */}
              <div className="flex items-center gap-4">
                <Label>Rol:</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${role.color}`} />
                          {role.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de Permisos por Módulo */}
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {Object.entries(permissionsByModule).map(([module, perms]) => (
                    <Card key={module}>
                      <CardHeader>
                        <CardTitle className="text-lg capitalize">{module}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {perms.map(perm => (
                          <div
                            key={perm.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={roleHasPermission(selectedRole, perm.id)}
                                onCheckedChange={() =>
                                  toggleRolePermission(selectedRole, perm.id)
                                }
                              />
                              <div>
                                <p className="font-medium text-sm">{perm.description}</p>
                                <code className="text-xs text-muted-foreground">
                                  {perm.name}
                                </code>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {/* Botón Guardar */}
              {rolePermsChanged && (
                <div className="flex gap-3">
                  <Button onClick={saveRolePermissions} className="gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      fetchData();
                      setRolePermsChanged(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA: PERMISOS POR USUARIO */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Permisos Individuales</CardTitle>
              <CardDescription>
                Otorga o revoca permisos específicos a usuarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selector de Usuario */}
              <div className="flex items-center gap-4">
                <Label>Usuario:</Label>
                <Select
                  value={selectedUser || ''}
                  onValueChange={setSelectedUser}
                >
                  <SelectTrigger className="w-96">
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {ROLES.find(r => r.value === user.role)?.label}
                          </Badge>
                          {user.full_name || user.email}
                          {user.school && (
                            <span className="text-xs text-muted-foreground">
                              - {user.school.name}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUser && (
                <>
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">
                      Leyenda de iconos:
                    </p>
                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 border-2 border-green-500 rounded flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded" />
                        </div>
                        <span>Otorgado</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 border-2 border-red-500 rounded flex items-center justify-center">
                          <Lock className="h-2 w-2 text-red-500" />
                        </div>
                        <span>Revocado</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 border-2 border-gray-400 rounded" />
                        <span>Heredado del rol</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Permisos */}
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-6">
                      {Object.entries(permissionsByModule).map(([module, perms]) => (
                        <Card key={module}>
                          <CardHeader>
                            <CardTitle className="text-lg capitalize">{module}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {perms.map(perm => {
                              const userPerm = userHasPermission(selectedUser, perm.id);
                              const user = users.find(u => u.id === selectedUser);
                              const roleHasPerm = user
                                ? roleHasPermission(user.role, perm.id)
                                : false;

                              return (
                                <div
                                  key={perm.id}
                                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                                >
                                  <div className="flex items-center gap-3">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        toggleUserPermission(selectedUser, perm.id)
                                      }
                                      className="w-8 h-8 p-0"
                                    >
                                      {userPerm === true ? (
                                        <Unlock className="h-4 w-4 text-green-600" />
                                      ) : userPerm === false ? (
                                        <Lock className="h-4 w-4 text-red-600" />
                                      ) : roleHasPerm ? (
                                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                      ) : (
                                        <div className="w-3 h-3 bg-gray-300 rounded-full" />
                                      )}
                                    </Button>
                                    <div>
                                      <p className="font-medium text-sm">
                                        {perm.description}
                                      </p>
                                      <code className="text-xs text-muted-foreground">
                                        {perm.name}
                                      </code>
                                    </div>
                                  </div>
                                  <div>
                                    {userPerm === true && (
                                      <Badge variant="default" className="bg-green-600">
                                        Otorgado
                                      </Badge>
                                    )}
                                    {userPerm === false && (
                                      <Badge variant="destructive">Revocado</Badge>
                                    )}
                                    {userPerm === null && roleHasPerm && (
                                      <Badge variant="secondary">Heredado</Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Botón Guardar */}
                  {userPermsChanged && (
                    <div className="flex gap-3">
                      <Button onClick={saveUserPermissions} className="gap-2">
                        <Save className="h-4 w-4" />
                        Guardar Cambios
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          fetchData();
                          setUserPermsChanged(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

