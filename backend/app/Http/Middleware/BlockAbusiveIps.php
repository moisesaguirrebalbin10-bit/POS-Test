<?php

namespace App\Http\Middleware;

use App\Models\BlockedIp;
use Closure;
use Illuminate\Http\Request;

class BlockAbusiveIps
{
    public function handle(Request $request, Closure $next)
    {
        if (BlockedIp::where('ip', $request->ip())->exists()) {
            return response()->json([
                'message' => 'Tu direccion IP fue bloqueada por actividad sospechosa. Si crees que es un error, contacta a soporte.',
            ], 403);
        }

        return $next($request);
    }
}
