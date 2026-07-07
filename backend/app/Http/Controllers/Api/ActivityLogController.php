<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        return ActivityLog::query()
            ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('user_name', 'like', "%$s%")
                ->orWhere('module', 'like', "%$s%")
                ->orWhere('action', 'like', "%$s%")
                ->orWhere('description', 'like', "%$s%")
            ))
            ->when($request->module, fn ($q, $v) => $q->where('module', $v))
            ->when($request->from, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->latest('id')
            ->paginate($request->integer('per_page') ?: 10);
    }

    public function stats()
    {
        $todayStart = now()->startOfDay();
        $yesterdayStart = now()->subDay()->startOfDay();

        $eventsToday = ActivityLog::where('created_at', '>=', $todayStart)->count();
        $eventsYesterday = ActivityLog::whereBetween('created_at', [$yesterdayStart, $todayStart])->count();
        $eventsTrend = $eventsYesterday > 0 ? round((($eventsToday - $eventsYesterday) / $eventsYesterday) * 100, 1) : null;

        $securityAlerts = ActivityLog::where('created_at', '>=', $todayStart)->where('action', 'delete')->count();

        $userIds = User::pluck('id');
        $activeUsers = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->whereIn('tokenable_id', $userIds)
            ->where('last_used_at', '>=', now()->subMinutes(15))
            ->distinct('tokenable_id')
            ->count('tokenable_id');

        $since = now()->subHours(24);
        $buckets = array_fill(0, 24, 0);
        foreach (ActivityLog::where('created_at', '>=', $since)->get(['created_at']) as $log) {
            $buckets[(int) $log->created_at->format('G')]++;
        }
        $maxCount = max($buckets);
        $hourly = [];
        foreach ($buckets as $hour => $count) {
            $hourly[] = ['hour' => $hour, 'count' => $count, 'percent' => $maxCount > 0 ? round($count / $maxCount * 100) : 0];
        }
        $peakHour = $maxCount > 0 ? array_search($maxCount, $buckets) : null;
        $peakLabel = $peakHour !== null
            ? Carbon::createFromTime((int) $peakHour)->format('g A') . ' - ' . Carbon::createFromTime(((int) $peakHour + 1) % 24)->format('g A')
            : null;

        $modules = ActivityLog::select('module')->distinct()->orderBy('module')->pluck('module');

        return [
            'events_today' => $eventsToday,
            'events_trend' => $eventsTrend,
            'security_alerts' => $securityAlerts,
            'active_users' => $activeUsers,
            'hourly' => $hourly,
            'peak_label' => $peakLabel,
            'modules' => $modules,
        ];
    }
}
