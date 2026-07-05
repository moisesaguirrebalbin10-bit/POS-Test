<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformNotification;

class NotificationController extends Controller
{
    public function index()
    {
        return [
            'unread_count' => PlatformNotification::whereNull('read_at')->count(),
            'notifications' => PlatformNotification::latest()->limit(30)->get(),
        ];
    }

    public function markRead(PlatformNotification $notification)
    {
        $notification->update(['read_at' => now()]);
        return $notification;
    }
}
