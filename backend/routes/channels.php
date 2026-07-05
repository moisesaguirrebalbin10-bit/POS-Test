<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('company.{companyId}', function ($user, $companyId) {
    return (int) $user->company_id === (int) $companyId;
});
