<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\PlatformNotification;
use Illuminate\Console\Command;

class CheckPlatformAlerts extends Command
{
    protected $signature = 'platform:check-alerts';
    protected $description = 'Revisa empresas con pruebas por vencer y genera notificaciones para el panel administrativo.';

    public function handle(): void
    {
        $expiringSoon = Company::where('status', 'trial')
            ->whereNotNull('trial_ends_at')
            ->whereBetween('trial_ends_at', [now(), now()->addDays(3)])
            ->get();

        foreach ($expiringSoon as $company) {
            $alreadyNotified = PlatformNotification::where('type', 'trial_expiring')
                ->where('link', "/admin/companies/{$company->id}")
                ->where('created_at', '>=', now()->subDay())
                ->exists();

            if ($alreadyNotified) {
                continue;
            }

            PlatformNotification::create([
                'type' => 'trial_expiring',
                'title' => 'Prueba por vencer',
                'message' => "La prueba gratuita de \"{$company->name}\" vence el {$company->trial_ends_at->format('d/m/Y')}.",
                'link' => "/admin/companies/{$company->id}",
            ]);
        }

        $this->info("Revisadas {$expiringSoon->count()} empresas con prueba por vencer.");
    }
}
