<?php

use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsurePlatformPermission;
use App\Http\Middleware\ResolveTenant;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__ . '/../routes/api.php')
    ->withCommands([__DIR__ . '/../routes/console.php', __DIR__ . '/../app/Console/Commands'])
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'permission' => EnsurePermission::class,
            'tenant' => ResolveTenant::class,
            'platform-admin' => EnsurePlatformAdmin::class,
            'platform-permission' => EnsurePlatformPermission::class,
        ]);
        // ResolveTenant debe correr antes de SubstituteBindings: si no, el route-model-binding
        // (p.ej. Warehouse $warehouse en la URL) resuelve el modelo antes de que exista el
        // tenant actual, y el global scope de BelongsToCompany no filtra nada todavia.
        $middleware->priority([
            \Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests::class,
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class,
            ResolveTenant::class,
            \Illuminate\Routing\Middleware\ThrottleRequests::class,
            \Illuminate\Routing\Middleware\ThrottleRequestsWithRedis::class,
            \Illuminate\Contracts\Session\Middleware\AuthenticatesSessions::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            \Illuminate\Auth\Middleware\Authorize::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
