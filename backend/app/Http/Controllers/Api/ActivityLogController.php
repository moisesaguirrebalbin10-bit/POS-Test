<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

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
            ->latest('id')
            ->paginate(30);
    }
}
