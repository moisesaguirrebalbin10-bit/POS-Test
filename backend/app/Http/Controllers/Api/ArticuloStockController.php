<?php

namespace App\Http\Controllers\Api;

use App\Exports\ArticulosExport;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\ActivityLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class ArticuloStockController extends Controller
{
    public function index(Request $request)
    {
        return Product::with('category')
            ->where('type', 'articulo')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%$s%"))
            ->when($request->category_id, fn ($q, $v) => $q->where('category_id', $v))
            ->when(!$request->boolean('show_inactive'), fn ($q) => $q->where('active', true))
            ->orderBy('name')
            ->paginate($request->integer('per_page') ?: 50);
    }

    public function exportPdf(Request $request)
    {
        $articulos = $this->filteredForExport($request);
        $company = app('currentCompany');

        $pdf = Pdf::loadView('inventory-list-pdf', [
            'title' => 'Articulos',
            'company' => $company,
            'columns' => ['Articulo', 'Categoria', 'Stock', 'Minimo', 'Precio'],
            'rows' => $articulos->map(fn (Product $p) => [
                $p->name, $p->category?->name ?? '-', number_format((float) $p->stock, 2), number_format((float) $p->min_stock, 2), 'S/ ' . number_format((float) $p->sale_price, 2),
            ]),
        ]);

        ActivityLogger::log($request->user(), 'inventory', 'export-pdf', 'Exporto el listado de articulos a PDF.');

        return response($pdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="articulos.pdf"');
    }

    public function exportExcel(Request $request)
    {
        $articulos = $this->filteredForExport($request);
        ActivityLogger::log($request->user(), 'inventory', 'export-excel', 'Exporto el listado de articulos a Excel.');

        return response(Excel::raw(new ArticulosExport($articulos), \Maatwebsite\Excel\Excel::XLSX))
            ->header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            ->header('Content-Disposition', 'attachment; filename="articulos.xlsx"');
    }

    public function conteo(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.counted_stock' => ['required', 'numeric', 'min:0'],
        ]);

        $updated = 0;

        DB::transaction(function () use ($data, $request, &$updated) {
            foreach ($data['items'] as $line) {
                $product = Product::where('type', 'articulo')->findOrFail($line['product_id']);
                $diff = round((float) $line['counted_stock'] - (float) $product->stock, 3);
                if (abs($diff) < 0.001) {
                    continue;
                }

                $product->update(['stock' => $line['counted_stock']]);
                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $request->user()->id,
                    'type' => 'adjustment',
                    'quantity' => abs($diff),
                    'note' => 'Conteo de stock: ' . ($diff > 0 ? 'ajuste +' : 'ajuste ') . $diff,
                ]);
                $updated++;
            }
        });

        ActivityLogger::log($request->user(), 'inventory', 'conteo', "Registro un conteo de stock ({$updated} articulos ajustados).");

        return ['updated' => $updated];
    }

    private function filteredForExport(Request $request)
    {
        return Product::with('category')
            ->where('type', 'articulo')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%$s%"))
            ->when($request->category_id, fn ($q, $v) => $q->where('category_id', $v))
            ->when(!$request->boolean('show_inactive'), fn ($q) => $q->where('active', true))
            ->orderBy('name')->get();
    }
}
