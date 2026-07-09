<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Company extends Model
{
    protected $fillable = [
        'name', 'slug', 'license_key', 'ruc', 'phone', 'address', 'slogan', 'logo_path',
        'igv_percent', 'tip_enabled', 'default_tip', 'voucher_series', 'voucher_start_number',
        'ticket_width', 'owner_user_id', 'status', 'business_type', 'business_type_selected_at', 'trial_ends_at', 'plan_id',
    ];

    protected $casts = [
        'igv_percent' => 'decimal:2',
        'tip_enabled' => 'boolean',
        'default_tip' => 'decimal:2',
        'trial_ends_at' => 'datetime',
        'business_type_selected_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function isTrialExpired(): bool
    {
        return $this->status === 'trial' && $this->trial_ends_at && $this->trial_ends_at->isPast();
    }

    public function isRestaurant(): bool
    {
        return $this->business_type === 'restaurant';
    }

    public function needsBusinessTypeOnboarding(): bool
    {
        return is_null($this->business_type_selected_at);
    }

    public static function generateLicenseKey(): string
    {
        do {
            $key = 'OPTI-' . Str::upper(Str::random(4)) . '-' . Str::upper(Str::random(4));
        } while (self::where('license_key', $key)->exists());

        return $key;
    }
}
