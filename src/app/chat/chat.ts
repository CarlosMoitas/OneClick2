import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Role = 'user' | 'ai';
interface Message { role: Role; text: string; ts: string; }
interface Conversation { id: string; title: string; createdAt: string; updatedAt: string; messages: Message[]; }
interface ChatState { activeId: string; conversations: Conversation[]; }

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss'
})
export class ChatComponent {
  private readonly STORAGE_KEY = 'bex-chat-state-v1';
  private readonly THEME_KEY = 'bex-theme';

  input = '';
  sidebarOpen = signal(false);
  toast = signal('');

  state = signal<ChatState>(this.loadState());
  active = computed(() => this.state().conversations.find(c => c.id === this.state().activeId) || null);
  conversations = computed(() => [...this.state().conversations].sort((a,b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));

  theme = signal<'dark'|'light'>((localStorage.getItem(this.THEME_KEY) as 'dark'|'light') || 'dark');

  constructor() { this.applyTheme(this.theme()); }

  send() {
    const text = this.input.trim();
    if (!text) return;
    this.pushMessage('user', text);
    this.input = '';
    setTimeout(() => this.pushMessage('ai', `Entendi. Você disse: "${text}".\n\nPosso te ajudar com um passo a passo em seguida.`), 300);
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  autoGrow(ev: Event) {
    const el = ev.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }

  newConversation() {
    const s = this.state();
    const id = this.uid();
    const conv: Conversation = { id, title:'Nova conversa', createdAt:this.nowISO(), updatedAt:this.nowISO(), messages:[] };
    this.persist({ ...s, activeId:id, conversations:[...s.conversations, conv] });
  }

  setActive(id: string) { this.persist({ ...this.state(), activeId:id }); this.sidebarOpen.set(false); }
  closeMobileSidebar() { this.sidebarOpen.set(false); }

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    localStorage.setItem(this.THEME_KEY, next);
    this.applyTheme(next);
  }

  async copy(text: string) {
    try { await navigator.clipboard.writeText(text); this.showToast('Copiado!'); }
    catch { this.showToast('Não foi possível copiar'); }
  }

  private showToast(message: string) { this.toast.set(message); setTimeout(() => this.toast.set(''), 1500); }

  private applyTheme(theme: 'dark'|'light') {
    const html = document.documentElement;
    html.classList.remove('dark-theme', 'light-theme');
    html.classList.add(theme === 'dark' ? 'dark-theme' : 'light-theme');
  }

  private pushMessage(role: Role, text: string) {
    const s = this.state();
    const convs = s.conversations.map(c => {
      if (c.id !== s.activeId) return c;
      const messages = [...c.messages, { role, text, ts: this.nowISO() }];
      const firstUser = messages.find(m => m.role === 'user');
      const title = firstUser ? this.truncate(firstUser.text, 34) : 'Nova conversa';
      return { ...c, messages, title, updatedAt: this.nowISO() };
    });
    this.persist({ ...s, conversations: convs });
  }

  private loadState(): ChatState {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatState;
        if (parsed?.conversations?.length) return parsed;
      }
    } catch {}
    const id = this.uid();
    return { activeId:id, conversations:[{ id, title:'Nova conversa', createdAt:this.nowISO(), updatedAt:this.nowISO(), messages:[] }] };
  }

  private persist(next: ChatState) {
    this.state.set(next);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(next));
  }

  private uid() { return 'c_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36); }
  private nowISO() { return new Date().toISOString(); }
  private truncate(text: string, max: number) { return text.length > max ? text.slice(0, max - 1) + '…' : text; }
  trackByConv = (_: number, c: Conversation) => c.id;
}