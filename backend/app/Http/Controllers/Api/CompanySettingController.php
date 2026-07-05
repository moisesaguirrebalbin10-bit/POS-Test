<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VoucherSequence;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CompanySettingController extends Controller
{
    public function show()
    {
        return app('currentCompany');
    }

    public function branding()
    {
        $company = app('currentCompany');

        return ['name' => $company->name, 'slogan' => $company->slogan, 'logo_path' => $company->logo_path];
    }

    public function update(Request $request)
    {
        $company = app('currentCompany');
        $data = $request->validate([
            'name' => ['required'], 'ruc' => ['nullable'], 'phone' => ['nullable'],
            'address' => ['nullable'], 'slogan' => ['nullable'], 'logo_path' => ['nullable'],
            'igv_percent' => ['required', 'numeric', 'min:0'], 'tip_enabled' => ['boolean'],
            'default_tip' => ['numeric', 'min:0'], 'voucher_series' => ['required'],
            'voucher_start_number' => ['required', 'integer', 'min:1'], 'ticket_width' => ['in:58,80'],
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

