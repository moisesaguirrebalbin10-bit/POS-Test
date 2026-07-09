const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const http = require('node:http');
const https = require('node:https');

// TODO: cambiar por el dominio real de produccion cuando exista (ej. https://api.optiuso.app).
const CLOUD_LICENSE_URL = process.env.OPTIUSO_CLOUD_URL || 'http://127.0.0.1:8000';
const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

function licenseStatePath() {
  return path.join(app.getPath('userData'), 'license.json');
}

async function readLicenseState() {
  try {
    return JSON.parse(await fs.readFile(licenseStatePath(), 'utf-8'));
  } catch {
    return null;
  }
}

async function writeLicenseState(state) {
  await fs.writeFile(licenseStatePath(), JSON.stringify(state, null, 2));
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const payload = JSON.stringify(body);
    const req = client.request(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 6000
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
        catch (err) { reject(err); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Tiempo de espera agotado')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function checkLicenseOnline(licenseKey) {
  const { body } = await postJson(`${CLOUD_LICENSE_URL}/api/license/check`, { license_key: licenseKey });
  return body;
}

async function evaluateLicense() {
  const state = await readLicenseState();
  if (!state?.license_key) {
    return { valid: false, status: 'unactivated', message: 'Ingresa tu codigo de licencia para continuar.' };
  }

  try {
    const result = await checkLicenseOnline(state.license_key);
    const nextState = {
      license_key: state.license_key,
      last_status: result.valid ? 'valid' : (result.status || 'invalid'),
      last_check_at: new Date().toISOString(),
      trial_ends_at: result.trial_ends_at || null,
      plan_name: result.plan_name || null,
      company_name: result.company_name || null
    };
    await writeLicenseState(nextState);
    return { valid: !!result.valid, status: nextState.last_status, message: result.message, company_name: nextState.company_name, trial_ends_at: nextState.trial_ends_at };
  } catch {
    const lastCheckAt = state.last_check_at ? new Date(state.last_check_at).getTime() : 0;
    const withinGrace = Date.now() - lastCheckAt < OFFLINE_GRACE_MS;
    if (withinGrace && state.last_status === 'valid') {
      return { valid: true, status: 'offline', offline: true, company_name: state.company_name, trial_ends_at: state.trial_ends_at };
    }
    return { valid: false, status: 'offline_expired', message: 'No se pudo validar tu licencia. Conectate a internet e intenta de nuevo.' };
  }
}

async function activateLicense(licenseKey) {
  const key = String(licenseKey || '').trim().toUpperCase();
  if (!key) return { valid: false, message: 'Ingresa un codigo de licencia.' };

  try {
    const result = await checkLicenseOnline(key);
    if (!result.valid) return { valid: false, message: result.message || 'Codigo de licencia invalido.' };

    await writeLicenseState({
      license_key: key,
      last_status: 'valid',
      last_check_at: new Date().toISOString(),
      trial_ends_at: result.trial_ends_at || null,
      plan_name: result.plan_name || null,
      company_name: result.company_name || null
    });
    return { valid: true, company_name: result.company_name };
  } catch {
    return { valid: false, message: 'No se pudo conectar para validar tu licencia. Verifica tu conexion a internet.' };
  }
}

module.exports = { evaluateLicense, activateLicense };
