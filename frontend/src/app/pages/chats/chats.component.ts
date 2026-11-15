import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './chats.component.html',
  styleUrls: ['./chats.component.css']
})
export class ChatsComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  chats = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.loadChats();
  }

  loadChats() {
    this.apiService.getChats().subscribe({
      next: (data) => {
        this.chats.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Ошибка при загрузке чатов', err);
        this.isLoading.set(false);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}