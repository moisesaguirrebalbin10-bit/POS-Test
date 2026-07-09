<?php

namespace Database\Seeders;

use App\Models\PlatformAdmin;
use App\Models\PlatformPermission;
use App\Models\PlatformRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PlatformAdminSeeder extends Seeder
{
    public function run(): void
    {
        $permissionRows = [
            ['companies.view', 'Empresas', 'Ver empresas'],
            ['companies.manage', 'Empresas', 'Suspender/reactivar empresas'],
            ['plans.view', 'Planes', 'Ver planes'],
            ['plans.manage', 'Planes', 'Editar precios y limites de planes'],
            ['billing.view', 'Facturacion', 'Ver pagos e ingresos'],
            ['staff.manage', 'Staff', 'Administrar staff y sus roles'],
            ['logs.view', 'Registros', 'Ver registros de actividad de todas las empresas'],
        ];

        $permissions = collect($permissionRows)->map(fn ($row) => PlatformPermission::updateOrCreate(
            ['key' => $row[0]],
            ['module' => $row[1], 'label' => $row[2]]
        ));

        $superAdmin = PlatformRole::firstOrCreate(['name' => 'Super Admin'], ['description' => 'Acceso total al panel']);
        $support = PlatformRole::firstOrCreate(['name' => 'Soporte'], ['description' => 'Ver empresas y registros de actividad']);
        $sales = PlatformRole::firstOrCreate(['name' => 'Ventas'], ['description' => 'Ver empresas y facturacion']);

        $superAdmin->permissions()->sync($permissions->pluck('id'));
        $support->permissions()->sync(PlatformPermission::whereIn('key', ['companies.view', 'logs.view'])->pluck('id'));
        $sales->permissions()->sync(PlatformPermission::whereIn('key', ['companies.view', 'billing.view'])->pluck('id'));

        $admin = PlatformAdmin::firstOrCreate(
            ['email' => 'jhordyaguirrebalbin@gmail.com'],
            ['name' => 'Jhordy Aguirre', 'password' => Hash::make('OptiUsoAdmin2026!'), 'active' => true]
        );
        $admin->roles()->syncWithoutDetaching([$superAdmin->id]);
    }
}
