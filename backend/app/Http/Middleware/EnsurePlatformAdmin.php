<?php

namespace App\Http\Middleware;

use App\Models\PlatformAdmin;
use Closure;
use Illuminate\Http\Request;

class EnsurePlatformAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $admin = $request->user();

        if (!$admin instanceof PlatformAdmin || !$admin->active) {
            return response()->json(['message' => 'No autorizado para el panel administrativo.'], 403);
        }

        return $next($request);
    }
}
