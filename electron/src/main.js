const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { spawn } = require('node:child_process');
const http = require('node:http');
const { evaluateLicense, activateLicense } = require('./license');

const LICENSE_RECHECK_MS = 6 * 60 * 60 * 1000;
let licenseRecheckTimer;

const FRONTEND_PORT = 4300;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

let backendProcess;
let frontendServer;

function ensureStorageDirs(storageDir) {
  const dirs = [
    'framework/cache/data',
    'framework/sessions',
    'framework/views',
    'logs',
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(storageDir, dir), { recursive: true });
  }
}

// La carpeta de instalacion puede quedar en una ruta protegida (ej. Program Files)
// donde un usuario sin privilegios de administrador no puede escribir. La base de
// datos SQLite y el storage de Laravel (logs, cache, sesiones) no pueden vivir ahi
// dentro: se copian/crean en el perfil del usuario, que siempre es escribible sin
// importar donde se haya instalado el programa.
function ensureDatabaseFile(backendDir, dataDir) {
  const dbPath = path.join(dataDir, 'database.sqlite');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dataDir, { recursive: true });
    const seedDb = path.join(backendDir, 'database', 'database.sqlite');
    if (fs.existsSync(seedDb)) fs.copyFileSync(seedDb, dbPath);
    else fs.closeSync(fs.openSync(dbPath, 'w'));
  }
  return dbPath;
}

function waitForBackend(url, timeout = 20000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      http.get(url, res => { res.resume(); resolve(); }).on('error', () => {
        if (Date.now() - started > timeout) reject(new Error('Backend local no disponible'));
        else setTimeout(ping, 500);
      });
    };
    ping();
  });
}

function startBackend() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const backendDir = app.isPackaged ? path.join(process.resourcesPath, 'backend') : path.join(__dirname, '..', '..', 'backend');

  if (app.isPackaged) {
    const dataDir = path.join(app.getPath('userData'), 'data');
    const storageDir = path.join(dataDir, 'storage');
    ensureStorageDirs(storageDir);
    env.LARAVEL_STORAGE_PATH = storageDir;
    env.DB_DATABASE = ensureDatabaseFile(backendDir, dataDir);
  } else {
    ensureStorageDirs(path.join(backendDir, 'storage'));
  }

  backendProcess = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8000'], { cwd: backendDir, env, windowsHide: true, stdio: 'ignore' });
  backendProcess.on('error', error => logCrash(error));
}

function printerConfigPath() {
  return path.join(app.getPath('userData'), 'printer-config.json');
}

async function readPrinterConfig() {
  try {
    const raw = await fsp.readFile(printerConfigPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      customer: typeof parsed.customer === 'string' ? parsed.customer : '',
      local: typeof parsed.local === 'string' ? parsed.local : ''
    };
  } catch {
    return { customer: '', local: '' };
  }
}

function startFrontendServer(frontendDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const safePath = path.normalize(urlPath).replace(/^([.][.][/\\])+/, '');
        let filePath = path.join(frontendDir, safePath);
        if (!filePath.startsWith(frontendDir)) filePath = path.join(frontendDir, 'index.html');

        let stat = null;
        try { stat = await fsp.stat(filePath); } catch { /* not found */ }
        if (!stat || stat.isDirectory()) filePath = path.join(frontendDir, 'index.html');

        const data = await fsp.readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(FRONTEND_PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function createWindow() {
  startBackend();
  evaluateLicense().catch(() => null);
  startLicenseRecheck();
  await waitForBackend('http://127.0.0.1:8000/api/company-settings').catch(() => null);

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'OptiUso POS',
    icon: path.join(__dirname, '..', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      plugins: true
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (!app.isPackaged) {
    await win.loadURL('http://127.0.0.1:4200');
  } else {
    const frontendDir = path.join(process.resourcesPath, 'frontend', 'dist', 'pos-chifa', 'browser');
    frontendServer = await startFrontendServer(frontendDir);
    await win.loadURL(`http://127.0.0.1:${FRONTEND_PORT}`);
  }
}

ipcMain.handle('print-current-window', async event => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return false;
  window.webContents.print({ silent: false, printBackground: true });
  return true;
});

ipcMain.handle('list-printers', async event => event.sender.getPrintersAsync());

ipcMain.handle('get-printer-config', async () => readPrinterConfig());

ipcMain.handle('save-printer-config', async (_event, config) => {
  const safeConfig = {
    customer: typeof config?.customer === 'string' ? config.customer : '',
    local: typeof config?.local === 'string' ? config.local : ''
  };
  await fsp.writeFile(printerConfigPath(), JSON.stringify(safeConfig, null, 2));
  return safeConfig;
});

ipcMain.handle('get-license-status', async () => evaluateLicense());
ipcMain.handle('activate-license', async (_event, licenseKey) => activateLicense(licenseKey));

function startLicenseRecheck() {
  clearInterval(licenseRecheckTimer);
  licenseRecheckTimer = setInterval(() => { evaluateLicense().catch(() => null); }, LICENSE_RECHECK_MS);
}

function logCrash(error) {
  try {
    const logPath = path.join(app.getPath('userData'), 'startup-error.log');
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${error?.stack || error}\n`);
  } catch { /* ignore logging failures */ }
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.optiuso.desktop');
}

app.whenReady().then(createWindow).catch(error => {
  logCrash(error);
  app.quit();
});
process.on('uncaughtException', logCrash);

app.on('window-all-closed', () => {
  clearInterval(licenseRecheckTimer);
  if (backendProcess) backendProcess.kill();
  if (frontendServer) frontendServer.close();
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
