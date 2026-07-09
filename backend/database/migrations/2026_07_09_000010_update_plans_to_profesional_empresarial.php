<?php

use App\Models\Plan;
use App\Services\TenantProvisioner;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // "Basico" deja de ofrecerse a clientes nuevos; se desactiva pero no se borra
        // para no romper la referencia de las empresas que ya estuvieran en ese plan.
        DB::table('plans')->where('key', 'basico')->update(['active' => false]);

        DB::table('plans')->where('key', 'profesional')->update([
            'price' => 100, 'billing_period' => 'monthly', 'active' => true,
        ]);

        $profesional = DB::table('plans')->where('key', 'profesional')->first();
        Plan::updateOrCreate(['key' => 'profesional_anual'], [
            'name' => 'Profesional', 'price' => 700, 'billing_period' => 'yearly',
            'max_users' => $profesional->max_users, 'max_warehouses' => $profesional->max_warehouses,
            'active' => true,
        ]);

        // Las empresas que ya estaban en "basico" se quedan como estan (no se les
        // cambia el plan ni el precio); solo se oculta "basico" para clientes nuevos.
        TenantProvisioner::syncPlanPermissions();
    }

    public function down(): void
    {
        DB::table('plans')->where('key', 'basico')->update(['active' => true]);
        DB::table('plans')->where('key', 'profesional')->update(['price' => 89]);
        DB::table('plans')->where('key', 'profesional_anual')->delete();
    }
};
