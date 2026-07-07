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

        $tablesPermissionId = DB::table('permissions')->where('key', 'tables.manage')->value('id');
        if (!$tablesPermissionId) {
            return;
        }

        // Da acceso automatico a los roles que ya podian registrar ventas (Administrador/Cajero
        // en empresas existentes), para que el modulo quede usable sin tener que editar roles a mano.
        $roleIds = DB::table('permission_role')
            ->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')
            ->where('permissions.key', 'sales.create')
            ->pluck('permission_role.role_id');

        foreach ($roleIds as $roleId) {
            DB::table('permission_role')->insertOrIgnore([
                'role_id' => $roleId,
                'permission_id' => $tablesPermissionId,
            ]);
        }
    }

    public function down(): void
    {
        $tablesPermissionId = DB::table('permissions')->where('key', 'tables.manage')->value('id');
        if ($tablesPermissionId) {
            DB::table('permission_role')->where('permission_id', $tablesPermissionId)->delete();
            DB::table('permission_plan')->where('permission_id', $tablesPermissionId)->delete();
            DB::table('permissions')->where('id', $tablesPermissionId)->delete();
        }
    }
};
