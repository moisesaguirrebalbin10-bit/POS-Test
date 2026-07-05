<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    private array $tenantTables = [
        'users', 'roles', 'warehouses', 'categories', 'products', 'stock_movements',
        'cash_registers', 'sales', 'sale_items', 'cash_movements', 'expenses_income',
        'activity_logs', 'voucher_sequences',
    ];

    public function up(): void
    {
        foreach ($this->tenantTables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreignId('company_id')->nullable()->constrained()->cascadeOnDelete();
            });
        }

        $settings = Schema::hasTable('company_settings') ? DB::table('company_settings')->first() : null;

        $companyId = DB::table('companies')->insertGetId([
            'name' => $settings->name ?? 'Mi Empresa',
            'slug' => Str::slug($settings->name ?? 'mi-empresa') . '-' . Str::random(6),
            'ruc' => $settings->ruc ?? null,
            'phone' => $settings->phone ?? null,
            'address' => $settings->address ?? null,
            'slogan' => $settings->slogan ?? 'Gracias por su preferencia',
            'logo_path' => $settings->logo_path ?? null,
            'igv_percent' => $settings->igv_percent ?? 18,
            'tip_enabled' => $settings->tip_enabled ?? false,
            'default_tip' => $settings->default_tip ?? 0,
            'voucher_series' => $settings->voucher_series ?? 'CF-',
            'voucher_start_number' => $settings->voucher_start_number ?? 1,
            'ticket_width' => $settings->ticket_width ?? '80',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($this->tenantTables as $table) {
            DB::table($table)->update(['company_id' => $companyId]);
        }

        $firstUserId = DB::table('users')->orderBy('id')->value('id');
        if ($firstUserId) {
            DB::table('companies')->where('id', $companyId)->update(['owner_user_id' => $firstUserId]);
        }

        Schema::table('warehouses', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->unique(['company_id', 'name']);
        });
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->unique(['company_id', 'name']);
        });
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['sku']);
            $table->unique(['company_id', 'sku']);
        });
        Schema::table('roles', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->unique(['company_id', 'name']);
        });
        Schema::table('sales', function (Blueprint $table) {
            $table->dropUnique(['voucher_number']);
            $table->unique(['company_id', 'voucher_number']);
        });
        Schema::table('voucher_sequences', function (Blueprint $table) {
            $table->dropUnique(['series']);
            $table->unique(['company_id', 'series']);
        });

        Schema::dropIfExists('company_settings');
    }

    public function down(): void
    {
        Schema::table('warehouses', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'name']);
            $table->unique(['name']);
        });
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'name']);
            $table->unique(['name']);
        });
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'sku']);
            $table->unique(['sku']);
        });
        Schema::table('roles', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'name']);
            $table->unique(['name']);
        });
        Schema::table('sales', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'voucher_number']);
            $table->unique(['voucher_number']);
        });
        Schema::table('voucher_sequences', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'series']);
            $table->unique(['series']);
        });

        foreach ($this->tenantTables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropConstrainedForeignId('company_id');
            });
        }
    }
};
