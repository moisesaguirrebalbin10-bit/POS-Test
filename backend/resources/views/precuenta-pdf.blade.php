<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "DejaVu Sans Mono", monospace; font-size: 8.5pt; line-height: 1.35; padding: 3mm; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .copy-tag { font-weight: bold; margin-bottom: 2mm; }
  .order-code { font-weight: bold; margin-bottom: 2mm; font-size: 11pt; }
  .line { border-top: 1px dashed #000; margin: 2mm 0; }
  table.row { width: 100%; border-collapse: collapse; margin: 0; }
  table.row td { padding: 0; vertical-align: top; }
  table.row td.right { text-align: right; }
  .header-block { margin-bottom: 2mm; }
  .header-block div { overflow-wrap: break-word; }
  .fields-block table.row td:first-child { width: 30%; }
  table.items { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.items td { padding: 0; vertical-align: top; }
  table.items .col-cant { width: 12%; }
  table.items .col-desc { width: 46%; overflow-wrap: break-word; }
  table.items .col-unit { width: 20%; text-align: right; }
  table.items .col-total { width: 22%; text-align: right; }
  .items-head td { font-weight: bold; }
  .footer-note { margin-top: 2mm; font-size: 7.5pt; }
</style>
</head>
<body>
  <div class="center copy-tag">*** PRE-CUENTA - NO ES COMPROBANTE DE PAGO ***</div>

  <div class="center header-block">
    <div class="bold">{{ $company->name }}</div>
    @if ($company->address) <div>{{ $company->address }}</div> @endif
  </div>

  <div class="center order-code">Orden #{{ $tableOrder->id }}</div>

  <div class="fields-block">
    <table class="row"><tr><td>Fecha:</td><td class="right">{{ now()->format('d/m/Y H:i:s') }}</td></tr></table>
    @if ($tableOrder->table)
    <table class="row"><tr><td>Mesa:</td><td class="right bold">{{ $tableOrder->table->name }}</td></tr></table>
    @endif
    <table class="row"><tr><td>Cliente:</td><td class="right">{{ $tableOrder->customer_name ?? 'Cliente General' }}</td></tr></table>
  </div>

  <div class="line"></div>

  <table class="items items-head">
    <tr><td class="col-cant">Cant</td><td class="col-desc">Descripcion</td><td class="col-unit">P.Unit</td><td class="col-total">Total</td></tr>
  </table>
  @foreach ($items as $item)
  <table class="items">
    <tr><td class="col-cant">{{ rtrim(rtrim(number_format($item->quantity, 2), '0'), '.') }}</td><td class="col-desc">{{ $item->product_name }}</td><td class="col-unit">{{ number_format($item->unit_price, 2) }}</td><td class="col-total">{{ number_format($item->total, 2) }}</td></tr>
  </table>
  @endforeach

  <div class="line"></div>

  <table class="row">
    <tr><td>Subtotal:</td><td class="right bold">S/ {{ number_format($subtotal, 2) }}</td></tr>
  </table>
  <table class="row">
    <tr><td>IGV:</td><td class="right bold">S/ {{ number_format($igv, 2) }}</td></tr>
  </table>
  <table class="row">
    <tr><td>TOTAL:</td><td class="right bold">S/ {{ number_format($grossTotal, 2) }}</td></tr>
  </table>
  @if ($amountPaid > 0)
  <table class="row">
    <tr><td>Cobro anticipado:</td><td class="right">- S/ {{ number_format($amountPaid, 2) }}</td></tr>
  </table>
  <table class="row">
    <tr><td>Saldo pendiente:</td><td class="right bold">S/ {{ number_format($balanceDue, 2) }}</td></tr>
  </table>
  @endif

  <div class="footer-note center">
    Este documento es solo referencial<br>
    No tiene valor tributario
  </div>
</body>
</html>
