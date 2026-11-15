import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  
  // Базовый URL. Если бэкенд запущен на другом порту (например, 8080), 
  // тебе нужно будет настроить proxy.conf.json (мы сделаем это позже).
  private baseUrl = '/api'; 

  // ==========================================
  // AUTH
  // ==========================================
  
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, { email, password });
  }

  me(): Observable<any> {
    return this.http.get(`${this.baseUrl}/auth/me`);
  }

  // ==========================================
  // CHATS
  // ==========================================
  
  getChats(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/chats`);
  }

  getChat(chatId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/chats/${chatId}`);
  }

  // ==========================================
  // MATERIALS
  // ==========================================
  
  getMaterials(chatId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/chats/${chatId}/materials`);
  }

  uploadMaterial(chatId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    // Эндпоинт из второго (актуального) ТЗ
    return this.http.post(`${this.baseUrl}/materials/chats/${chatId}/materials`, formData);
  }

  getMaterialFileUrl(materialId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/materials/${materialId}/file`);
  }

  getMaterialSourceUrl(materialId: string): Observable<any> {
    // Доступно только teacher/admin
    return this.http.get(`${this.baseUrl}/materials/${materialId}/source`);
  }

  markOpened(materialId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/materials/${materialId}/opened`, {});
  }

  markDownloaded(materialId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/materials/${materialId}/downloaded`, {});
  }

  getMaterialStats(materialId: string): Observable<any> {
    // Доступно только teacher/admin
    return this.http.get(`${this.baseUrl}/materials/${materialId}/stats`);
  }

  // ==========================================
  // REACTIONS (Только student)
  // ==========================================
  
  getAvailableReactions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/reactions/types`);
  }

  setReaction(materialId: string, type: string): Observable<any> {
    // Эндпоинт из второго (актуального) ТЗ
    return this.http.post(`${this.baseUrl}/reactions/materials/${materialId}/reactions`, { type });
  }

  // ==========================================
  // ADMIN
  // ==========================================
  
  getGroups(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/groups`);
  }

  createGroup(name: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/groups`, { name });
  }

  getTeachers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/teachers`);
  }

  createTeacher(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/teachers`, data);
  }

  importStudentsCsv(file: File, groupName?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (groupName) {
      formData.append('groupName', groupName);
    }
    return this.http.post(`${this.baseUrl}/admin/students/import`, formData);
  }

  assignTeacher(groupId: string, teacherId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/groups/${groupId}/teachers`, { teacherId });
  }

  getOnlineUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/online`);
  }

  getAuditLog(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/audit`);
  }
}