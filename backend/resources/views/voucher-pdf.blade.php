<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "DejaVu Sans Mono", monospace; font-size: 8.5pt; line-height: 1.35; padding: 3mm; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .muted { color: #333; font-size: 7.8pt; }
  .line { border-top: 1px dashed #000; margin: 2mm 0; }
  table.row { width: 100%; border-collapse: collapse; margin: 0; }
  table.row td { padding: 0; vertical-align: top; }
  table.row td.right { text-align: right; }
  .header-block div { overflow-wrap: break-word; }
  .header-block .company-name { font-weight: bold; font-size: 10.5pt; margin-bottom: 0.5mm; }
  .voucher-logo { display: block; margin: 0 auto 1mm; height: auto; }
  .voucher-logo-small { width: 14mm; }
  .voucher-logo-medium { width: 20mm; }
  .voucher-logo-large { width: 28mm; }
  .doc-title-block { margin-bottom: 2mm; }
  .doc-title { font-weight: bold; font-size: 9.5pt; }
  .doc-title-internal { display: inline-block; border: 1px dashed #000; padding: 0.5mm 2mm; }
  .voucher-number { font-weight: bold; margin-top: 0.5mm; }
  .fields-block table.row td:first-child { width: 30%; }
  table.items { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.items td { padding: 0; vertical-align: top; }
  table.items .col-cant { width: 12%; }
  table.items .col-desc { width: 46%; overflow-wrap: break-word; }
  table.items .col-unit { width: 20%; text-align: right; }
  table.items .col-total { width: 22%; text-align: right; }
  .items-head td { font-weight: bold; }
  .block { margin-bottom: 2mm; }
  .footer-note { margin-top: 2mm; font-size: 7.5pt; }
</style>
</head>
<body>
  <div class="center header-block">
    @if ($company->voucher_show_logo && $company->logo_path)
      <img class="voucher-logo voucher-logo-{{ $company->voucher_logo_size ?? 'medium' }}" src="{{ public_path($company->logo_path) }}">
    @endif
    <div class="company-name">{{ $company->name }}</div>
    <div class="bold">RUC: {{ $company->ruc }}</div>
    @if ($company->address) <div class="muted">{{ $company->address }}</div> @endif
    @if ($company->phone) <div class="muted">Cel: {{ $company->phone }}</div> @endif
  </div>

  <div class="line"></div>

  <div class="center doc-title-block">
    <div class="doc-title {{ $copy === 'local' ? 'doc-title-internal' : '' }}">{{ $copyTag }}</div>
    <div class="voucher-number">Nro. {{ $sale->voucher_number }}</div>
  </div>

  <div class="fields-block">
    <table class="row"><tr><td>F. Emision:</td><td class="right">{{ $sale->created_at->format('d/m/Y H:i:s') }}</td></tr></table>
    @if ($sale->table_name)
    <table class="row"><tr><td>Mesa:</td><td class="right bold">{{ $sale->table_name }}</td></tr></table>
    @endif
    <table class="row"><tr><td>Cliente:</td><td class="right">{{ $sale->customer_name }}</td></tr></table>
    <table class="row"><tr><td>Cajero:</td><td class="right">{{ $sale->cashier?->name }}</td></tr></table>
    <table class="row"><tr><td>Pago:</td><td class="right">{{ $paymentLabels[$sale->payment_method] ?? strtoupper($sale->payment_method) }} - S/ {{ number_format($sale->total, 2) }}</td></tr></table>
  </div>

  <div class="line"></div>

  <table class="items items-head">
    <tr><td class="col-cant">Cant</td><td class="col-desc">Descripcion</td><td class="col-unit">P.Unit</td><td class="col-total">Total</td></tr>
  </table>
  @foreach ($sale->items as $item)
  <table class="items">
    <tr><td class="col-cant">{{ rtrim(rtrim(number_format($item->quantity, 2), '0'), '.') }}</td><td class="col-desc">{{ $item->product_name }}</td><td class="col-unit">{{ number_format($item->unit_price, 2) }}</td><td class="col-total">{{ number_format($item->total, 2) }}</td></tr>
  </table>
  @endforeach

  <div class="line"></div>

  @if ($sale->discount_amount > 0)
  <table class="row">
    <tr><td>Descuento ({{ rtrim(rtrim(number_format($sale->discount_percent, 2), '0'), '.') }}%):</td><td class="right bold">- S/ {{ number_format($sale->discount_amount, 2) }}</td></tr>
  </table>
  @endif
  <table class="row">
    <tr><td>Subtotal:</td><td class="right bold">S/ {{ number_format($sale->subtotal, 2) }}</td></tr>
  </table>
  <table class="row">
    <tr><td>IGV:</td><td class="right bold">S/ {{ number_format($sale->igv, 2) }}</td></tr>
  </table>
  @if ($sale->tip > 0)
  <table class="row">
    <tr><td>Propina:</td><td class="right bold">S/ {{ number_format($sale->tip, 2) }}</td></tr>
  </table>
  @endif
  <table class="row">
    <tr><td>TOTAL A PAGAR:</td><td class="right bold">S/ {{ number_format($sale->total, 2) }}</td></tr>
  </table>

  @if ($copy === 'customer' && $company->slogan)
  <div class="center block" style="margin-top: 2mm;">{{ $company->slogan }}</div>
  @endif

  <div class="center footer-note">
    Este documento no tiene valor tributario<br>
    Reclame su comprobante en caja
  </div>
</body>
</html>
