<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Permission;
use App\Models\Plan;
use App\Models\Role;

class TenantProvisioner
{
    private const BASICO_EXCLUDED = ['reports.export', 'devices.manage', 'logs.view', 'roles.create', 'roles.update', 'roles.delete'];

    public static function permissionRows(): array
    {
        return [
            ['dashboard.view', 'Dashboard', 'Ver dashboard'],
            ['users.view', 'Usuarios', 'Ver usuarios'],
            ['users.create', 'Usuarios', 'Crear usuarios'],
            ['users.update', 'Usuarios', 'Editar usuarios'],
            ['users.delete', 'Usuarios', 'Eliminar usuarios'],
            ['roles.view', 'Roles', 'Ver roles'],
            ['roles.create', 'Roles', 'Crear roles'],
            ['roles.update', 'Roles', 'Editar roles'],
            ['roles.delete', 'Roles', 'Eliminar roles'],
            ['settings.view', 'Empresa', 'Ver configuracion'],
            ['settings.update', 'Empresa', 'Editar configuracion'],
            ['warehouses.view', 'Almacenes', 'Ver almacenes'],
            ['warehouses.create', 'Almacenes', 'Crear almacenes'],
            ['warehouses.update', 'Almacenes', 'Editar almacenes'],
            ['warehouses.delete', 'Almacenes', 'Eliminar almacenes'],
            ['warehouses.transfer', 'Almacenes', 'Transferir stock'],
            ['products.view', 'Productos', 'Ver productos'],
            ['products.create', 'Productos', 'Crear productos'],
            ['products.update', 'Productos', 'Editar productos'],
            ['products.delete', 'Productos', 'Eliminar productos'],
            ['sales.view', 'Ventas', 'Ver ventas'],
            ['sales.create', 'Ventas', 'Registrar ventas'],
            ['cash.view', 'Caja', 'Ver caja'],
            ['cash.open', 'Caja', 'Abrir caja'],
            ['cash.close', 'Caja', 'Cerrar caja'],
            ['cash.update', 'Caja', 'Editar caja'],
            ['cash.override', 'Caja', 'Editar caja cerrada'],
            ['movements.view', 'Ingresos/Egresos', 'Ver movimientos'],
            ['movements.create', 'Ingresos/Egresos', 'Crear movimientos'],
            ['movements.update', 'Ingresos/Egresos', 'Editar movimientos'],
            ['movements.delete', 'Ingresos/Egresos', 'Eliminar movimientos'],
            ['reports.view', 'Reportes', 'Ver reportes'],
            ['reports.export', 'Reportes', 'Exportar reportes'],
            ['logs.view', 'Registros', 'Ver registros de actividad'],
            ['devices.manage', 'Equipos', 'Configurar impresoras'],
        ];
    }

    public static function syncPermissionCatalog(): void
    {
        collect(self::permissionRows())->each(fn ($row) => Permission::updateOrCreate(
            ['key' => $row[0]],
            ['module' => $row[1], 'label' => $row[2]]
        ));
    }

    public static function syncPlanPermissions(): void
    {
        $allPermissionIds = Permission::pluck('id');
        $basicoIds = Permission::whereNotIn('key', self::BASICO_EXCLUDED)->pluck('id');

        Plan::all()->each(function (Plan $plan) use ($allPermissionIds, $basicoIds) {
            $plan->permissions()->sync($plan->key === 'basico' ? $basicoIds : $allPermissionIds);
        });
    }

    /**
     * @return array<string, Role>
     */
    public static function provisionDefaultRoles(Company $company): array
    {
        app()->instance('currentCompanyId', $company->id);

        $admin = Role::firstOrCreate(['company_id' => $company->id, 'name' => 'Administrador'], ['description' => 'Acceso total']);
        $cashier = Role::firstOrCreate(['company_id' => $company->id, 'name' => 'Cajero'], ['description' => 'Ventas y caja']);
        $warehouse = Role::firstOrCreate(['company_id' => $company->id, 'name' => 'Almacen'], ['description' => 'Inventario y stock']);
        $supervisor = Role::firstOrCreate(['company_id' => $company->id, 'name' => 'Supervisor'], ['description' => 'Reportes y supervision']);

        $admin->permissions()->sync(Permission::pluck('id'));
        $cashier->permissions()->sync(Permission::whereIn('key', ['dashboard.view', 'products.view', 'sales.view', 'sales.create', 'cash.view', 'cash.open', 'cash.close', 'movements.view', 'movements.create'])->pluck('id'));
        $warehouse->permissions()->sync(Permission::whereIn('key', ['dashboard.view', 'products.view', 'products.create', 'products.update', 'warehouses.view', 'warehouses.update', 'warehouses.transfer'])->pluck('id'));
        $supervisor->permissions()->sync(Permission::whereIn('key', ['dashboard.view', 'reports.view', 'reports.export', 'sales.view', 'products.view', 'cash.view', 'movements.view'])->pluck('id'));

        return compact('admin', 'cashier', 'warehouse', 'supervisor');
    }
}
