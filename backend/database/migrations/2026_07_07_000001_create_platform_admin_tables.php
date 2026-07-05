<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('platform_admins', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->boolean('active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('platform_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('platform_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('module');
            $table->string('label');
            $table->timestamps();
        });

        Schema::create('platform_admin_role', function (Blueprint $table) {
            $table->foreignId('platform_admin_id')->constrained()->cascadeOnDelete();
            $table->foreignId('platform_role_id')->constrained()->cascadeOnDelete();
            $table->primary(['platform_admin_id', 'platform_role_id']);
        });

        Schema::create('platform_role_permission', function (Blueprint $table) {
            $table->foreignId('platform_role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('platform_permission_id')->constrained()->cascadeOnDelete();
            $table->primary(['platform_role_id', 'platform_permission_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_role_permission');
        Schema::dropIfExists('platform_admin_role');
        Schema::dropIfExists('platform_permissions');
        Schema::dropIfExists('platform_roles');
        Schema::dropIfExists('platform_admins');
    }
};
