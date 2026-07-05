<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentAdminController extends Controller
{
    public function index(Request $request)
    {
        return Payment::with(['subscription.plan', 'company:id,name'])
            ->when($request->company_id, fn ($q, $v) => $q->where('company_id', $v))
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->latest()
            ->paginate(30);
    }
}
