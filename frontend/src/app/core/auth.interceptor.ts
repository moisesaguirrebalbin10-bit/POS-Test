import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isAdminRequest = req.url.includes('/admin/') && !req.url.includes('/admin/login');
  const token = isAdminRequest ? localStorage.getItem('admin_token') : localStorage.getItem('token');
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
