<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformAdmin;
use App\Services\PlatformActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required']]);
        $admin = PlatformAdmin::with('roles.permissions')->where('email', $data['email'])->first();

        if (!$admin || !$admin->active || !Hash::check($data['password'], $admin->password)) {
            return response()->json(['message' => 'Credenciales invalidas.'], 422);
        }

        PlatformActivityLogger::log($admin, 'auth', 'login', "Inicio de sesion de {$admin->name} en el panel administrativo.");

        return response()->json([
            'token' => $admin->createToken('servimax-admin')->plainTextToken,
            'admin' => $admin,
        ]);
    }

    public function me(Request $request)
    {
        return $request->user()->load('roles.permissions');
    }

    public function logout(Request $request)
    {
        PlatformActivityLogger::log($request->user(), 'auth', 'logout', "Cierre de sesion de {$request->user()->name}.");
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'Sesion cerrada.']);
    }
}
