<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExpenseIncome;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function show(string $type, Request $request)
    {
        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to = $request->query('to', now()->toDateString());

        return match ($type) {
            'sales-by-day' => Sale::selectRaw('date(created_at) date, sum(total) total')->whereBetween(DB::raw('date(created_at)'), [$from, $to])->groupBy('date')->get(),
            'top-products' => SaleItem::select('product_name', DB::raw('sum(quantity) quantity, sum(total) total'))->groupBy('product_name')->orderByDesc('quantity')->get(),
            'income' => ExpenseIncome::where('type', 'income')->whereBetween('date', [$from, $to])->get(),
            'expenses' => ExpenseIncome::where('type', 'expense')->whereBetween('date', [$from, $to])->get(),
            'profit' => SaleItem::selectRaw('product_name, sum(total - (unit_cost * quantity)) as profit')->groupBy('product_name')->orderByDesc('profit')->get(),
            'stock' => Product::with('category', 'warehouse')->get(),
            'low-stock' => Product::with('category', 'warehouse')->where(fn ($q) => $q->whereNull('type')->orWhere('type', '!=', 'plato'))->whereColumn('stock', '<=', 'min_stock')->get(),
            'sales-by-user' => Sale::join('users', 'users.id', '=', 'sales.user_id')->selectRaw('users.name, sum(total) total')->groupBy('users.name')->get(),
            'sales-by-payment' => Sale::selectRaw('payment_method, sum(total) total')->groupBy('payment_method')->get(),
            default => abort(404, 'Reporte no encontrado.'),
        };
    }

    public function analytics(Request $request)
    {
        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to = $request->query('to', now()->toDateString());

        $totalSales = (float) Sale::whereBetween(DB::raw('date(created_at)'), [$from, $to])->sum('total');
        $orderCount = Sale::whereBetween(DB::raw('date(created_at)'), [$from, $to])->count();
        $avgTicket = $orderCount > 0 ? round($totalSales / $orderCount, 2) : 0;

        $days = (int) (strtotime($to) - strtotime($from)) / 86400 + 1;
        $prevFrom = date('Y-m-d', strtotime($from . " -{$days} days"));
        $prevTo = date('Y-m-d', strtotime($from . ' -1 day'));
        $prevSales = Sale::whereBetween(DB::raw('date(created_at)'), [$prevFrom, $prevTo])->get();
        $prevTotal = (float) $prevSales->sum('total');
        $salesTrend = $prevTotal > 0 ? round((($totalSales - $prevTotal) / $prevTotal) * 100, 1) : null;
        $prevOrderCount = $prevSales->count();
        $prevAvgTicket = $prevOrderCount > 0 ? $prevTotal / $prevOrderCount : 0;
        $avgTicketTrend = $prevAvgTicket > 0 ? round((($avgTicket - $prevAvgTicket) / $prevAvgTicket) * 100, 1) : null;

        $saleIds = Sale::whereBetween(DB::raw('date(created_at)'), [$from, $to])->pluck('id');
        $items = SaleItem::whereIn('sale_id', $saleIds)->get();
        $revenue = (float) $items->sum('total');
        $cost = (float) $items->sum(fn ($i) => (float) $i->unit_cost * (float) $i->quantity);
        $grossMarginPercent = $revenue > 0 ? round((($revenue - $cost) / $revenue) * 100, 1) : 0;

        $prevSaleIds = Sale::whereBetween(DB::raw('date(created_at)'), [$prevFrom, $prevTo])->pluck('id');
        $prevItems = SaleItem::whereIn('sale_id', $prevSaleIds)->get();
        $prevRevenue = (float) $prevItems->sum('total');
        $prevCost = (float) $prevItems->sum(fn ($i) => (float) $i->unit_cost * (float) $i->quantity);
        $marginTrend = $prevRevenue > 0 ? round($grossMarginPercent - ((($prevRevenue - $prevCost) / $prevRevenue) * 100), 1) : null;

        $topProduct = SaleItem::whereIn('sale_id', $saleIds)
            ->select('product_name', DB::raw('sum(quantity) as qty'))
            ->groupBy('product_name')->orderByDesc('qty')->first();

        $dailyTrend = Sale::selectRaw('date(created_at) as date, sum(total) as total')
            ->whereBetween(DB::raw('date(created_at)'), [$from, $to])
            ->groupBy('date')->orderBy('date')->get()
            ->map(fn ($d) => ['date' => $d->date, 'total' => (float) $d->total]);

        $categoryTotals = SaleItem::whereIn('sale_items.sale_id', $saleIds)
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->select('categories.name as category', DB::raw('sum(sale_items.total) as total'))
            ->groupBy('categories.name')->orderByDesc('total')->get();
        $categoryGrandTotal = (float) $categoryTotals->sum('total');

        return [
            'total_sales' => round($totalSales, 2), 'sales_trend' => $salesTrend,
            'avg_ticket' => $avgTicket, 'avg_ticket_trend' => $avgTicketTrend, 'order_count' => $orderCount,
            'gross_margin_percent' => $grossMarginPercent, 'margin_trend' => $marginTrend,
            'top_product' => $topProduct?->product_name, 'top_product_qty' => (float) ($topProduct->qty ?? 0),
            'daily_trend' => $dailyTrend,
            'categories' => $categoryTotals->map(fn ($c) => [
                'name' => $c->category,
                'total' => (float) $c->total,
                'percent' => $categoryGrandTotal > 0 ? (int) round(($c->total / $categoryGrandTotal) * 100) : 0,
            ]),
            'category_total' => round($categoryGrandTotal, 2),
        ];
    }

    public function transactions(Request $request)
    {
        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to = $request->query('to', now()->toDateString());
        $perPage = $request->integer('per_page') ?: 10;

        $igvPercent = (float) app('currentCompany')->igv_percent;
        $saleIds = Sale::whereBetween(DB::raw('date(created_at)'), [$from, $to])->pluck('id');

        $paginated = SaleItem::whereIn('sale_items.sale_id', $saleIds)
            ->leftJoin('products', 'products.id', '=', 'sale_items.product_id')
            ->select(
                'sale_items.product_name',
                DB::raw('max(products.sku) as sku'),
                DB::raw('sum(sale_items.quantity) as quantity'),
                DB::raw('sum(sale_items.total) as total'),
                DB::raw('max(sale_items.created_at) as last_date')
            )
            ->groupBy('sale_items.product_name')
            ->orderByDesc('total')
            ->paginate($perPage);

        $paginated->getCollection()->transform(function ($row) use ($igvPercent) {
            $total = (float) $row->total;
            $subtotal = round($total / (1 + $igvPercent / 100), 2);
            return [
                'product_name' => $row->product_name,
                'sku' => $row->sku,
                'quantity' => (float) $row->quantity,
                'subtotal' => $subtotal,
                'igv' => round($total - $subtotal, 2),
                'total' => round($total, 2),
                'date' => $row->last_date,
            ];
        });

        return [
            'data' => $paginated->items(),
            'total' => $paginated->total(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'igv_percent' => $igvPercent,
        ];
    }

    public function peakHours(Request $request)
    {
        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to = $request->query('to', now()->toDateString());

        $timestamps = Sale::whereBetween(DB::raw('date(created_at)'), [$from, $to])->pluck('created_at');
        $buckets = array_fill(0, 24, 0);
        foreach ($timestamps as $createdAt) {
            $buckets[(int) $createdAt->format('H')]++;
        }

        $topHours = collect($buckets)
            ->map(fn ($count, $hour) => ['hour' => $hour, 'count' => $count])
            ->sortByDesc('count')
            ->take(4)
            ->filter(fn ($h) => $h['count'] > 0)
            ->values();

        $maxCount = (int) ($topHours->max('count') ?? 0);
        $peakHours = $topHours->map(fn ($h) => [
            'hour' => sprintf('%02d:00', $h['hour']),
            'count' => $h['count'],
            'percent' => $maxCount > 0 ? (int) round(($h['count'] / $maxCount) * 100) : 0,
        ]);

        $recommendation = null;
        if ($peakHours->isNotEmpty()) {
            $topHour = (int) explode(':', $peakHours->first()['hour'])[0];
            $recommendation = "Refuerza personal de salon entre las {$topHour}:00 y las " . ($topHour + 2) . ":00 para optimizar el tiempo de rotacion de mesa.";
        }

        return ['peak_hours' => $peakHours, 'recommendation' => $recommendation];
    }

    public function export(string $type, string $format, Request $request)
    {
        abort_unless(in_array($format, ['pdf', 'excel'], true), 422, 'Formato no soportado.');
        return response()->json([
            'message' => 'Endpoint listo para conectar DomPDF o Laravel Excel.',
            'type' => $type,
            'format' => $format,
            'data' => $this->show($type, $request),
        ]);
    }
}

