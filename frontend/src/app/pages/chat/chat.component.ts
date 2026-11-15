import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PdfViewerComponent } from '../../components/pdf-viewer/pdf-viewer.component';
import { ReactionsComponent } from '../../components/reactions/reactions.component';
import { UploaderComponent } from '../../components/uploader/uploader.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, PdfViewerComponent, ReactionsComponent, UploaderComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  public authService = inject(AuthService);

  chatId = '';
  chatTitle = signal<string>('');
  materials = signal<any[]>([]);
  availableReactions = signal<any[]>([]);
  currentReaction = signal<string | null>(null);
  
  selectedPdfUrl = signal<string | null>(null);

  get isTeacher() { return this.authService.getUserRole() === 'teacher'; }
  get isStudent() { return this.authService.getUserRole() === 'student'; }

  ngOnInit() {
    this.chatId = this.route.snapshot.paramMap.get('id') || '';
    this.loadChatData();
    
    if (this.isStudent) {
      this.loadReactions();
    }
  }

  loadChatData() {
    // 1. Получаем заголовок чата
    this.api.getChat(this.chatId).subscribe({
      next: (chat) => this.chatTitle.set(chat.title),
      error: (err) => console.error('Ошибка загрузки чата', err)
    });

    // 2. Получаем материалы
    this.api.getMaterials(this.chatId).subscribe({
      next: (mats) => this.materials.set(mats),
      error: (err) => console.error('Ошибка загрузки материалов', err)
    });
  }

  loadReactions() {
    this.api.getAvailableReactions().subscribe({
      next: (types) => this.availableReactions.set(types),
      error: (err) => console.error('Ошибка загрузки реакций', err)
    });
  }

  openPdf(material: any) {
    this.api.markOpened(material.id).subscribe();
    
    // Получаем URL файла от бэкенда
    this.api.getMaterialFileUrl(material.id).subscribe({
      next: (res: any) => this.selectedPdfUrl.set(res.url), // Предполагаем, что бэкенд отдает { url: "..." }
      error: () => this.selectedPdfUrl.set(material.fileUrl) // fallback
    });
  }

  downloadFile(material: any) {
    this.api.markDownloaded(material.id).subscribe();
    this.api.getMaterialFileUrl(material.id).subscribe({
      next: (res: any) => window.open(res.url, '_blank'),
      error: () => window.open(material.fileUrl, '_blank')
    });
  }

  handleUpload(file: File) {
    this.api.uploadMaterial(this.chatId, file).subscribe({
      next: () => {
        // После загрузки перезапрашиваем материалы
        this.api.getMaterials(this.chatId).subscribe(mats => this.materials.set(mats));
      },
      error: () => alert('Ошибка загрузки')
    });
  }

  setReaction(materialId: string, type: string) {
    this.currentReaction.set(type);
    this.api.setReaction(materialId, type).subscribe({
      error: (err) => console.error('Ошибка реакции', err)
    });
  }
}