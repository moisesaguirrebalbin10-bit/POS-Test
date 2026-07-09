<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Plan;
use App\Models\PlatformNotification;
use App\Models\PlatformSetting;
use App\Models\Subscription;
use App\Models\User;
use App\Models\VoucherSequence;
use App\Services\ActivityLogger;
use App\Services\TenantProvisioner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RegisterController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:150'],
            'owner_name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        [$user, $company] = DB::transaction(function () use ($data) {
            $settings = PlatformSetting::current();
            $company = Company::create([
                'name' => $data['company_name'],
                'slug' => Str::slug($data['company_name']) . '-' . Str::random(6),
                'license_key' => Company::generateLicenseKey(),
                'status' => 'trial',
                'trial_ends_at' => now()->addDays($settings->trial_days),
                'plan_id' => Plan::where('key', 'profesional')->value('id'),
                'igv_percent' => $settings->default_igv_percent,
            ])->fresh();

            $roles = TenantProvisioner::provisionDefaultRoles($company);

            $user = new User([
                'name' => $data['owner_name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'active' => true,
            ]);
            $user->company_id = $company->id;
            $user->save();
            $user->roles()->sync([$roles['admin']->id]);

            $company->update(['owner_user_id' => $user->id]);

            VoucherSequence::create(['series' => $company->voucher_series, 'current_number' => $company->voucher_start_number - 1]);
            Subscription::create(['plan_id' => $company->plan_id, 'status' => 'trialing', 'trial_ends_at' => $company->trial_ends_at]);

            ActivityLogger::log($user, 'auth', 'register', "Registro la empresa \"{$company->name}\" y creo su cuenta.");

            PlatformNotification::create([
                'type' => 'company_registered',
                'title' => 'Nueva empresa registrada',
                'message' => "\"{$company->name}\" se registro y empezo su prueba gratuita.",
                'link' => "/admin/companies/{$company->id}",
            ]);

            return [$user, $company];
        });

        return response()->json([
            'token' => $user->createToken('optiuso')->plainTextToken,
            'user' => $user->load('roles.permissions', 'company'),
            'license_key' => $company->license_key,
        ], 201);
    }
}
