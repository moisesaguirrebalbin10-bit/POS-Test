<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\VoucherSequence;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CompanySettingController extends Controller
{
    public function show()
    {
        $company = app('currentCompany')->load('owner');
        $sequence = VoucherSequence::where('series', $company->voucher_series)->first();
        $nextNumber = ($sequence->current_number ?? ($company->voucher_start_number - 1)) + 1;
        $lastAudit = ActivityLog::where('module', 'company-settings')->latest()->first();

        return [
            ...$company->toArray(),
            'owner_email' => $company->owner?->email,
            'next_voucher_number' => $company->voucher_series . str_pad((string) $nextNumber, 5, '0', STR_PAD_LEFT),
            'last_audit' => $lastAudit ? [
                'description' => $lastAudit->description,
                'user_name' => $lastAudit->user_name,
                'created_at' => $lastAudit->created_at,
            ] : null,
        ];
    }

    public function branding()
    {
        $company = app('currentCompany');

        return [
            'name' => $company->name, 'slogan' => $company->slogan, 'logo_path' => $company->logo_path,
            'business_type' => $company->business_type, 'business_type_selected_at' => $company->business_type_selected_at,
            'igv_percent' => $company->igv_percent,
        ];
    }

    public function selectBusinessType(Request $request)
    {
        $data = $request->validate(['business_type' => ['required', 'in:market,restaurant']]);
        $company = app('currentCompany');
        $company->update(['business_type' => $data['business_type'], 'business_type_selected_at' => now()]);
        ActivityLogger::log($request->user(), 'company-settings', 'onboarding', "Eligio el modo de sistema: " . ($data['business_type'] === 'restaurant' ? 'Restaurante' : 'Market') . '.');

        return $company->fresh();
    }

    public function update(Request $request)
    {
        $company = app('currentCompany');
        $data = $request->validate([
            'name' => ['required'], 'ruc' => ['nullable'], 'phone' => ['nullable'],
            'address' => ['nullable'], 'slogan' => ['nullable'], 'logo_path' => ['nullable'],
            'voucher_show_logo' => ['boolean'], 'voucher_logo_size' => ['in:small,medium,large'],
            'igv_percent' => ['required', 'numeric', 'min:0'], 'tip_enabled' => ['boolean'],
            'default_tip' => ['numeric', 'min:0'], 'voucher_series' => ['required'],
            'voucher_start_number' => ['required', 'integer', 'min:1'], 'ticket_width' => ['in:58,80'],
            'business_type' => ['in:market,restaurant'],
        ]);
        $company->update($data);
        VoucherSequence::firstOrCreate(['company_id' => $company->id, 'series' => $company->voucher_series], ['current_number' => $company->voucher_start_number - 1]);
        ActivityLogger::log($request->user(), 'company-settings', 'update', 'Edito la configuracion de la empresa / sistema.');
        return $company->fresh();
    }

    public function uploadLogo(Request $request)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $file = $data['image'];
        $directory = public_path('assets/company');
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $name = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $filename = $name . '-' . now()->format('YmdHis') . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
        $file->move($directory, $filename);

        return response()->json([
            'path' => 'assets/company/' . $filename,
            'url' => url('assets/company/' . $filename),
        ], 201);
    }
}

