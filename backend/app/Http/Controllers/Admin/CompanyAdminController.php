<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\Plan;
use App\Models\PlatformSetting;
use App\Models\Sale;
use App\Models\Subscription;
use App\Models\User;
use App\Models\VoucherSequence;
use App\Services\PlatformActivityLogger;
use App\Services\TenantProvisioner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CompanyAdminController extends Controller
{
    public function index(Request $request)
    {
        return Company::with(['plan:id,name', 'owner:id,name,email'])
            ->withCount('users')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%$s%"))
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->plan_id, fn ($q, $v) => $q->where('plan_id', $v))
            ->latest()
            ->paginate($request->integer('per_page') ?: 20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:150'],
            'owner_name' => ['required', 'string', 'max:150'],
            'owner_email' => ['required', 'email', 'unique:users,email'],
            'plan_id' => ['nullable', 'exists:plans,id'],
        ]);

        $tempPassword = Str::random(12);

        [$user, $company] = DB::transaction(function () use ($data, $tempPassword, $request) {
            $settings = PlatformSetting::current();
            $company = Company::create([
                'name' => $data['company_name'],
                'slug' => Str::slug($data['company_name']) . '-' . Str::random(6),
                'license_key' => Company::generateLicenseKey(),
                'status' => 'trial',
                'trial_ends_at' => now()->addDays($settings->trial_days),
                'plan_id' => $data['plan_id'] ?? Plan::where('key', 'basico')->value('id'),
                'igv_percent' => $settings->default_igv_percent,
            ])->fresh();

            $roles = TenantProvisioner::provisionDefaultRoles($company);

            $user = new User([
                'name' => $data['owner_name'],
                'email' => $data['owner_email'],
                'password' => Hash::make($tempPassword),
                'active' => true,
            ]);
            $user->company_id = $company->id;
            $user->save();
            $user->roles()->sync([$roles['admin']->id]);

            $company->update(['owner_user_id' => $user->id]);

            VoucherSequence::create(['series' => $company->voucher_series, 'current_number' => $company->voucher_start_number - 1]);
            Subscription::create(['plan_id' => $company->plan_id, 'status' => 'trialing', 'trial_ends_at' => $company->trial_ends_at]);

            PlatformActivityLogger::log($request->user(), 'companies', 'create', "Creo la empresa \"{$company->name}\" con dueno {$user->email}.");

            return [$user, $company];
        });

        return response()->json([
            'company' => $company->load(['plan', 'owner']),
            'owner_email' => $user->email,
            'temporary_password' => $tempPassword,
        ], 201);
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
