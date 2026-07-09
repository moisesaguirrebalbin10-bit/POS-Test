<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('type', 20)->nullable()->after('category_id');
            $table->string('area_preparacion', 20)->nullable()->after('type');
        });

        // Los platos (modo Restaurante) no siempre se controlan por almacen/stock.
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE products ALTER COLUMN warehouse_id DROP NOT NULL');
        }

        // Los productos ya existentes de empresas en modo Restaurante pasan a ser Platos por defecto.
        DB::table('products')
            ->whereIn('company_id', DB::table('companies')->where('business_type', 'restaurant')->pluck('id'))
            ->update(['type' => 'plato']);
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE products ALTER COLUMN warehouse_id SET NOT NULL');
        }

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['type', 'area_preparacion']);
        });
    }
};
