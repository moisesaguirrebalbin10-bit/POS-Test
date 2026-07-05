<?php

return [
    'defaults' => ['guard' => 'web', 'passwords' => 'users'],
    'guards' => [
        'web' => ['driver' => 'session', 'provider' => 'users'],
        // Sin 'provider': el token de Sanctum acepta cualquier modelo con HasApiTokens
        // (User de una empresa cliente o PlatformAdmin del panel administrativo).
        'sanctum' => ['driver' => 'sanctum'],
    ],
    'providers' => ['users' => ['driver' => 'eloquent', 'model' => App\Models\User::class]],
    'passwords' => ['users' => ['provider' => 'users', 'table' => 'password_reset_tokens', 'expire' => 60, 'throttle' => 60]],
];
