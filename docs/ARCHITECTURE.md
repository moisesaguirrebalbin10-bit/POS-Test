# Arquitectura POS Chifa

## Decisiones

- Angular standalone para UI modular, guards e interceptor.
- Laravel API local para reglas de negocio, migraciones y seguridad.
- SQLite local por defecto para instalador Windows sin servidor externo.
- Electron inicia el backend local y carga Angular en modo dev o dist.

## Flujo de venta

1. POS consulta productos activos.
2. El cajero confirma carrito y metodo de pago.
3. Laravel crea venta en transaccion.
4. Se genera correlativo `CF-00001` desde `voucher_sequences`.
5. Se descuenta stock y se registra `stock_movements`.
6. Si hay caja abierta, se registra `cash_movements`.
7. El frontend abre el voucher imprimible.

## Impresion

`frontend/src/voucher.html` renderiza ticket 58mm/80mm. En navegador usa `window.print()`. En Electron se puede invocar `window.posChifa.printCurrentWindow()` o `printVoucher(url)` desde la UI.
