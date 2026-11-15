import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    if (allowedRoles.includes(authService.getUserRole())) {
      return true;
    }
    return router.createUrlTree(['/chats']);
  };
};