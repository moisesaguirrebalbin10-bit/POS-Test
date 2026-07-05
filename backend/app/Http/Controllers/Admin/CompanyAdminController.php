<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\Sale;
use App\Services\PlatformActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyAdminController extends Controller
{
    public function index(Request $request)
    {
        return Company::with(['plan:id,name', 'owner:id,name,email'])
            ->withCount('users')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%$s%"))
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->latest()
            ->paginate(20);
    }

    public function show(Company $company)
    {
        $company->load(['plan', 'owner:id,name,email', 'users:id,name,email,company_id,active']);

        return [
            'company' => $company,
            'sales_total' => (float) Sale::where('company_id', $company->id)->sum('total'),
            'sales_count' => Sale::where('company_id', $company->id)->count(),
            'activity_logs' => ActivityLog::where('company_id', $company->id)->latest()->limit(50)->get(),
        ];
    }

    public function updateStatus(Request $request, Company $company)
    {
        $data = $request->validate(['status' => [Rule::in(['trial', 'active', 'past_due', 'suspended', 'cancelled'])]]);
        $company->update(['status' => $data['status']]);

        PlatformActivityLogger::log($request->user(), 'companies', 'update-status', "Cambio el estado de \"{$company->name}\" a \"{$data['status']}\".");

        return $company->fresh(['plan', 'owner']);
    }
}
