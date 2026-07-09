<?php

namespace App\Http\Controllers\Api;

use App\Events\CashRegisterStatusChanged;
use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\Sale;
use App\Services\ActivityLogger;
use App\Support\Broadcaster;
use Illuminate\Http\Request;

class CashRegisterController extends Controller
{
    public function index(Request $request)
    {
        return CashRegister::with('movements')->when($request->date, fn ($q, $v) => $q->whereDate('date', $v))->latest()->paginate(20);
    }

    public function stats(Request $request)
    {
        $current = CashRegister::where('user_id', $request->user()->id)->where('status', 'open')->latest()->first();
        $estimatedBalance = 0;
        if ($current) {
            $cashMovements = $current->movements()->where('payment_method', 'cash')->get();
            $income = $cashMovements->whereIn('type', ['sale', 'income'])->sum('amount');
            $expenses = $cashMovements->where('type', 'expense')->sum('amount');
            $estimatedBalance = round((float) $current->opening_amount + $income - $expenses, 2);
        }

        return [
            'is_open' => (bool) $current,
            'current_id' => $current?->id,
            'estimated_balance' => $estimatedBalance,
            'opened_at' => $current?->opened_at,
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate(['opening_amount' => ['required', 'numeric', 'min:0']]);
        abort_if(CashRegister::where('user_id', $request->user()->id)->where('status', 'open')->exists(), 422, 'Ya existe una caja abierta.');

        $cashRegister = CashRegister::create([
            'date' => now()->toDateString(),
            'user_id' => $request->user()->id,
            'opening_amount' => $data['opening_amount'],
            'opened_at' => now(),
            'status' => 'open',
        ]);
        ActivityLogger::log($request->user(), 'cash', 'open', "Abrio caja con S/ {$data['opening_amount']}.");
        Broadcaster::send(fn () => broadcast(new CashRegisterStatusChanged($cashRegister, $request->user()->name))->toOthers());
        return response()->json($cashRegister, 201);
    }

    public function show(CashRegister $cashRegister)
    {
        return $cashRegister->load('movements');
    }

    public function turno(CashRegister $cashRegister)
    {
        $sales = Sale::with(['cashier', 'tableOrder', 'items'])
            ->where('cash_register_id', $cashRegister->id)
            ->withCount('items')
            ->orderByDesc('created_at')
            ->get();

        $orders = $sales->map(fn (Sale $sale) => [
            'id' => $sale->id,
            'code' => $sale->voucher_number,
            'type' => $sale->tableOrder->type ?? 'venta',
            'type_label' => $sale->tableOrder?->typeLabel() ?? 'Venta',
            'reference' => $sale->table_name ?? $sale->customer_name,
            'items_count' => $sale->items_count,
            'payment_method' => $sale->payment_method,
            'total' => $sale->total,
            'cashier' => $sale->cashier?->name,
            'created_at' => $sale->created_at,
        ]);

        $expenses = $cashRegister->movements()->where('type', 'expense')->latest()->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'category' => $m->category,
                'description' => $m->description,
                'amount' => $m->amount,
                'created_at' => $m->created_at,
            ]);

        return [
            'orders' => $orders,
            'orders_total' => $orders->count(),
            'expenses' => $expenses,
            'expenses_total' => (float) $expenses->sum('amount'),
        ];
    }

    public function update(Request $request, CashRegister $cashRegister)
    {
        abort_if($cashRegister->status === 'closed' && !$request->user()->hasPermission('cash.override'), 403, 'Caja cerrada.');
        $cashRegister->update($request->validate(['observations' => ['nullable']]));
        return $cashRegister;
    }

    public function close(Request $request, CashRegister $cashRegister)
    {
        $data = $request->validate(['counted_amount' => ['required', 'numeric', 'min:0'], 'observations' => ['nullable']]);
        $cashMovements = $cashRegister->movements()->where('payment_method', 'cash')->get();
        $income = $cashMovements->whereIn('type', ['sale', 'income'])->sum('amount');
        $expenses = $cashMovements->where('type', 'expense')->sum('amount');
        $expected = (float) $cashRegister->opening_amount + $income - $expenses;

        $cashRegister->update([
            'counted_amount' => $data['counted_amount'],
            'difference' => round((float) $data['counted_amount'] - $expected, 2),
            'observations' => $data['observations'] ?? null,
            'closed_at' => now(),
            'status' => 'closed',
        ]);

        ActivityLogger::log($request->user(), 'cash', 'close', "Cerro caja con S/ {$data['counted_amount']} contado (diferencia: S/ {$cashRegister->difference}).");
        Broadcaster::send(fn () => broadcast(new CashRegisterStatusChanged($cashRegister, $request->user()->name))->toOthers());

        return $cashRegister->load('movements');
    }

    public function destroy(CashRegister $cashRegister)
    {
        abort(405, 'No se elimina una caja; se cierra.');
    }
}

