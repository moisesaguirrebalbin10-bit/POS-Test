<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->boolean('active')->default(true);
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('module');
            $table->string('label');
            $table->timestamps();
        });

        Schema::create('role_user', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['role_id', 'user_id']);
        });

        Schema::create('permission_role', function (Blueprint $table) {
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->primary(['permission_id', 'role_id']);
        });

        Schema::create('company_settings', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('CHIFA DRAGON DE ORO');
            $table->string('ruc')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->string('slogan')->default('Gracias por su preferencia');
            $table->string('logo_path')->nullable();
            $table->decimal('igv_percent', 5, 2)->default(18);
            $table->boolean('tip_enabled')->default(false);
            $table->decimal('default_tip', 10, 2)->default(0);
            $table->string('voucher_series')->default('CF-');
            $table->unsignedInteger('voucher_start_number')->default(1);
            $table->enum('ticket_width', ['58', '80'])->default('80');
            $table->timestamps();
        });

        Schema::create('voucher_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('series')->unique();
            $table->unsignedInteger('current_number')->default(0);
            $table->timestamps();
        });

        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name')->index();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->foreignId('warehouse_id')->constrained()->restrictOnDelete();
            $table->decimal('sale_price', 10, 2);
            $table->decimal('cost', 10, 2)->default(0);
            $table->decimal('stock', 12, 3)->default(0);
            $table->decimal('min_stock', 12, 3)->default(0);
            $table->boolean('active')->default(true);
            $table->string('image_path')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['warehouse_id', 'category_id', 'active']);
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('from_warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('to_warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['entry', 'sale', 'transfer', 'adjustment']);
            $table->decimal('quantity', 12, 3);
            $table->string('note')->nullable();
            $table->timestamps();
        });

        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->decimal('opening_amount', 10, 2)->default(0);
            $table->decimal('counted_amount', 10, 2)->nullable();
            $table->decimal('difference', 10, 2)->nullable();
            $table->text('observations')->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamps();
        });

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_number')->unique();
            $table->foreignId('cash_register_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('customer_name')->default('Cliente General');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('igv', 10, 2);
            $table->decimal('tip', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->enum('payment_method', ['cash', 'yape', 'plin', 'card', 'transfer', 'mixed']);
            $table->json('mixed_payments')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->string('product_name');
            $table->decimal('quantity', 12, 3);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('unit_cost', 10, 2);
            $table->decimal('total', 10, 2);
            $table->timestamps();
        });

        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->nullableMorphs('source');
            $table->enum('type', ['sale', 'income', 'expense']);
            $table->string('category')->nullable();
            $table->string('description');
            $table->decimal('amount', 10, 2);
            $table->enum('payment_method', ['cash', 'yape', 'plin', 'card', 'transfer', 'mixed']);
            $table->timestamps();
        });

        Schema::create('expenses_income', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->enum('type', ['income', 'expense']);
            $table->string('category');
            $table->string('description');
            $table->decimal('amount', 10, 2);
            $table->date('date')->index();
            $table->enum('payment_method', ['cash', 'yape', 'plin', 'card', 'transfer']);
            $table->string('receipt_path')->nullable();
            $table->text('observation')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses_income');
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('cash_registers');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('voucher_sequences');
        Schema::dropIfExists('company_settings');
        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('role_user');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('users');
    }
};

