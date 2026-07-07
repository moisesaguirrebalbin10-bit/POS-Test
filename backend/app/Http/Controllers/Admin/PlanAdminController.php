<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\PlatformActivityLog;
use App\Services\PlatformActivityLogger;
use Illuminate\Http\Request;

class PlanAdminController extends Controller
{
    public function index()
    {
        return Plan::withCount('companies')->orderBy('id')->get();
    }

    public function update(Request $request, Plan $plan)
    {
        $data = $request->validate([
            'price' => ['required', 'numeric', 'min:0'],
            'max_users' => ['nullable', 'integer', 'min:1'],
            'max_warehouses' => ['nullable', 'integer', 'min:1'],
            'active' => ['boolean'],
        ]);
        $plan->update($data);

        PlatformActivityLogger::log($request->user(), 'plans', 'update', "Actualizo el plan \"{$plan->name}\" (precio S/ {$plan->price}).");

        return $plan;
    }

    public function history()
    {
        return PlatformActivityLog::whereIn('module', ['plans', 'settings'])->latest()->limit(30)->get();
    }
}
