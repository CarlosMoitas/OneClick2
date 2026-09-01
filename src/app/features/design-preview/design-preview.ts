import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';

/**
 * Design Preview — Página de aprovação do BEX Design System
 *
 * Rota isolada: /design-preview
 * Sem guard de autenticação.
 * Não interfere em nenhuma funcionalidade existente.
 */
@Component({
  selector: 'app-design-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './design-preview.html',
  styleUrl: './design-preview.scss',
})
export class DesignPreview {
  readonly themeService = inject(ThemeService);

  get isDark(): boolean {
    return this.themeService.isDark();
  }

  get currentTheme(): string {
    return this.themeService.theme();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /** Seções de cores para o swatch de paleta */
  readonly colorSwatches = [
    { name: 'Primary', var: '--bex-primary', hex: '#CC092F' },
    { name: 'Primary Hover', var: '--bex-primary-hover', hex: '#A00725' },
    { name: 'Background', var: '--bex-bg', hex: '' },
    { name: 'Surface', var: '--bex-surface', hex: '' },
    { name: 'Surface Elevated', var: '--bex-surface-elevated', hex: '' },
    { name: 'Success', var: '--bex-success', hex: '#16a34a' },
    { name: 'Error', var: '--bex-error', hex: '#dc2626' },
    { name: 'Warning', var: '--bex-warning', hex: '#d97706' },
    { name: 'Info', var: '--bex-info', hex: '#2563eb' },
  ];
}
