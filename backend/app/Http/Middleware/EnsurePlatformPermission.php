<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsurePlatformPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions)
    {
        $admin = $request->user();
        $allowed = $admin?->active && collect($permissions)
            ->flatMap(fn (string $permission) => explode(',', $permission))
            ->map(fn (string $permission) => trim($permission))
            ->filter()
            ->contains(fn (string $permission) => $admin->hasPermission($permission));

        if (!$allowed) {
            return response()->json(['message' => 'No autorizado para esta accion.'], 403);
        }

        return $next($request);
    }
}
