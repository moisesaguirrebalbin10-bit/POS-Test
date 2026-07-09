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
  .fields-block table.row td:first-child { width: 30%; }
  table.items { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.items td { padding: 0; vertical-align: top; }
  table.items .col-cant { width: 15%; }
  table.items .col-desc { width: 85%; overflow-wrap: break-word; }
  .item-notes { font-size: 7.5pt; color: #333; padding-left: 15%; }
  .footer-note { margin-top: 3mm; font-size: 7.5pt; }
</style>
</head>
<body>
  <div class="center copy-tag">*** COMANDA - USO INTERNO ***</div>

  <div class="center header-block">
    <div class="bold">{{ $company->name }}</div>
  </div>

  <div class="center order-code">Orden #{{ $tableOrder->id }} &middot; {{ $tableOrder->typeLabel() }}</div>

  <div class="fields-block">
    <table class="row"><tr><td>Fecha:</td><td class="right">{{ now()->format('d/m/Y H:i:s') }}</td></tr></table>
    @if ($tableOrder->table)
    <table class="row"><tr><td>Mesa:</td><td class="right bold">{{ $tableOrder->table->name }}</td></tr></table>
    @endif
    @if ($tableOrder->customer_name)
    <table class="row"><tr><td>Cliente:</td><td class="right">{{ $tableOrder->customer_name }}</td></tr></table>
    @endif
    <table class="row"><tr><td>Atendido por:</td><td class="right">{{ $tableOrder->creator?->name ?? '-' }}</td></tr></table>
  </div>

  <div class="line"></div>

  <table class="items">
    <tr><td class="col-cant bold">Cant</td><td class="col-desc bold">Descripcion</td></tr>
  </table>
  @foreach ($items as $item)
  <table class="items">
    <tr><td class="col-cant">{{ rtrim(rtrim(number_format($item->quantity, 2), '0'), '.') }}x</td><td class="col-desc">{{ $item->product_name }}</td></tr>
  </table>
  @if ($item->notes)
  <div class="item-notes">Nota: {{ $item->notes }}</div>
  @endif
  @endforeach

  <div class="line"></div>

  <div class="footer-note center">
    Comanda sin valor comercial
  </div>
</body>
</html>
