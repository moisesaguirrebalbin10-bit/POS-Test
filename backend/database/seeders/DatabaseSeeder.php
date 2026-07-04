<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\CompanySetting;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use App\Models\VoucherSequence;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $permissionRows = [
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

        $permissions = collect($permissionRows)->map(fn ($row) => Permission::updateOrCreate(
            ['key' => $row[0]],
            ['module' => $row[1], 'label' => $row[2]]
        ));

        $legacyMap = [
            'users.manage' => ['users.view', 'users.create', 'users.update', 'users.delete'],
            'roles.manage' => ['roles.view', 'roles.create', 'roles.update', 'roles.delete'],
            'settings.manage' => ['settings.update'],
            'warehouses.manage' => ['warehouses.view', 'warehouses.create', 'warehouses.update', 'warehouses.delete', 'warehouses.transfer'],
            'products.manage' => ['products.view', 'products.create', 'products.update', 'products.delete'],
            'sales.manage' => ['sales.view', 'sales.create'],
            'cash.manage' => ['cash.view', 'cash.open', 'cash.close', 'cash.update', 'movements.view', 'movements.create', 'movements.update', 'movements.delete'],
        ];

        foreach ($legacyMap as $legacyKey => $newKeys) {
            $legacy = Permission::where('key', $legacyKey)->first();
            if (!$legacy) {
                continue;
            }

            $newIds = Permission::whereIn('key', $newKeys)->pluck('id')->all();
            foreach ($legacy->roles as $role) {
                $role->permissions()->syncWithoutDetaching($newIds);
                $role->permissions()->detach($legacy->id);
            }
            $legacy->delete();
        }

        $admin = Role::firstOrCreate(['name' => 'Administrador'], ['description' => 'Acceso total']);
        $cashier = Role::firstOrCreate(['name' => 'Cajero'], ['description' => 'Ventas y caja']);
        $warehouse = Role::firstOrCreate(['name' => 'Almacen'], ['description' => 'Inventario y stock']);
        $supervisor = Role::firstOrCreate(['name' => 'Supervisor'], ['description' => 'Reportes y supervision']);

        $admin->permissions()->sync($permissions->pluck('id'));
        $cashier->permissions()->sync(Permission::whereIn('key', ['dashboard.view', 'products.view', 'sales.view', 'sales.create', 'cash.view', 'cash.open', 'cash.close', 'movements.view', 'movements.create'])->pluck('id'));
        $warehouse->permissions()->sync(Permission::whereIn('key', ['dashboard.view', 'products.view', 'products.create', 'products.update', 'warehouses.view', 'warehouses.update', 'warehouses.transfer'])->pluck('id'));
        $supervisor->permissions()->sync(Permission::whereIn('key', ['dashboard.view', 'reports.view', 'reports.export', 'sales.view', 'products.view', 'cash.view', 'movements.view'])->pluck('id'));

        $user = User::firstOrCreate(
            ['email' => 'admin@poschifa.local'],
            ['name' => 'Administrador', 'password' => Hash::make('Admin12345'), 'active' => true]
        );
        $user->roles()->syncWithoutDetaching([$admin->id]);

        CompanySetting::firstOrCreate([], [
            'name' => 'CHIFA DRAGON DE ORO', 'ruc' => '20600000000', 'phone' => '999 999 999',
            'address' => 'Av. Principal 123', 'slogan' => 'Gracias por su preferencia',
            'voucher_series' => 'CF-', 'voucher_start_number' => 1,
        ]);
        VoucherSequence::firstOrCreate(['series' => 'CF-'], ['current_number' => 0]);

        $mainWarehouse = Warehouse::firstOrCreate(['name' => 'Principal'], ['description' => 'Almacen principal']);
        $food = Category::firstOrCreate(['name' => 'Platos']);
        $drinks = Category::firstOrCreate(['name' => 'Bebidas']);

        Product::firstOrCreate(['sku' => 'CHAUFA-001'], ['name' => 'Arroz Chaufa', 'category_id' => $food->id, 'warehouse_id' => $mainWarehouse->id, 'sale_price' => 15, 'cost' => 7, 'stock' => 100, 'min_stock' => 10, 'active' => true, 'image_path' => 'assets/products/arroz-chaufa.png']);
        Product::firstOrCreate(['sku' => 'WANTAN-001'], ['name' => 'Wantan Frito', 'category_id' => $food->id, 'warehouse_id' => $mainWarehouse->id, 'sale_price' => 12, 'cost' => 5, 'stock' => 80, 'min_stock' => 10, 'active' => true, 'image_path' => 'assets/products/wantan-frito.png']);
        Product::firstOrCreate(['sku' => 'INKA-500'], ['name' => 'Inka Kola 500ml', 'category_id' => $drinks->id, 'warehouse_id' => $mainWarehouse->id, 'sale_price' => 8, 'cost' => 4, 'stock' => 60, 'min_stock' => 12, 'active' => true, 'image_path' => 'assets/products/inka-kola.png']);
    }
}