<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions)
    {
        $user = $request->user();
        $plan = app()->bound('currentCompany') ? app('currentCompany')->plan : null;

        $allowed = $user?->active && collect($permissions)
            ->flatMap(fn (string $permission) => explode(',', $permission))
            ->map(fn (string $permission) => trim($permission))
            ->filter()
            ->contains(fn (string $permission) => $user->hasPermission($permission) && (!$plan || $plan->hasFeature($permission)));

        if (!$allowed) {
            return response()->json(['message' => 'No autorizado para esta accion.'], 403);
        }

        return $next($request);
    }
}