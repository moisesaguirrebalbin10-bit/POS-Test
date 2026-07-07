<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function __invoke()
    {
        $companiesByStatus = Company::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $companiesByPlan = Company::selectRaw('plan_id, count(*) as total')->groupBy('plan_id')->with('plan:id,key,name')->get()
            ->mapWithKeys(fn ($row) => [$row->plan?->name ?? 'Sin plan' => $row->total]);

        $companiesTotal = Company::count();
        $monthStart = now()->startOfMonth();
        $newThisMonth = Company::where('created_at', '>=', $monthStart)->count();
        $priorTotal = $companiesTotal - $newThisMonth;
        $companiesTrend = $priorTotal > 0 ? round(($newThisMonth / $priorTotal) * 100, 1) : null;

        $usersTotal = User::count();
        $onlineNow = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->where('last_used_at', '>=', now()->subMinutes(15))
            ->distinct('tokenable_id')
            ->count('tokenable_id');
        $activeSessionPercent = $usersTotal > 0 ? round(($onlineNow / $usersTotal) * 100, 1) : null;

        $healthyCompanies = ($companiesByStatus['active'] ?? 0) + ($companiesByStatus['trial'] ?? 0);
        $portfolioHealthPercent = $companiesTotal > 0 ? round(($healthyCompanies / $companiesTotal) * 100, 1) : null;

        return response()->json([
            'companies_total' => $companiesTotal,
            'companies_trend_percent' => $companiesTrend,
            'companies_by_status' => $companiesByStatus,
            'companies_by_plan' => $companiesByPlan,
            'users_total' => $usersTotal,
            'active_session_percent' => $activeSessionPercent,
            'sales_total' => (float) Sale::sum('total'),
            'sales_count' => Sale::count(),
            'platform_revenue' => (float) Payment::where('status', 'paid')->sum('amount'),
            'portfolio_health_percent' => $portfolioHealthPercent,
            'recent_companies' => Company::with('plan:id,name')->latest()->limit(5)->get(['id', 'name', 'status', 'plan_id', 'created_at', 'license_key']),
        ]);
    }
}
