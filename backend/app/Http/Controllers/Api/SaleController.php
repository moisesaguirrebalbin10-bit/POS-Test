<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Services\ActivityLogger;
use App\Services\SaleService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        return Sale::with('items', 'cashier')
            ->when($request->from, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($request->payment_method, fn ($q, $v) => $q->where('payment_method', $v))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w->where('voucher_number', 'like', "%$s%")
                ->orWhere('customer_name', 'like', "%$s%")
                ->orWhere('table_name', 'like', "%$s%")))
            ->latest()->paginate($request->integer('per_page') ?: 30);
    }

    public function stats()
    {
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        $todayTotal = (float) Sale::whereDate('created_at', $today)->sum('total');
        $yesterdayTotal = (float) Sale::whereDate('created_at', $yesterday)->sum('total');
        $trendPercent = $yesterdayTotal > 0 ? round((($todayTotal - $yesterdayTotal) / $yesterdayTotal) * 100, 1) : null;

        $totalCount = Sale::count();
        $issuedCount = Sale::whereNotNull('customer_pdf_path')->count();
        $issuedPercent = $totalCount > 0 ? (int) round(($issuedCount / $totalCount) * 100) : 0;
        $avgTicket = $totalCount > 0 ? (float) Sale::avg('total') : 0;

        $popular = Sale::select('payment_method', DB::raw('count(*) as c'))
            ->groupBy('payment_method')->orderByDesc('c')->first();
        $popularPercent = $popular && $totalCount > 0 ? (int) round(($popular->c / $totalCount) * 100) : 0;

        return [
            'today_total' => $todayTotal,
            'trend_percent' => $trendPercent,
            'vouchers_count' => $totalCount,
            'issued_percent' => $issuedPercent,
            'avg_ticket' => round($avgTicket, 2),
            'popular_method' => $popular?->payment_method,
            'popular_percent' => $popularPercent,
        ];
    }

    public function store(Request $request, SaleService $service)
    {
        $data = $request->validate([
            'customer_name' => ['nullable', 'string'],
            'payment_method' => ['required', 'in:cash,yape,plin,card,transfer,mixed'],
            'mixed_payments' => ['nullable', 'array'],
            'tip' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('company_id', app('currentCompanyId'))],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
        ]);

        $sale = $service->create($data, $request->user()->id);
        ActivityLogger::log($request->user(), 'sales', 'create', "Registro la venta {$sale->voucher_number} por S/ {$sale->total}.");
        return response()->json($sale, 201);
    }

    public function show(Sale $sale)
    {
        return $sale->load('items', 'cashier');
    }

    public function generateVoucherPdf(Request $request, Sale $sale)
    {
        $data = $request->validate(['copy' => ['required', 'in:customer,local']]);
        $copy = $data['copy'];

        $sale->load('items', 'cashier');
        $company = app('currentCompany');
        $copyTag = $copy === 'local' ? '*** COPIA - USO INTERNO (COMANDA) ***' : '*** NOTA VENTA ***';
        $paymentLabels = ['cash' => 'EFECTIVO', 'yape' => 'YAPE', 'plin' => 'PLIN', 'card' => 'TARJETA', 'transfer' => 'TRANSFERENCIA', 'mixed' => 'MIXTO'];

        $widthMm = $company->ticket_width === '58' ? 58 : 80;
        // dompdf no ajusta el alto de pagina al contenido automaticamente: se estima
        // segun la cantidad de lineas variables (items + propina + eslogan + direccion)
        // para evitar que el ticket se corte a una segunda pagina. Calibrado empiricamente
        // contando paginas reales con dompdf para distintas alturas de pagina.
        $lineCount = $sale->items->count() + ($sale->tip > 0 ? 1 : 0) + ($copy === 'customer' && $company->slogan ? 1 : 0) + ($company->address ? 1 : 0);
        $heightMm = max(90, 108 + $lineCount * 5);
        $mmToPt = 2.83465;

        $pdf = Pdf::loadView('voucher-pdf', compact('sale', 'company', 'copy', 'copyTag', 'paymentLabels'));
        $pdf->setPaper([0, 0, $widthMm * $mmToPt, $heightMm * $mmToPt]);

        $relativePath = "vouchers/{$sale->id}-{$copy}.pdf";
        Storage::disk('local')->put($relativePath, $pdf->output());

        $column = $copy === 'local' ? 'local_pdf_path' : 'customer_pdf_path';
        $sale->update([$column => $relativePath]);

        ActivityLogger::log($request->user(), 'sales', 'voucher-pdf', "Genero el PDF de la copia {$copy} del comprobante {$sale->voucher_number}.");

        return response()->json(['path' => $relativePath]);
    }

    public function showVoucherPdf(Request $request, Sale $sale)
    {
        $copy = $request->query('copy') === 'local' ? 'local' : 'customer';
        $column = $copy === 'local' ? 'local_pdf_path' : 'customer_pdf_path';
        $path = $sale->{$column};

        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'El PDF de esta copia aun no se ha generado.'], 404);
        }

        return response(Storage::disk('local')->get($path), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="voucher-' . $sale->voucher_number . '-' . $copy . '.pdf"');
    }
}

