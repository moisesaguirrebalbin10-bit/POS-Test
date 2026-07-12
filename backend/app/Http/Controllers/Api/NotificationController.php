<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        NotificationService::reconcileOrderDelays(app('currentCompanyId'));

        return [
            'unread_count' => Notification::whereNull('read_at')->count(),
            'notifications' => Notification::latest()->limit(10)->get(),
        ];
    }

    public function all(Request $request)
    {
        return Notification::latest()->paginate($request->integer('per_page') ?: 20);
    }

    public function markRead(Notification $notification)
    {
        $notification->update(['read_at' => now()]);
        return $notification;
    }

    public function markAllRead()
    {
        Notification::whereNull('read_at')->update(['read_at' => now()]);
        return ['ok' => true];
    }
}
