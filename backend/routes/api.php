<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\ArticuloStockController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CashRegisterController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CompanySettingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseIncomeController;
use App\Http\Controllers\Api\IngredientCategoryController;
use App\Http\Controllers\Api\IngredientController;
use App\Http\Controllers\Api\InventorySummaryController;
use App\Http\Controllers\Api\KardexController;
use App\Http\Controllers\Api\LicenseController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\RecipeController;
use App\Http\Controllers\Api\RegisterController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\RestaurantTableController;
use App\Http\Controllers\Api\RestaurantTableOrderController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WarehouseController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

require __DIR__ . '/channels.php';
require __DIR__ . '/admin.php';
Broadcast::routes(['middleware' => ['auth:sanctum', 'tenant']]);

// El 3er parametro de "throttle" (prefijo) es obligatorio para que cada grupo
// tenga su propio contador: sin el, TODAS las rutas con throttle:X,Y comparten
// una sola cuenta por IP (la firma default de Laravel es solo dominio+IP, sin
// la ruta), y agotar el limite de una tira abajo a todas las demas.
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1,login');
Route::post('/register-company', [RegisterController::class, 'store'])->middleware('throttle:5,1,register');
Route::post('/license/check', [LicenseController::class, 'check'])->middleware('throttle:30,1,license');

Route::middleware(['auth:sanctum', 'tenant', 'throttle:120,1,api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/branding', [CompanySettingController::class, 'branding']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications-all', [NotificationController::class, 'all']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);

    Route::get('/dashboard', DashboardController::class)->middleware('permission:dashboard.view');
    Route::get('/dashboard/trends', [DashboardController::class, 'trends'])->middleware('permission:dashboard.view');

    Route::get('/users-stats', [UserController::class, 'stats'])->middleware('permission:users.view');
    Route::apiResource('users', UserController::class)->only(['index', 'show'])->middleware('permission:users.view');
    Route::apiResource('users', UserController::class)->only(['store'])->middleware('permission:users.create');
    Route::apiResource('users', UserController::class)->only(['update'])->middleware('permission:users.update');
    Route::apiResource('users', UserController::class)->only(['destroy'])->middleware('permission:users.delete');

    Route::get('/roles-stats', [RoleController::class, 'stats'])->middleware('permission:roles.view');
    Route::apiResource('roles', RoleController::class)->only(['index', 'show'])->middleware('permission:roles.view');
    Route::apiResource('roles', RoleController::class)->only(['store'])->middleware('permission:roles.create');
    Route::apiResource('roles', RoleController::class)->only(['update'])->middleware('permission:roles.update');
    Route::apiResource('roles', RoleController::class)->only(['destroy'])->middleware('permission:roles.delete');

    Route::get('/company-settings', [CompanySettingController::class, 'show'])->middleware('permission:settings.view');
    Route::put('/company-settings', [CompanySettingController::class, 'update'])->middleware('permission:settings.update');
    Route::post('/company-settings/business-type', [CompanySettingController::class, 'selectBusinessType'])->middleware('permission:settings.update');
    Route::post('/company-settings/upload-logo', [CompanySettingController::class, 'uploadLogo'])->middleware('permission:settings.update');

    Route::get('/warehouses-stats', [WarehouseController::class, 'stats'])->middleware('permission:warehouses.view');
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
    Route::get('/products/import-template', [ProductController::class, 'importTemplate'])->middleware('permission:products.create');
    Route::post('/products/import-preview', [ProductController::class, 'importPreview'])->middleware('permission:products.create');
    Route::post('/products/import-confirm', [ProductController::class, 'importConfirm'])->middleware('permission:products.create');
    Route::apiResource('products', ProductController::class)->only(['index', 'show'])->middleware('permission:products.view');
    Route::apiResource('products', ProductController::class)->only(['store'])->middleware('permission:products.create');
    Route::apiResource('products', ProductController::class)->only(['update'])->middleware('permission:products.update');
    Route::apiResource('products', ProductController::class)->only(['destroy'])->middleware('permission:products.delete');
    Route::get('/products-low-stock', [ProductController::class, 'lowStock'])->middleware('permission:products.view');
    Route::get('/products-stats', [ProductController::class, 'stats'])->middleware('permission:products.view');

    Route::get('/sales-stats', [SaleController::class, 'stats'])->middleware('permission:sales.view');
    Route::apiResource('sales', SaleController::class)->only(['index', 'show'])->middleware('permission:sales.view');
    Route::apiResource('sales', SaleController::class)->only(['store'])->middleware('permission:sales.create');
    Route::post('/sales/{sale}/voucher-pdf', [SaleController::class, 'generateVoucherPdf'])->middleware('permission:sales.create');
    Route::get('/sales/{sale}/voucher-pdf', [SaleController::class, 'showVoucherPdf'])->middleware('permission:sales.view');

    Route::get('/cash-registers-stats', [CashRegisterController::class, 'stats'])->middleware('permission:cash.view');
    Route::apiResource('cash-registers', CashRegisterController::class)->only(['index', 'show'])->middleware('permission:cash.view');
    Route::apiResource('cash-registers', CashRegisterController::class)->only(['store'])->middleware('permission:cash.open');
    Route::apiResource('cash-registers', CashRegisterController::class)->only(['update'])->middleware('permission:cash.update');
    Route::apiResource('cash-registers', CashRegisterController::class)->only(['destroy'])->middleware('permission:cash.close');
    Route::post('/cash-registers/{cashRegister}/close', [CashRegisterController::class, 'close'])->middleware('permission:cash.close');
    Route::get('/cash-registers/{cashRegister}/turno', [CashRegisterController::class, 'turno'])->middleware('permission:cash.view');

    Route::get('/expenses-income-stats', [ExpenseIncomeController::class, 'stats'])->middleware('permission:movements.view');
    Route::apiResource('expenses-income', ExpenseIncomeController::class)->parameters(['expenses-income' => 'expenseIncome'])->only(['index', 'show'])->middleware('permission:movements.view');
    Route::apiResource('expenses-income', ExpenseIncomeController::class)->parameters(['expenses-income' => 'expenseIncome'])->only(['store'])->middleware('permission:movements.create');
    Route::apiResource('expenses-income', ExpenseIncomeController::class)->parameters(['expenses-income' => 'expenseIncome'])->only(['update'])->middleware('permission:movements.update');
    Route::apiResource('expenses-income', ExpenseIncomeController::class)->parameters(['expenses-income' => 'expenseIncome'])->only(['destroy'])->middleware('permission:movements.delete');

    Route::get('/reports-analytics', [ReportController::class, 'analytics'])->middleware('permission:reports.view');
    Route::get('/reports-transactions', [ReportController::class, 'transactions'])->middleware('permission:reports.view');
    Route::get('/reports-peak-hours', [ReportController::class, 'peakHours'])->middleware('permission:reports.view');
    Route::get('/reports/{type}', [ReportController::class, 'show'])->middleware('permission:reports.view');
    Route::get('/reports/{type}/export/{format}', [ReportController::class, 'export'])->middleware('permission:reports.export');

    Route::get('/activity-logs', [ActivityLogController::class, 'index'])->middleware('permission:logs.view');
    Route::get('/activity-logs-stats', [ActivityLogController::class, 'stats'])->middleware('permission:logs.view');

    Route::middleware('permission:tables.manage')->group(function () {
        Route::apiResource('tables', RestaurantTableController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
        Route::post('/tables/{table}/rounds', [RestaurantTableOrderController::class, 'storeRound']);
        Route::post('/table-orders/{tableOrder}/charge', [RestaurantTableOrderController::class, 'charge']);
        Route::post('/table-orders/{tableOrder}/rounds', [RestaurantTableOrderController::class, 'addRound']);
        Route::post('/table-orders/{tableOrder}/advance-payment', [RestaurantTableOrderController::class, 'advancePayment']);
        Route::post('/table-orders/{tableOrder}/cancel', [RestaurantTableOrderController::class, 'cancel']);
        Route::get('/table-orders/{tableOrder}/comanda-pdf', [RestaurantTableOrderController::class, 'comandaPdf']);
        Route::get('/table-orders/{tableOrder}/precuenta-pdf', [RestaurantTableOrderController::class, 'precuentaPdf']);

        Route::get('/orders', [RestaurantTableOrderController::class, 'index']);
        Route::post('/orders', [RestaurantTableOrderController::class, 'store']);
        Route::get('/orders-stats', [RestaurantTableOrderController::class, 'stats']);
        Route::get('/orders-most-ordered', [RestaurantTableOrderController::class, 'mostOrdered']);
    });

    // La pantalla de Cocina y el marcado de items listos los puede usar tanto quien
    // gestiona mesas (mesero/admin) como una cuenta dedicada solo a cocina.
    Route::middleware('permission:tables.manage,kitchen.view')->group(function () {
        Route::get('/orders-kitchen', [RestaurantTableOrderController::class, 'kitchen']);
        Route::patch('/table-order-items/{item}/deliver', [RestaurantTableOrderController::class, 'deliverItem']);
    });

    Route::middleware('permission:reservations.manage')->group(function () {
        Route::get('/reservations', [ReservationController::class, 'index']);
        Route::post('/reservations', [ReservationController::class, 'store']);
        Route::patch('/reservations/{reservation}/status', [ReservationController::class, 'updateStatus']);
        Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy']);
        Route::get('/reservations-upcoming-count', [ReservationController::class, 'upcomingCount']);
    });

    Route::middleware('permission:inventory.manage')->group(function () {
        Route::get('/inventory-summary', InventorySummaryController::class);

        Route::apiResource('ingredient-categories', IngredientCategoryController::class)->only(['index', 'store', 'update', 'destroy']);

        Route::get('/ingredients-pdf', [IngredientController::class, 'exportPdf']);
        Route::get('/ingredients-excel', [IngredientController::class, 'exportExcel']);
        Route::post('/ingredients-import', [IngredientController::class, 'import']);
        Route::apiResource('ingredients', IngredientController::class)->only(['index', 'store', 'update', 'destroy']);

        Route::get('/articulos-stock', [ArticuloStockController::class, 'index']);
        Route::get('/articulos-stock-pdf', [ArticuloStockController::class, 'exportPdf']);
        Route::get('/articulos-stock-excel', [ArticuloStockController::class, 'exportExcel']);
        Route::post('/articulos-stock-conteo', [ArticuloStockController::class, 'conteo']);

        Route::get('/recipes-stats', [RecipeController::class, 'stats']);
        Route::get('/recipes-available-products', [RecipeController::class, 'availableProducts']);
        Route::apiResource('recipes', RecipeController::class)->only(['index', 'store', 'update', 'destroy']);

        Route::get('/kardex', [KardexController::class, 'index']);
    });
});
