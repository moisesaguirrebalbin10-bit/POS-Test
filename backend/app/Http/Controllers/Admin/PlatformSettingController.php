<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Services\PlatformActivityLogger;
use Illuminate\Http\Request;

class PlatformSettingController extends Controller
{
    public function show()
    {
        return PlatformSetting::current();
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'default_currency' => ['required', 'in:PEN'],
            'default_igv_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'trial_days' => ['required', 'integer', 'min:1', 'max:90'],
        ]);

        $settings = PlatformSetting::current();
        $settings->update($data);

        PlatformActivityLogger::log($request->user(), 'settings', 'update', "Actualizo la configuracion global: IGV {$data['default_igv_percent']}%, prueba de {$data['trial_days']} dias.");

        return $settings;
    }
}
