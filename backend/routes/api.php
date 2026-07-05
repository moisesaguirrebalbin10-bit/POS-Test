<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CashRegisterController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CompanySettingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseIncomeController;
use App\Http\Controllers\Api\LicenseController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\RegisterController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WarehouseController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

require __DIR__ . '/channels.php';
require __DIR__ . '/admin.php';
Broadcast::routes(['middleware' => ['auth:sanctum', 'tenant']]);

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register-company', [RegisterController::class, 'store']);
Route::post('/license/check', [LicenseController::class, 'check'])->middleware('throttle:30,1');

Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/branding', [CompanySettingController::class, 'branding']);

    Route::get('/dashboard', DashboardController::class)->middleware('permission:dashboard.view');
    Route::get('/dashboard/trends', [DashboardController::class, 'trends'])->middleware('permission:dashboard.view');

    Route::apiResource('users', UserController::class)->only(['index', 'show'])->middleware('permission:users.view');
    Route::apiResource('users', UserController::class)->only(['store'])->middleware('permission:users.create');
    Route::apiResource('users', UserController::class)->only(['update'])->middleware('permission:users.update');
    Route::apiResource('users', UserController::class)->only(['destroy'])->middleware('permission:users.delete');

    Route::apiResource('roles', RoleController::class)->only(['index', 'show'])->middleware('permission:roles.view');
    Route::apiResource('roles', RoleController::class)->only(['store'])->middleware('permission:roles.create');
    Route::apiResource('roles', RoleController::class)->only(['update'])->middleware('permission:roles.update');
    Route::apiResource('roles', RoleController::class)->only(['destroy'])->middleware('permission:roles.delete');

    Route::get('/company-settings', [CompanySettingController::class, 'show'])->middleware('permission:settings.view');
    Route::put('/company-settings', [CompanySettingController::class, 'update'])->middleware('permission:settings.update');
    Route::post('/company-settings/upload-logo', [CompanySettingController::class, 'uploadLogo'])->middleware('permission:settings.update');

    Route::apiResource('warehouses', WarehouseController::class)->only(['index', 'show'])->middleware('permission:warehouses.view');
    Route::apiResource('warehouses', WarehouseController::class)->only(['store'])->middleware('permission:warehouses.create');
    Route::apiResource('warehouses', WarehouseController::class)->only(['update'])->middleware('permission:warehouses.update');
    Route::apiResource('warehouses', WarehouseController::class)->only(['destroy'])->middleware('permission:warehouses.delete');
    Route::post('/warehouses/transfer', [WarehouseController::class, 'transfer'])->middleware('permission:warehouses.transfer');

    Route::apiResource('categories', CategoryController::class)->only(['index', 'show'])->middleware('permission:products.view');
    Route::apiResource('categories', CategoryController::class)->only(['store'])->middleware('permission:products.create');
    Route::apiResource('categories', CategoryController::class)->only(['update'])->middleware('permission:products.update');
    Route::apiResource('categories', CategoryController::class)->only(['destroy'])->middleware('permission:products.delete');

    Route::post('/products/upload-image', [ProductController::class, 'uploadImage'])->middleware('permission:products.create,products.update');
    Route::apiResource('products', ProductController::class)->only(['index', 'show'])->middleware('permission:products.view');
    Route::apiResource('products', ProductController::class)->only(['store'])->middleware('permission:products.create');
    Route::apiResource('products', ProductController::class)->only(['update'])->middleware('permission:products.update');
    Route::apiResource('products', ProductController::class)->only(['destroy'])->middleware('permission:products.delete');
    Route::get('/products-low-stock', [ProductController::class, 'lowStock'])->middleware('permission:products.view');

    Route::apiResource('sales', SaleController::class)->only(['index', 'show'])->middleware('permission:sales.view');
    Route::apiResource('sales', SaleController::class)->only(['store'])->middleware('permission:sales.create');
    Route::post('/sales/{sale}/voucher-pdf', [SaleController::class, 'generateVoucherPdf'])->middleware('permission:sales.create');
    Route::get('/sales/{sale}/voucher-pdf', [SaleController::class, 'showVoucherPdf'])->middleware('permission:sales.view');

    Route::apiResource('cash-registers', CashRegisterController::class)->only(['index', 'show'])->middleware('permission:cash.view');
    Route::apiResource('cash-registers', CashRegisterController::class)->only(['store'])->middleware('permission:cash.open');
    Route::apiResource('cash-registers', CashRegisterController::class)->only(['update'])->middleware('permission:cash.update');
    Route::apiResource('cash-registers', CashRegisterController::class)->only(['destroy'])->middleware('permission:cash.close');
    Route::post('/cash-registers/{cashRegister}/close', [CashRegisterController::class, 'close'])->middleware('permission:cash.close');

    Route::apiResource('expenses-income', ExpenseIncomeController::class)->parameters(['expenses-income' => 'expenseIncome'])->only(['index', 'show'])->middleware('permission:movements.view');
    Route::apiResource('expenses-income', ExpenseIncomeController::class)->parameters(['expenses-income' => 'expenseIncome'])->only(['store'])->middleware('permission:movements.create');
    Route::apiResource('expenses-income', ExpenseIncomeController::class)->parameters(['expenses-income' => 'expenseIncome'])->only(['update'])->middleware('permission:movements.update');
    Route::apiResource('expenses-income', ExpenseIncomeController::class)->parameters(['expenses-income' => 'expenseIncome'])->only(['destroy'])->middleware('permission:movements.delete');

    Route::get('/reports/{type}', [ReportController::class, 'show'])->middleware('permission:reports.view');
    Route::get('/reports/{type}/export/{format}', [ReportController::class, 'export'])->middleware('permission:reports.export');

    Route::get('/activity-logs', [ActivityLogController::class, 'index'])->middleware('permission:logs.view');
});
