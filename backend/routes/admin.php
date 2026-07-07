<?php

use App\Http\Controllers\Admin\ActivityLogAdminController;
use App\Http\Controllers\Admin\AdminAuthController;
use App\Http\Controllers\Admin\CompanyAdminController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\PaymentAdminController;
use App\Http\Controllers\Admin\PlanAdminController;
use App\Http\Controllers\Admin\PlatformSettingController;
use App\Http\Controllers\Admin\StaffController;
use App\Http\Controllers\Admin\StaffRoleController;
use App\Http\Controllers\Admin\StatsController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->group(function () {
    Route::post('/login', [AdminAuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'platform-admin'])->group(function () {
        Route::post('/logout', [AdminAuthController::class, 'logout']);
        Route::get('/me', [AdminAuthController::class, 'me']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

        Route::get('/stats', StatsController::class)->middleware('platform-permission:companies.view');

        Route::get('/companies', [CompanyAdminController::class, 'index'])->middleware('platform-permission:companies.view');
        Route::post('/companies', [CompanyAdminController::class, 'store'])->middleware('platform-permission:companies.manage');
        Route::get('/companies/{company}', [CompanyAdminController::class, 'show'])->middleware('platform-permission:companies.view');
        Route::put('/companies/{company}/status', [CompanyAdminController::class, 'updateStatus'])->middleware('platform-permission:companies.manage');

        Route::get('/plans', [PlanAdminController::class, 'index'])->middleware('platform-permission:plans.view');
        Route::put('/plans/{plan}', [PlanAdminController::class, 'update'])->middleware('platform-permission:plans.manage');
        Route::get('/plans-history', [PlanAdminController::class, 'history'])->middleware('platform-permission:plans.view');

        Route::get('/settings', [PlatformSettingController::class, 'show'])->middleware('platform-permission:plans.view');
        Route::put('/settings', [PlatformSettingController::class, 'update'])->middleware('platform-permission:plans.manage');

        Route::get('/payments', [PaymentAdminController::class, 'index'])->middleware('platform-permission:billing.view');

        Route::get('/activity-logs', [ActivityLogAdminController::class, 'index'])->middleware('platform-permission:logs.view');
        Route::get('/activity-logs-stats', [ActivityLogAdminController::class, 'stats'])->middleware('platform-permission:logs.view');

        Route::get('/staff-stats', [StaffController::class, 'stats'])->middleware('platform-permission:staff.manage');
        Route::apiResource('staff', StaffController::class)->middleware('platform-permission:staff.manage');
        Route::get('/staff-roles-stats', [StaffRoleController::class, 'stats'])->middleware('platform-permission:staff.manage');
        Route::apiResource('staff-roles', StaffRoleController::class)->parameters(['staff-roles' => 'staffRole'])->middleware('platform-permission:staff.manage');
    });
});
