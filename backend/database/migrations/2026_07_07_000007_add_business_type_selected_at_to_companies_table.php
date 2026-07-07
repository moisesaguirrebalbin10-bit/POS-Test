<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->timestamp('business_type_selected_at')->nullable()->after('business_type');
        });

        // Las empresas que ya existian antes de este modulo ya venian usando el sistema
        // con un modo implicito; no deben ver el modal de bienvenida retroactivamente.
        DB::table('companies')->update(['business_type_selected_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('business_type_selected_at');
        });
    }
};
