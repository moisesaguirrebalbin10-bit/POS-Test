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

        $inventoryPermissionId = DB::table('permissions')->where('key', 'inventory.manage')->value('id');
        if (!$inventoryPermissionId) {
            return;
        }

        // Da acceso automatico a los roles que ya podian gestionar mesas, para que el
        // modulo quede usable sin tener que editar roles a mano.
        $roleIds = DB::table('permission_role')
            ->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')
            ->where('permissions.key', 'tables.manage')
            ->pluck('permission_role.role_id');

        foreach ($roleIds as $roleId) {
            DB::table('permission_role')->insertOrIgnore([
                'role_id' => $roleId,
                'permission_id' => $inventoryPermissionId,
            ]);
        }
    }

    public function down(): void
    {
        $inventoryPermissionId = DB::table('permissions')->where('key', 'inventory.manage')->value('id');
        if ($inventoryPermissionId) {
            DB::table('permission_role')->where('permission_id', $inventoryPermissionId)->delete();
            DB::table('permission_plan')->where('permission_id', $inventoryPermissionId)->delete();
            DB::table('permissions')->where('id', $inventoryPermissionId)->delete();
        }
    }
};
