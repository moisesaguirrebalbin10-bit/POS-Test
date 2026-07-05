<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\User;

class StatsController extends Controller
{
    public function __invoke()
    {
        $companiesByStatus = Company::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $companiesByPlan = Company::selectRaw('plan_id, count(*) as total')->groupBy('plan_id')->with('plan:id,key,name')->get()
            ->mapWithKeys(fn ($row) => [$row->plan?->name ?? 'Sin plan' => $row->total]);

        return response()->json([
            'companies_total' => Company::count(),
            'companies_by_status' => $companiesByStatus,
            'companies_by_plan' => $companiesByPlan,
            'users_total' => User::count(),
            'sales_total' => (float) Sale::sum('total'),
            'sales_count' => Sale::count(),
            'platform_revenue' => (float) Payment::where('status', 'paid')->sum('amount'),
            'recent_companies' => Company::with('plan:id,name')->latest()->limit(5)->get(['id', 'name', 'status', 'plan_id', 'created_at']),
        ]);
    }
}
