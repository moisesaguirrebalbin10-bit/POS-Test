<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->boolean('voucher_show_logo')->default(true)->after('logo_path');
            $table->string('voucher_logo_size')->default('medium')->after('voucher_show_logo');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['voucher_show_logo', 'voucher_logo_size']);
        });
    }
};
