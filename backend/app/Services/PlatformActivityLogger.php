<?php

namespace App\Services;

use App\Models\PlatformActivityLog;
use App\Models\PlatformAdmin;

class PlatformActivityLogger
{
    public static function log(?PlatformAdmin $admin, string $module, string $action, string $description): void
    {
        PlatformActivityLog::create([
            'platform_admin_id' => $admin?->id,
            'admin_name' => $admin?->name ?? 'Sistema',
            'module' => $module,
            'action' => $action,
            'description' => $description,
        ]);
    }
}
