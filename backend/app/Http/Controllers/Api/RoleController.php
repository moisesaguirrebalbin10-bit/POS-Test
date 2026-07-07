<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function index()
    {
        return ['roles' => Role::with(['permissions', 'updater'])->get(), 'permissions' => Permission::orderBy('module')->get()];
    }

    public function stats()
    {
        $totalRoles = Role::count();
        $monthStart = now()->startOfMonth();
        $newThisMonth = Role::where('created_at', '>=', $monthStart)->count();

        $lastLog = ActivityLog::where('module', 'roles')->latest()->first();

        return [
            'active_roles' => $totalRoles, 'new_this_month' => $newThisMonth,
            'total_users' => User::count(),
            'last_change' => $lastLog ? [
                'description' => $lastLog->description,
                'user_name' => $lastLog->user_name,
                'created_at' => $lastLog->created_at,
            ] : null,
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => ['required', Rule::unique('roles', 'name')->where('company_id', app('currentCompanyId'))], 'description' => ['nullable'], 'active' => ['boolean'], 'permissions' => ['array']]);
        $permissions = $data['permissions'] ?? [];
        unset($data['permissions']);
        $data['updated_by'] = $request->user()->id;
        $role = Role::create($data);
        $role->permissions()->sync($permissions);
        ActivityLogger::log($request->user(), 'roles', 'create', "Creo el rol \"{$role->name}\".");
        return response()->json($role->load('permissions', 'updater'), 201);
    }

    public function show(Role $role)
    {
        return $role->load('permissions', 'updater');
    }

    public function update(Request $request, Role $role)
    {
        $data = $request->validate(['name' => ['sometimes', Rule::unique('roles', 'name')->where('company_id', app('currentCompanyId'))->ignore($role->id)], 'description' => ['nullable'], 'active' => ['boolean'], 'permissions' => ['array']]);
        $permissions = $data['permissions'] ?? null;
        unset($data['permissions']);
        $data['updated_by'] = $request->user()->id;
        $role->update($data);
        if (is_array($permissions)) {
            $role->permissions()->sync($permissions);
        }
        ActivityLogger::log($request->user(), 'roles', 'update', "Edito el rol \"{$role->name}\".");
        return $role->load('permissions', 'updater');
    }

    public function destroy(Request $request, Role $role)
    {
        $role->update(['active' => false]);
        $role->delete();
        ActivityLogger::log($request->user(), 'roles', 'delete', "Elimino el rol \"{$role->name}\".");
        return response()->noContent();
    }
}

