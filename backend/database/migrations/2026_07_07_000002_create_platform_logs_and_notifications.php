<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('platform_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_admin_id')->nullable()->constrained()->nullOnDelete();
            $table->string('admin_name')->nullable();
            $table->string('module');
            $table->string('action');
            $table->text('description');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['module', 'created_at']);
        });

        Schema::create('platform_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('title');
            $table->text('message');
            $table->string('link')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_notifications');
        Schema::dropIfExists('platform_activity_logs');
    }
};
