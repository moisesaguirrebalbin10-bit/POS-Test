<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurant_table_reservations', function (Blueprint $table) {
            $table->string('customer_dni', 20)->nullable()->after('customer_phone');
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_table_reservations', function (Blueprint $table) {
            $table->dropColumn('customer_dni');
        });
    }
};
