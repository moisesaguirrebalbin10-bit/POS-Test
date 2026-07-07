<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\ExpenseIncome;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseIncomeController extends Controller
{
    private const INCOME_TYPES = ['sale', 'income'];

    public function index(Request $request)
    {
        return CashMovement::query()
            ->when($request->type === 'income', fn ($q) => $q->whereIn('type', self::INCOME_TYPES))
            ->when($request->type === 'expense', fn ($q) => $q->where('type', 'expense'))
            ->when($request->from, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('category', 'like', "%$s%")
                ->orWhere('description', 'like', "%$s%")
                ->orWhere('payment_method', 'like', "%$s%")
            ))
            ->latest()
            ->paginate($request->integer('per_page') ?: 30)
            ->through(fn (CashMovement $movement) => $this->presentMovement($movement));
    }

    public function stats()
    {
        $monthStart = now()->startOfMonth();
        $prevMonthStart = now()->subMonthNoOverflow()->startOfMonth();
        $prevMonthEnd = now()->subMonthNoOverflow()->endOfMonth();

        $incomeThisMonth = (float) CashMovement::whereIn('type', self::INCOME_TYPES)->where('created_at', '>=', $monthStart)->sum('amount');
        $incomePrevMonth = (float) CashMovement::whereIn('type', self::INCOME_TYPES)->whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])->sum('amount');
        $incomeTrend = $incomePrevMonth > 0 ? round((($incomeThisMonth - $incomePrevMonth) / $incomePrevMonth) * 100, 1) : null;

        $expenseThisMonth = (float) CashMovement::where('type', 'expense')->where('created_at', '>=', $monthStart)->sum('amount');
        $expensePrevMonth = (float) CashMovement::where('type', 'expense')->whereBetween('created_at', [$prevMonthStart, $prevMonthEnd])->sum('amount');
        $expenseTrend = $expensePrevMonth > 0 ? round((($expenseThisMonth - $expensePrevMonth) / $expensePrevMonth) * 100, 1) : null;

        $openRegister = CashRegister::where('status', 'open')->latest()->first();
        $cajaActual = 0;
        $cajaStatus = 'closed';
        if ($openRegister) {
            $cashMovements = $openRegister->movements()->where('payment_method', 'cash')->get();
            $income = $cashMovements->whereIn('type', self::INCOME_TYPES)->sum('amount');
            $expenses = $cashMovements->where('type', 'expense')->sum('amount');
            $cajaActual = round((float) $openRegister->opening_amount + $income - $expenses, 2);
            $cajaStatus = 'open';
        }

        $weekStart = now()->startOfWeek();
        $weeklyFlow = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $weekStart->copy()->addDays($i);
            $total = (float) CashMovement::whereDate('created_at', $day)->sum('amount');
            $weeklyFlow[] = ['day_index' => $i, 'total' => round($total, 2), 'is_weekend' => $day->isWeekend()];
        }

        $totalMonth = (float) CashMovement::where('created_at', '>=', $monthStart)->sum('amount');
        $paymentMethods = CashMovement::select('payment_method', DB::raw('sum(amount) as total'))
            ->where('created_at', '>=', $monthStart)
            ->groupBy('payment_method')->orderByDesc('total')->get()
            ->map(fn ($m) => [
                'method' => $m->payment_method,
                'total' => (float) $m->total,
                'percent' => $totalMonth > 0 ? (int) round(($m->total / $totalMonth) * 100) : 0,
            ]);

        return [
            'income_total' => round($incomeThisMonth, 2), 'income_trend' => $incomeTrend,
            'expense_total' => round($expenseThisMonth, 2), 'expense_trend' => $expenseTrend,
            'balance_net' => round($incomeThisMonth - $expenseThisMonth, 2),
            'caja_actual' => $cajaActual, 'caja_status' => $cajaStatus,
            'weekly_flow' => $weeklyFlow,
            'payment_methods' => $paymentMethods,
        ];
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $cash = CashRegister::where('user_id', $request->user()->id)->where('status', 'open')->latest()->first();
        abort_if(!$cash, 422, 'Debe abrir caja diaria antes de registrar ingresos o egresos.');

        return DB::transaction(function () use ($data, $request, $cash) {
            $record = ExpenseIncome::create([...$data, 'user_id' => $request->user()->id, 'cash_register_id' => $cash->id]);

            $movement = CashMovement::create([
                'cash_register_id' => $cash->id,
                'user_id' => $request->user()->id,
                'source_type' => ExpenseIncome::class,
                'source_id' => $record->id,
                'type' => $record->type,
                'category' => $record->category,
                'description' => $record->description,
                'amount' => $record->amount,
                'payment_method' => $record->payment_method,
            ]);

            $label = $record->type === 'expense' ? 'egreso' : 'ingreso';
            ActivityLogger::log($request->user(), 'expenses-income', 'create', "Registro un {$label} de S/ {$record->amount} ({$record->category}).");

            return response()->json($this->presentMovement($movement), 201);
        });
    }

    public function show(ExpenseIncome $expenseIncome)
    {
        return $expenseIncome;
    }

    public function update(Request $request, ExpenseIncome $expenseIncome)
    {
        $data = $this->validated($request, updating: true);

        return DB::transaction(function () use ($data, $expenseIncome, $request) {
            $expenseIncome->update($data);
            ActivityLogger::log($request->user(), 'expenses-income', 'update', "Edito el movimiento \"{$expenseIncome->description}\".");
            $movement = CashMovement::where('source_type', ExpenseIncome::class)->where('source_id', $expenseIncome->id)->first();
            if ($movement) {
                $movement->update([
                    'type' => $expenseIncome->type,
                    'category' => $expenseIncome->category,
                    'description' => $expenseIncome->description,
                    'amount' => $expenseIncome->amount,
                    'payment_method' => $expenseIncome->payment_method,
                ]);
            }

            return $this->presentMovement($movement ?? CashMovement::make([
                'source_type' => ExpenseIncome::class,
                'source_id' => $expenseIncome->id,
                'type' => $expenseIncome->type,
                'category' => $expenseIncome->category,
                'description' => $expenseIncome->description,
                'amount' => $expenseIncome->amount,
                'payment_method' => $expenseIncome->payment_method,
                'created_at' => $expenseIncome->date,
            ]));
        });
    }

    public function destroy(Request $request, ExpenseIncome $expenseIncome)
    {
        return DB::transaction(function () use ($expenseIncome, $request) {
            CashMovement::where('source_type', ExpenseIncome::class)->where('source_id', $expenseIncome->id)->delete();
            $expenseIncome->delete();
            ActivityLogger::log($request->user(), 'expenses-income', 'delete', "Elimino el movimiento \"{$expenseIncome->description}\".");
            return response()->noContent();
        });
    }

    private function validated(Request $request, bool $updating = false): array
    {
        $required = $updating ? 'sometimes' : 'required';
        return $request->validate([
            'type' => [$required, 'in:income,expense'],
            'category' => [$required, 'string'],
            'description' => [$required, 'string'],
            'amount' => [$required, 'numeric', 'min:0.01'],
            'date' => [$required, 'date'],
            'payment_method' => [$required, 'in:cash,yape,plin,card,transfer'],
            'receipt_path' => ['nullable'],
            'observation' => ['nullable'],
        ]);
    }

    private function presentMovement(CashMovement $movement): array
    {
        $manual = $movement->source_type === ExpenseIncome::class;
        return [
            'id' => $manual ? $movement->source_id : $movement->id,
            'movement_id' => $movement->id,
            'type' => $movement->type,
            'type_label' => $movement->type === 'expense' ? 'Egreso' : 'Ingreso',
            'category' => $movement->category,
            'description' => $movement->description,
            'amount' => $movement->amount,
            'payment_method' => $movement->payment_method,
            'date' => optional($movement->created_at)->toDateString(),
            'created_at' => $movement->created_at,
            'editable' => $manual,
            'source' => $manual ? 'Manual' : 'Venta',
        ];
    }
}