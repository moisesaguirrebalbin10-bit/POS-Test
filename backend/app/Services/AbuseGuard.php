<?php

namespace App\Services;

use App\Models\BlockedIp;
use Illuminate\Support\Facades\Cache;

class AbuseGuard
{
    // Si una IP dispara el limite de peticiones esta cantidad de veces dentro de
    // la ventana de abajo, se considera abuso sostenido (no un pico normal) y se
    // bloquea de forma permanente hasta que un Super Admin la desbloquee a mano.
    private const STRIKES_TO_BLOCK = 5;
    private const STRIKE_WINDOW_MINUTES = 10;

    /**
     * Se llama cada vez que el middleware de throttle rechaza una peticion por
     * exceso de velocidad. Lleva la cuenta de "strikes" por IP en cache; si se
     * pasa del umbral, la bloquea de forma permanente.
     */
    public function recordViolation(string $ip): void
    {
        if (BlockedIp::where('ip', $ip)->exists()) {
            return;
        }

        $key = "abuse-strikes:{$ip}";
        Cache::add($key, 0, now()->addMinutes(self::STRIKE_WINDOW_MINUTES));
        $strikes = Cache::increment($key);

        if ($strikes >= self::STRIKES_TO_BLOCK) {
            BlockedIp::create([
                'ip' => $ip,
                'reason' => 'Excedio el limite de peticiones repetidamente (posible ataque de sobrecarga o fuerza bruta).',
                'violations' => $strikes,
                'blocked_at' => now(),
            ]);
            Cache::forget($key);
            PlatformActivityLogger::log(null, 'security', 'block', "Se bloqueo automaticamente la IP {$ip} tras {$strikes} violaciones de rate limit en " . self::STRIKE_WINDOW_MINUTES . ' minutos.');
        }
    }
}
