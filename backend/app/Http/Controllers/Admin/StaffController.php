<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformAdmin;
use App\Services\PlatformActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        return PlatformAdmin::with('roles')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%"))
            ->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
            'email' => ['required', 'email', 'unique:platform_admins,email'],
            'password' => ['required', 'min:8'],
            'active' => ['boolean'],
            'roles' => ['array'],
            'roles.*' => Rule::exists('platform_roles', 'id'),
        ]);
        $roles = $data['roles'] ?? [];
        unset($data['roles']);
        $data['password'] = Hash::make($data['password']);
        $admin = PlatformAdmin::create($data);
        $admin->roles()->sync($roles);
        PlatformActivityLogger::log($request->user(), 'staff', 'create', "Creo el usuario de staff \"{$admin->name}\".");
        return response()->json($admin->load('roles'), 201);
    }

    public function show(PlatformAdmin $staff)
    {
        return $staff->load('roles');
    }

    public function update(Request $request, PlatformAdmin $staff)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string'],
            'email' => ['sometimes', 'email', 'unique:platform_admins,email,' . $staff->id],
            'password' => ['nullable', 'min:8'],
            'active' => ['boolean'],
            'roles' => ['array'],
            'roles.*' => Rule::exists('platform_roles', 'id'),
        ]);
        $roles = $data['roles'] ?? null;
        unset($data['roles']);
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        $staff->update($data);
        if (is_array($roles)) {
            $staff->roles()->sync($roles);
        }
        PlatformActivityLogger::log($request->user(), 'staff', 'update', "Edito el usuario de staff \"{$staff->name}\".");
        return $staff->load('roles');
    }

    public function destroy(Request $request, PlatformAdmin $staff)
    {
        $staff->update(['active' => false]);
        PlatformActivityLogger::log($request->user(), 'staff', 'delete', "Desactivo el usuario de staff \"{$staff->name}\".");
        return response()->noContent();
    }
}
