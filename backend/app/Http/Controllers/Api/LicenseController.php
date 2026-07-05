<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;

class LicenseController extends Controller
{
    public function check(Request $request)
    {
        $data = $request->validate(['license_key' => ['required', 'string']]);

        $company = Company::with('plan')->where('license_key', $data['license_key'])->first();

        if (!$company) {
            return response()->json(['valid' => false, 'message' => 'Codigo de licencia no encontrado.'], 404);
        }

        if (in_array($company->status, ['suspended', 'cancelled'])) {
            return response()->json([
                'valid' => false, 'status' => $company->status, 'company_name' => $company->name,
                'message' => 'Tu cuenta esta suspendida. Contacta a soporte para reactivarla.',
            ]);
        }

        if ($company->isTrialExpired()) {
            return response()->json([
                'valid' => false, 'status' => $company->status, 'trial_ends_at' => $company->trial_ends_at,
                'company_name' => $company->name, 'message' => 'Tu prueba gratuita vencio. Actualiza tu plan para continuar.',
            ]);
        }

        return response()->json([
            'valid' => true, 'status' => $company->status, 'trial_ends_at' => $company->trial_ends_at,
            'plan_name' => $company->plan?->name, 'company_name' => $company->name,
        ]);
    }
}
