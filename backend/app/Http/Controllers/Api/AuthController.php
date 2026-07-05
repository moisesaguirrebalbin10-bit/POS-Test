<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required']]);
        $user = User::with('roles.permissions', 'company')->where('email', $data['email'])->first();

        if (!$user || !$user->active || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Credenciales invalidas.'], 422);
        }

        if (!$user->company || in_array($user->company->status, ['suspended', 'cancelled'])) {
            return response()->json(['message' => 'Tu cuenta esta suspendida. Contacta a soporte para reactivarla.'], 403);
        }

        if ($user->company->isTrialExpired()) {
            return response()->json(['message' => 'Tu prueba gratuita vencio. Actualiza tu plan para continuar usando el sistema.'], 403);
        }

        app()->instance('currentCompanyId', $user->company_id);
        ActivityLogger::log($user, 'auth', 'login', "Inicio de sesion de {$user->name}.");

        return response()->json([
            'token' => $user->createToken('pos-chifa')->plainTextToken,
            'user' => $user,
        ]);
    }

    public function me(Request $request)
    {
        return $request->user()->load('roles.permissions');
    }

    public function logout(Request $request)
    {
        ActivityLogger::log($request->user(), 'auth', 'logout', "Cierre de sesion de {$request->user()->name}.");
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'Sesion cerrada.']);
    }
}

