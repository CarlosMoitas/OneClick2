import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-alerta-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alerta-card.html',
})
export class AlertaCardComponent {
  type = input<'info' | 'warning' | 'error' | 'success'>('info');
  title = input<string>();

  iconClass = () => {
    switch (this.type()) {
      case 'warning':
        return 'icon-feedback-alert-warning';
      case 'error':
        return 'icon-feedback-alert-error';
      case 'success':
        return 'icon-feedback-alert-success';
      default:
        return 'icon-feedback-alert-orientation';
    }
  };
}
