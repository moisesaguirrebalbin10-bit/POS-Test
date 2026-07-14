<?php

use App\Http\Middleware\BlockAbusiveIps;
use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsurePlatformPermission;
use App\Http\Middleware\ResolveTenant;
use App\Services\AbuseGuard;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;

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
        // Corre antes que todo lo demas: una IP ya bloqueada ni siquiera llega a
        // gastar ciclos en autenticacion/tenant/throttle.
        $middleware->api(prepend: [BlockAbusiveIps::class]);
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
        // Cada rechazo por throttle cuenta como un "strike" para esa IP; si se
        // acumulan varios en poco tiempo, AbuseGuard la bloquea de forma permanente.
        $exceptions->render(function (ThrottleRequestsException $e, $request) {
            app(AbuseGuard::class)->recordViolation($request->ip());

            return response()->json(['message' => 'Demasiadas peticiones. Intenta de nuevo mas tarde.'], 429);
        });
    })->create();
