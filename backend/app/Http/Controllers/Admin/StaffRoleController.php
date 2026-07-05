<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformPermission;
use App\Models\PlatformRole;
use App\Services\PlatformActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StaffRoleController extends Controller
{
    public function index()
    {
        return ['roles' => PlatformRole::with('permissions')->get(), 'permissions' => PlatformPermission::orderBy('module')->get()];
    }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => ['required', Rule::unique('platform_roles', 'name')], 'description' => ['nullable'], 'permissions' => ['array']]);
        $permissions = $data['permissions'] ?? [];
        unset($data['permissions']);
        $role = PlatformRole::create($data);
        $role->permissions()->sync($permissions);
        PlatformActivityLogger::log($request->user(), 'staff-roles', 'create', "Creo el rol de staff \"{$role->name}\".");
        return response()->json($role->load('permissions'), 201);
    }

    public function show(PlatformRole $staffRole)
    {
        return $staffRole->load('permissions');
    }

    public function update(Request $request, PlatformRole $staffRole)
    {
        $data = $request->validate(['name' => ['sometimes', Rule::unique('platform_roles', 'name')->ignore($staffRole->id)], 'description' => ['nullable'], 'permissions' => ['array']]);
        $permissions = $data['permissions'] ?? null;
        unset($data['permissions']);
        $staffRole->update($data);
        if (is_array($permissions)) {
            $staffRole->permissions()->sync($permissions);
        }
        PlatformActivityLogger::log($request->user(), 'staff-roles', 'update', "Edito el rol de staff \"{$staffRole->name}\".");
        return $staffRole->load('permissions');
    }

    public function destroy(Request $request, PlatformRole $staffRole)
    {
        PlatformActivityLogger::log($request->user(), 'staff-roles', 'delete', "Elimino el rol de staff \"{$staffRole->name}\".");
        $staffRole->delete();
        return response()->noContent();
    }
}
