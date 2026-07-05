<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogAdminController extends Controller
{
    public function index(Request $request)
    {
        return ActivityLog::with('user:id,name', 'company:id,name')
            ->when($request->company_id, fn ($q, $v) => $q->where('company_id', $v))
            ->when($request->module, fn ($q, $v) => $q->where('module', $v))
            ->latest()
            ->paginate(30);
    }
}
