<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index()
    {
        return ['roles' => Role::with('permissions')->get(), 'permissions' => Permission::orderBy('module')->get()];
    }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => ['required', 'unique:roles,name'], 'description' => ['nullable'], 'active' => ['boolean'], 'permissions' => ['array']]);
        $permissions = $data['permissions'] ?? [];
        unset($data['permissions']);
        $role = Role::create($data);
        $role->permissions()->sync($permissions);
        ActivityLogger::log($request->user(), 'roles', 'create', "Creo el rol \"{$role->name}\".");
        return response()->json($role->load('permissions'), 201);
    }

    public function show(Role $role)
    {
        return $role->load('permissions');
    }

    public function update(Request $request, Role $role)
    {
        $data = $request->validate(['name' => ['sometimes', 'unique:roles,name,' . $role->id], 'description' => ['nullable'], 'active' => ['boolean'], 'permissions' => ['array']]);
        $permissions = $data['permissions'] ?? null;
        unset($data['permissions']);
        $role->update($data);
        if (is_array($permissions)) {
            $role->permissions()->sync($permissions);
        }
        ActivityLogger::log($request->user(), 'roles', 'update', "Edito el rol \"{$role->name}\".");
        return $role->load('permissions');
    }

    public function destroy(Request $request, Role $role)
    {
        $role->update(['active' => false]);
        $role->delete();
        ActivityLogger::log($request->user(), 'roles', 'delete', "Elimino el rol \"{$role->name}\".");
        return response()->noContent();
    }
}

