<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Company;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\User;
use App\Models\VoucherSequence;
use App\Models\Warehouse;
use App\Services\TenantProvisioner;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        TenantProvisioner::syncPermissionCatalog();

        $plans = [
            ['key' => 'basico', 'name' => 'Basico', 'price' => 49, 'max_users' => 2, 'max_warehouses' => 1],
            ['key' => 'profesional', 'name' => 'Profesional', 'price' => 89, 'max_users' => null, 'max_warehouses' => null],
            ['key' => 'empresarial', 'name' => 'Empresarial', 'price' => 0, 'max_users' => null, 'max_warehouses' => null],
        ];
        foreach ($plans as $plan) {
            Plan::updateOrCreate(['key' => $plan['key']], $plan);
        }
        TenantProvisioner::syncPlanPermissions();

        $company = Company::where('slug', 'chifa-dragon-de-oro')->first() ?? new Company();
        $company->fill([
            'name' => 'CHIFA DRAGON DE ORO', 'slug' => $company->slug ?: 'chifa-dragon-de-oro',
            'license_key' => $company->license_key ?: Company::generateLicenseKey(),
            'ruc' => '20600000000', 'phone' => '999 999 999',
            'address' => 'Av. Principal 123', 'slogan' => 'Gracias por su preferencia',
            'voucher_series' => 'CF-', 'voucher_start_number' => 1, 'status' => 'active',
            'plan_id' => Plan::where('key', 'profesional')->value('id'),
        ])->save();

        $roles = TenantProvisioner::provisionDefaultRoles($company);

        $user = User::firstOrCreate(
            ['email' => 'admin@poschifa.local'],
            ['name' => 'Administrador', 'password' => Hash::make('Admin12345'), 'active' => true, 'company_id' => $company->id]
        );
        $user->roles()->syncWithoutDetaching([$roles['admin']->id]);
        $company->update(['owner_user_id' => $user->id]);

        VoucherSequence::firstOrCreate(['company_id' => $company->id, 'series' => 'CF-'], ['current_number' => 0]);
        Subscription::firstOrCreate(['company_id' => $company->id], ['plan_id' => Plan::where('key', 'profesional')->value('id'), 'status' => 'active', 'current_period_start' => now()]);

        $mainWarehouse = Warehouse::firstOrCreate(['company_id' => $company->id, 'name' => 'Principal'], ['description' => 'Almacen principal']);
        $food = Category::firstOrCreate(['company_id' => $company->id, 'name' => 'Platos']);
        $drinks = Category::firstOrCreate(['company_id' => $company->id, 'name' => 'Bebidas']);

        Product::firstOrCreate(['company_id' => $company->id, 'sku' => 'CHAUFA-001'], ['name' => 'Arroz Chaufa', 'category_id' => $food->id, 'warehouse_id' => $mainWarehouse->id, 'sale_price' => 15, 'cost' => 7, 'stock' => 100, 'min_stock' => 10, 'active' => true, 'image_path' => 'assets/products/arroz-chaufa.png']);
        Product::firstOrCreate(['company_id' => $company->id, 'sku' => 'WANTAN-001'], ['name' => 'Wantan Frito', 'category_id' => $food->id, 'warehouse_id' => $mainWarehouse->id, 'sale_price' => 12, 'cost' => 5, 'stock' => 80, 'min_stock' => 10, 'active' => true, 'image_path' => 'assets/products/wantan-frito.png']);
        Product::firstOrCreate(['company_id' => $company->id, 'sku' => 'INKA-500'], ['name' => 'Inka Kola 500ml', 'category_id' => $drinks->id, 'warehouse_id' => $mainWarehouse->id, 'sale_price' => 8, 'cost' => 4, 'stock' => 60, 'min_stock' => 12, 'active' => true, 'image_path' => 'assets/products/inka-kola.png']);

        $this->call(PlatformAdminSeeder::class);
    }
}
