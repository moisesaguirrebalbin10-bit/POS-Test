<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;

class ActivityLogger
{
    public static function log(?User $user, string $module, string $action, string $description): void
    {
        ActivityLog::create([
            'user_id' => $user?->id,
            'user_name' => $user?->name ?? 'Sistema',
            'module' => $module,
            'action' => $action,
            'description' => $description,
        ]);
    }
}
