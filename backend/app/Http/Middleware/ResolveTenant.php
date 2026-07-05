<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ResolveTenant
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        $company = $user->company;
        if (!$company) {
            return response()->json(['message' => 'Tu cuenta no tiene una empresa asociada.'], 403);
        }

        if (in_array($company->status, ['suspended', 'cancelled'])) {
            return response()->json(['message' => 'Tu cuenta esta suspendida. Contacta a soporte para reactivarla.'], 403);
        }

        if ($company->isTrialExpired()) {
            return response()->json(['message' => 'Tu prueba gratuita vencio. Actualiza tu plan para continuar usando el sistema.'], 403);
        }

        app()->instance('currentCompanyId', $company->id);
        app()->instance('currentCompany', $company);

        return $next($request);
    }
}
