import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import './electron-window';

async function checkElectronLicense(router: Router): Promise<UrlTree | null> {
  if (!window.posChifa) return null;
  const status = await window.posChifa.getLicenseStatus();
  return status.valid ? null : router.createUrlTree(['/license']);
}

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const licenseRedirect = await checkElectronLicense(router);
  if (licenseRedirect) return licenseRedirect;
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const licenseRedirect = await checkElectronLicense(router);
  if (licenseRedirect) return licenseRedirect;
  if (!auth.isLoggedIn()) return true;
  return router.createUrlTree(['/app/dashboard']);
};

export const landingGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const licenseRedirect = await checkElectronLicense(router);
  if (licenseRedirect) return licenseRedirect;
  if (window.posChifa) return router.createUrlTree([auth.isLoggedIn() ? '/app/dashboard' : '/login']);
  if (auth.isLoggedIn()) return router.createUrlTree(['/app/dashboard']);
  return true;
};
