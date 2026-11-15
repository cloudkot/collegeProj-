import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/chats', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) 
  },
  { 
    path: 'chats', 
    canActivate: [authGuard],
    loadComponent: () => import('./pages/chats/chats.component').then(m => m.ChatsComponent) 
  },
  { 
    path: 'chats/:id', 
    canActivate: [authGuard],
    loadComponent: () => import('./pages/chat/chat.component').then(m => m.ChatComponent) 
  },
  { 
    path: 'admin', 
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent) 
  },
  { path: '**', redirectTo: '/chats' }
];