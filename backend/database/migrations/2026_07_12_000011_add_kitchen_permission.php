<?php

use App\Services\TenantProvisioner;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        TenantProvisioner::syncPermissionCatalog();
        TenantProvisioner::syncPlanPermissions();

        $kitchenPermissionId = DB::table('permissions')->where('key', 'kitchen.view')->value('id');
        if (!$kitchenPermissionId) {
            return;
        }

        // Da acceso automatico a los roles que ya podian gestionar mesas (y por lo tanto
        // ya podian usar la pantalla de cocina antes de que existiera este permiso propio),
        // para que nadie pierda acceso al separar el permiso.
        $roleIds = DB::table('permission_role')
            ->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')
            ->where('permissions.key', 'tables.manage')
            ->pluck('permission_role.role_id');

        foreach ($roleIds as $roleId) {
            DB::table('permission_role')->insertOrIgnore([
                'role_id' => $roleId,
                'permission_id' => $kitchenPermissionId,
            ]);
        }
    }

    public function down(): void
    {
        $kitchenPermissionId = DB::table('permissions')->where('key', 'kitchen.view')->value('id');
        if ($kitchenPermissionId) {
            DB::table('permission_role')->where('permission_id', $kitchenPermissionId)->delete();
            DB::table('permission_plan')->where('permission_id', $kitchenPermissionId)->delete();
            DB::table('permissions')->where('id', $kitchenPermissionId)->delete();
        }
    }
};
