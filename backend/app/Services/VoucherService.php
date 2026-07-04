<?php

namespace App\Services;

use App\Models\CompanySetting;
use App\Models\VoucherSequence;
use Illuminate\Support\Facades\DB;

class VoucherService
{
    public function next(): string
    {
        return DB::transaction(function () {
            $settings = CompanySetting::firstOrFail();
            $sequence = VoucherSequence::where('series', $settings->voucher_series)->lockForUpdate()->first();

            if (!$sequence) {
                $sequence = VoucherSequence::create([
                    'series' => $settings->voucher_series,
                    'current_number' => $settings->voucher_start_number - 1,
                ]);
            }

            $sequence->increment('current_number');

            return $sequence->series . str_pad((string) $sequence->current_number, 5, '0', STR_PAD_LEFT);
        });
    }
}

