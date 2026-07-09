<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke()
    {
        return [
            'summary' => $this->summary(),
            'daily_sales' => Sale::selectRaw('date(created_at) as date, sum(total) as total')->groupBy('date')->orderBy('date')->limit(30)->get(),
            'top_products' => SaleItem::select('product_name', DB::raw('sum(quantity) as quantity'))->groupBy('product_name')->orderByDesc('quantity')->limit(10)->get(),
            'payment_methods' => Sale::select('payment_method', DB::raw('count(*) as count, sum(total) as total'))->groupBy('payment_method')->get(),
            'income_expense' => CashMovement::selectRaw('date(created_at) as date, type, sum(amount) as total')->groupBy('date', 'type')->orderBy('date')->limit(30)->get(),
            'low_stock_by_category' => Product::join('categories', 'categories.id', '=', 'products.category_id')
                ->where(fn ($q) => $q->whereNull('products.type')->orWhere('products.type', '!=', 'plato'))
                ->whereColumn('products.stock', '<=', 'products.min_stock')
                ->select('categories.name', DB::raw('count(*) as total'))
                ->groupBy('categories.name')->get(),
            'last_sale' => Sale::latest()->first(['id', 'created_at', 'total']),
            'sales_by_hour' => $this->salesByHour(),
        ];
    }

    private function salesByHour(): array
    {
        $openRegister = CashRegister::where('status', 'open')->latest()->first();
        $now = now();
        $start = $openRegister ? Carbon::parse($openRegister->opened_at) : $now->copy()->startOfDay();
        // Un turno olvidado abierto desde un dia anterior no debe generar un grafico de 30+ horas;
        // en ese caso mostramos solo lo transcurrido hoy.
        if ($start->diffInHours($now) > 20) {
            $start = $now->copy()->startOfDay();
        }

        $sales = Sale::where('created_at', '>=', $start)->get(['created_at', 'total']);

        $points = [];
        $running = 0.0;
        $cursor = $start->copy()->minute(0)->second(0);
        while ($cursor->lte($now)) {
            $bucketEnd = $cursor->copy()->addHour();
            $running += (float) $sales->filter(fn ($s) => $s->created_at->gte($cursor) && $s->created_at->lt($bucketEnd))->sum('total');
            $points[] = ['hour' => $cursor->format('H:i'), 'total' => round($running, 2)];
            $cursor = $bucketEnd;
        }
        $points[] = ['hour' => $now->format('H:i'), 'total' => round((float) $sales->sum('total'), 2)];

        return $points;
    }

    public function trends(Request $request)
    {
        $period = in_array($request->period, ['day', 'week', 'month', 'year']) ? $request->period : 'day';
        $groupExpr = match ($period) {
            'week' => "strftime('%Y-%W', sales.created_at)",
            'month' => "strftime('%Y-%m', sales.created_at)",
            'year' => "strftime('%Y', sales.created_at)",
            default => "date(sales.created_at)",
        };

        $baseQuery = fn () => SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->when($request->category_id, fn ($q, $v) => $q->where('products.category_id', $v));

        $rows = $baseQuery()
            ->when($request->from, fn ($q, $v) => $q->whereDate('sales.created_at', '>=', $v))
            ->when($request->to, fn ($q, $v) => $q->whereDate('sales.created_at', '<=', $v))
            ->selectRaw("$groupExpr as period_key, min(date(sales.created_at)) as period_start, sum(sale_items.total) as sales, sum(sale_items.total - (sale_items.unit_cost * sale_items.quantity)) as profit, count(distinct sales.id) as orders")
            ->groupBy('period_key')->orderBy('period_start')->get();

        $totals = [
            'sales' => (float) $rows->sum('sales'),
            'profit' => (float) $rows->sum('profit'),
            'orders' => (int) $rows->sum('orders'),
        ];

        $previousTotals = null;
        $changes = ['sales' => 0.0, 'profit' => 0.0, 'orders' => 0.0];
        if ($request->from && $request->to) {
            $fromDate = Carbon::parse($request->from)->startOfDay();
            $toDate = Carbon::parse($request->to)->startOfDay();
            $days = $fromDate->diffInDays($toDate) + 1;
            $prevTo = $fromDate->copy()->subDay();
            $prevFrom = $prevTo->copy()->subDays($days - 1);

            $prevRow = $baseQuery()
                ->whereDate('sales.created_at', '>=', $prevFrom->toDateString())
                ->whereDate('sales.created_at', '<=', $prevTo->toDateString())
                ->selectRaw('coalesce(sum(sale_items.total), 0) as sales, coalesce(sum(sale_items.total - (sale_items.unit_cost * sale_items.quantity)), 0) as profit, count(distinct sales.id) as orders')
                ->first();

            $previousTotals = [
                'sales' => (float) $prevRow->sales,
                'profit' => (float) $prevRow->profit,
                'orders' => (int) $prevRow->orders,
            ];
            $changes = [
                'sales' => $this->percentChange($totals['sales'], $previousTotals['sales']),
                'profit' => $this->percentChange($totals['profit'], $previousTotals['profit']),
                'orders' => $this->percentChange($totals['orders'], $previousTotals['orders']),
            ];
        }

        return [
            'period' => $period,
            'rows' => $rows,
            'totals' => $totals,
            'previous_totals' => $previousTotals,
            'changes' => $changes,
            'categories' => Category::where('active', true)->orderBy('name')->get(['id', 'name']),
        ];
    }

    private function summary(): array
    {
        return [
            'low_stock_count' => Product::where(fn ($q) => $q->whereNull('type')->orWhere('type', '!=', 'plato'))->whereColumn('stock', '<=', 'min_stock')->count(),
        ];
    }

    private function percentChange(float $current, float $previous): float
    {
        if ($previous == 0.0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}

