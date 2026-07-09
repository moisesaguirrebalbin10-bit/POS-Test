<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "DejaVu Sans", sans-serif; font-size: 9pt; padding: 10mm; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6mm; border-bottom: 2px solid #0f766e; padding-bottom: 4mm; }
  .header h1 { font-size: 16pt; color: #0f766e; }
  .header small { color: #666; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f0fdfa; color: #0f766e; text-align: left; padding: 5px 6px; font-size: 8.5pt; border-bottom: 2px solid #0f766e; }
  td { padding: 5px 6px; border-bottom: 1px solid #e5e7eb; font-size: 8.5pt; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer-note { margin-top: 6mm; font-size: 7.5pt; color: #888; text-align: right; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>{{ $title }}</h1>
      <small>{{ $company->name }}</small>
    </div>
    <small>{{ now()->format('d/m/Y H:i') }}</small>
  </div>

  <table>
    <thead>
      <tr>
        @foreach ($columns as $col)
          <th>{{ $col }}</th>
        @endforeach
      </tr>
    </thead>
    <tbody>
      @foreach ($rows as $row)
        <tr>
          @foreach ($row as $cell)
            <td>{{ $cell }}</td>
          @endforeach
        </tr>
      @endforeach
    </tbody>
  </table>

  <div class="footer-note">{{ count($rows) }} registros</div>
</body>
</html>
