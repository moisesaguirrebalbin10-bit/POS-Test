<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    private const DEFAULT_ROLE_NAMES = ['Administrador', 'Cajero', 'Almacen', 'Supervisor'];

    public function index(Request $request)
    {
        return User::with('roles')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")
                ->orWhere('email', 'like', "%$s%")
                ->orWhereHas('roles', fn ($r) => $r->where('name', 'like', "%$s%"))))
            ->when($request->status === 'active', fn ($q) => $q->where('active', true))
            ->when($request->status === 'inactive', fn ($q) => $q->where('active', false))
            ->paginate($request->integer('per_page') ?: 20);
    }

    public function stats()
    {
        $total = User::count();
        $monthStart = now()->startOfMonth();
        $newThisMonth = User::where('created_at', '>=', $monthStart)->count();
        $priorTotal = $total - $newThisMonth;
        $trend = $priorTotal > 0 ? round(($newThisMonth / $priorTotal) * 100, 1) : null;

        $active = User::where('active', true)->count();
        $onlineCount = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->whereIn('tokenable_id', User::pluck('id'))
            ->where('last_used_at', '>=', now()->subMinutes(15))
            ->distinct('tokenable_id')
            ->count('tokenable_id');

        $totalRoles = Role::count();
        $customRoles = Role::whereNotIn('name', self::DEFAULT_ROLE_NAMES)->count();

        return [
            'total_users' => $total, 'trend_percent' => $trend,
            'active_users' => $active, 'online_now' => $onlineCount,
            'total_roles' => $totalRoles, 'custom_roles' => $customRoles,
        ];
    }

    public function store(Request $request)
    {
        $maxUsers = app('currentCompany')->plan?->max_users;
        if ($maxUsers !== null && User::count() >= $maxUsers) {
            $label = $maxUsers === 1 ? 'usuario' : 'usuarios';
            abort(422, "Tu plan permite hasta {$maxUsers} {$label}. Actualiza tu plan para agregar mas.");
        }

        $data = $request->validate([
            'name' => ['required', 'string'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'min:8'],
            'active' => ['boolean'],
            'roles' => ['array'],
            'roles.*' => Rule::exists('roles', 'id')->where('company_id', app('currentCompanyId')),
        ]);
        $roles = $data['roles'] ?? [];
        unset($data['roles']);
        $user = User::create($data);
        $user->roles()->sync($roles);
        ActivityLogger::log($request->user(), 'users', 'create', "Creo el usuario \"{$user->name}\".");
        return response()->json($user->load('roles'), 201);
    }

    public function show(User $user)
    {
        return $user->load('roles');
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string'],
            'email' => ['sometimes', 'email', 'unique:users,email,' . $user->id],
            'password' => ['nullable', 'min:8'],
            'active' => ['boolean'],
            'roles' => ['array'],
            'roles.*' => Rule::exists('roles', 'id')->where('company_id', app('currentCompanyId')),
        ]);
        $roles = $data['roles'] ?? null;
        unset($data['roles']);
        if (empty($data['password'])) {
            unset($data['password']);
        }
        $user->update($data);
        if (is_array($roles)) {
            $user->roles()->sync($roles);
        }
        ActivityLogger::log($request->user(), 'users', 'update', "Edito el usuario \"{$user->name}\".");
        return $user->load('roles');
    }

    public function destroy(Request $request, User $user)
    {
        $user->update(['active' => false]);
        $user->delete();
        ActivityLogger::log($request->user(), 'users', 'delete', "Elimino el usuario \"{$user->name}\".");
        return response()->noContent();
    }
}

