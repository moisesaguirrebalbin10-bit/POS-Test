# POS Chifa

Sistema POS local para restaurante tipo chifa, empaquetable como aplicacion de escritorio Windows con Angular, Laravel, Electron y SQLite local.

## Arquitectura

- `backend/`: API Laravel 11, autenticacion Sanctum, roles/permisos, ventas, caja, inventario y reportes.
- `frontend/`: Angular standalone con Material, guards, interceptor, dashboard, POS y modulos administrativos.
- `electron/`: shell de escritorio, arranque del backend local, ventana principal e impresion de vouchers.
- Base de datos recomendada: SQLite local. Para un POS instalable evita depender de MySQL/PostgreSQL en la maquina del cliente, simplifica backups y reduce fallas de instalacion.

## Requisitos

- PHP 8.2+
- Composer
- Node.js 20+
- npm

## Instalacion desarrollo

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

```bash
cd frontend
npm install
npm start
```

Usuario inicial:

- Email: `admin@poschifa.local`
- Password: `Admin12345`

## Electron

```bash
npm install
npm run dev
```

Generar instalador Windows:

```bash
npm run build:installer
```

## Pruebas por modulo

1. Login: iniciar sesion con el admin inicial y validar redireccion al dashboard.
2. Usuarios/Roles: crear un cajero y asignar permisos limitados.
3. Empresa: configurar RUC, celular, IGV, propina, serie `CF-` y numero inicial.
4. Almacenes/Productos: crear almacen, categoria y producto con stock minimo.
5. POS: agregar productos al carrito, elegir metodo de pago y confirmar venta.
6. Voucher: abrir vista previa e imprimir en 58mm u 80mm desde Electron.
7. Caja: abrir caja, registrar ventas, ingresos, egresos y cerrar con monto contado.
8. Reportes: filtrar por fechas y exportar PDF/Excel.

## Build

```bash
cd frontend && npm run build
cd ../backend && php artisan config:cache
cd .. && npm run build:installer
```


## Seguridad de dependencias

```bash
npm audit
npm run electron:version
```

La app limpia `ELECTRON_RUN_AS_NODE` antes de abrir Electron para evitar que el entorno lo ejecute como Node. Electron usa `contextIsolation`, `sandbox`, `nodeIntegration: false`, permisos denegados por defecto y validacion de URL antes de imprimir vouchers.
