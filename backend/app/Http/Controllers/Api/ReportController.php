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
            'low-stock' => Product::with('category', 'warehouse')->whereColumn('stock', '<=', 'min_stock')->get(),
            'sales-by-user' => Sale::join('users', 'users.id', '=', 'sales.user_id')->selectRaw('users.name, sum(total) total')->groupBy('users.name')->get(),
            'sales-by-payment' => Sale::selectRaw('payment_method, sum(total) total')->groupBy('payment_method')->get(),
            default => abort(404, 'Reporte no encontrado.'),
        };
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

