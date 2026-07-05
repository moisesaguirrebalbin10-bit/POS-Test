<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->decimal('price', 8, 2)->default(0);
            $table->enum('billing_period', ['monthly', 'yearly'])->default('monthly');
            $table->unsignedInteger('max_users')->nullable();
            $table->unsignedInteger('max_warehouses')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('Mi Empresa');
            $table->string('slug')->unique();
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
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['trial', 'active', 'past_due', 'suspended', 'cancelled'])->default('trial');
            $table->timestamp('trial_ends_at')->nullable();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->restrictOnDelete();
            $table->enum('status', ['trialing', 'active', 'past_due', 'canceled', 'expired'])->default('trialing');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->timestamp('cancel_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('PEN');
            $table->enum('method', ['yape', 'plin', 'card', 'transfer', 'other'])->default('other');
            $table->enum('status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->string('external_reference')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('companies');
        Schema::dropIfExists('plans');
    }
};
