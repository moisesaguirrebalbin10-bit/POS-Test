# Setup rapido para probar ServiMax (POS Chifa) en local con SQLite.
# Uso: abrir PowerShell en la raiz del repo y ejecutar:  .\scripts\setup-friend.ps1
# Requisitos previos: PHP 8.2+, Composer, Node.js 20+ (probado con Node 24), npm.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Output "== Backend (Laravel + SQLite) =="
Set-Location "$root\backend"

if (-not (Test-Path ".env")) {
@"
APP_NAME="ServiMax"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

LOG_CHANNEL=stack

# SQLite: no requiere instalar ni configurar un servidor de base de datos
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
SANCTUM_STATEFUL_DOMAINS=127.0.0.1:4200,localhost:4200
FRONTEND_URL=http://127.0.0.1:4200

# WebSockets desactivados por simplicidad (opcional, ver README para Reverb)
BROADCAST_CONNECTION=log
"@ | Set-Content -Encoding utf8 ".env"
    Write-Output "Creado backend\.env (SQLite)"
} else {
    Write-Output "backend\.env ya existe, no se sobrescribe"
}

composer install

if (-not (Test-Path "database\database.sqlite")) {
    New-Item -ItemType File "database\database.sqlite" | Out-Null
    Write-Output "Creado database\database.sqlite"
}

php artisan key:generate
php artisan migrate:fresh --seed

Write-Output ""
Write-Output "== Frontend (Angular) =="
Set-Location "$root\frontend"
npm install

Set-Location $root
Write-Output ""
Write-Output "Listo. Para levantar el sistema:"
Write-Output "  1) cd backend  && php artisan serve --host=127.0.0.1 --port=8000"
Write-Output "  2) cd frontend && npm start"
Write-Output ""
Write-Output "Login de prueba: admin@poschifa.local / Admin12345"
