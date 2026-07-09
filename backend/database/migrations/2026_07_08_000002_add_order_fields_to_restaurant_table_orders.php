<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurant_table_orders', function (Blueprint $table) {
            $table->string('type')->default('mesa')->after('restaurant_table_id'); // mesa | para_llevar | delivery
            $table->string('customer_phone')->nullable()->after('customer_name');
            $table->string('delivery_address')->nullable()->after('customer_phone');
            $table->text('notes')->nullable()->after('delivery_address');
            $table->foreignId('created_by')->nullable()->after('sale_id')->constrained('users')->nullOnDelete();
        });

        // Para llevar y Delivery no tienen mesa asociada.
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE restaurant_table_orders ALTER COLUMN restaurant_table_id DROP NOT NULL');
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE restaurant_table_orders ALTER COLUMN restaurant_table_id SET NOT NULL');
        }

        Schema::table('restaurant_table_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['type', 'customer_phone', 'delivery_address', 'notes']);
        });
    }
};
