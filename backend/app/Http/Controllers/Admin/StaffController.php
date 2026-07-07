<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformAdmin;
use App\Services\PlatformActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        return PlatformAdmin::with(['roles', 'tokens' => fn ($q) => $q->orderByDesc('last_used_at')->limit(1)])
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%"))
            ->when($request->role_id, fn ($q, $v) => $q->whereHas('roles', fn ($r) => $r->where('platform_roles.id', $v)))
            ->paginate($request->integer('per_page') ?: 20);
    }

    public function stats()
    {
        $total = PlatformAdmin::count();
        $monthStart = now()->startOfMonth();
        $newThisMonth = PlatformAdmin::where('created_at', '>=', $monthStart)->count();
        $priorTotal = $total - $newThisMonth;
        $trend = $priorTotal > 0 ? round(($newThisMonth / $priorTotal) * 100, 1) : null;

        $superAdminCount = PlatformAdmin::whereHas('roles', fn ($q) => $q->where('name', 'Super Admin'))->count();
        $supportCount = PlatformAdmin::whereHas('roles', fn ($q) => $q->where('name', 'Soporte'))->count();

        $activeSessions = DB::table('personal_access_tokens')
            ->where('tokenable_type', PlatformAdmin::class)
            ->where('last_used_at', '>=', now()->subMinutes(15))
            ->distinct('tokenable_id')
            ->count('tokenable_id');

        return [
            'total' => $total,
            'trend_percent' => $trend,
            'super_admin_count' => $superAdminCount,
            'support_count' => $supportCount,
            'active_sessions' => $activeSessions,
        ];
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
