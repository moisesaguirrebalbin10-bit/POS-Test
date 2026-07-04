<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        return User::with('roles')->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%"))->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'min:8'],
            'active' => ['boolean'],
            'roles' => ['array'],
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

