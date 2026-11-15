import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage.set('Заполните все поля');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        // Успешный вход -> редирект на чаты
        this.router.navigate(['/chats']);
      },
      error: (err) => {
        this.isLoading.set(false);
        
        // Обработка ошибок по ТЗ (401 и 429)
        if (err.status === 401) {
          this.errorMessage.set('Неверный email или пароль');
        } else if (err.status === 429) {
          this.errorMessage.set('Слишком много попыток входа. Попробуйте позже');
        } else {
          this.errorMessage.set('Произошла ошибка. Попробуйте позже.');
        }
      }
    });
  }
}