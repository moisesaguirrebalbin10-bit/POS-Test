<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ActivityLogAdminController extends Controller
{
    public function index(Request $request)
    {
        return ActivityLog::with('user:id,name', 'company:id,name,license_key')
            ->when($request->company_id, fn ($q, $v) => $q->where('company_id', $v))
            ->when($request->module, fn ($q, $v) => $q->where('module', $v))
            ->when($request->from, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->latest()
            ->paginate($request->integer('per_page') ?: 25);
    }

    public function stats()
    {
        $todayStart = now()->startOfDay();
        $yesterdayStart = now()->subDay()->startOfDay();

        $eventsTotal = ActivityLog::count();
        $eventsToday = ActivityLog::where('created_at', '>=', $todayStart)->count();
        $eventsYesterday = ActivityLog::whereBetween('created_at', [$yesterdayStart, $todayStart])->count();
        $eventsTrend = $eventsYesterday > 0 ? round((($eventsToday - $eventsYesterday) / $eventsYesterday) * 100, 1) : null;

        $alertsToday = ActivityLog::where('created_at', '>=', $todayStart)->where('action', 'delete')->count();
        $alertsYesterday = ActivityLog::whereBetween('created_at', [$yesterdayStart, $todayStart])->where('action', 'delete')->count();
        $alertsDelta = $alertsToday - $alertsYesterday;

        $activeUsers24h = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->where('last_used_at', '>=', now()->subHours(24))
            ->distinct('tokenable_id')
            ->count('tokenable_id');
        $activeUsersPrior24h = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->where('last_used_at', '>=', now()->subHours(48))
            ->where('last_used_at', '<', now()->subHours(24))
            ->distinct('tokenable_id')
            ->count('tokenable_id');
        $activeUsersTrend = $activeUsersPrior24h > 0 ? round((($activeUsers24h - $activeUsersPrior24h) / $activeUsersPrior24h) * 100, 1) : null;

        $modules = ActivityLog::select('module')->distinct()->orderBy('module')->pluck('module');

        return [
            'events_total' => $eventsTotal,
            'events_trend' => $eventsTrend,
            'security_alerts_today' => $alertsToday,
            'security_alerts_delta' => $alertsDelta,
            'active_users_24h' => $activeUsers24h,
            'active_users_trend' => $activeUsersTrend,
            'modules' => $modules,
        ];
    }
}
