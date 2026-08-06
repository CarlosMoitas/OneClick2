import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
})
export class WelcomeComponent {
  constructor(private router: Router) {}

  continuar(): void {
    // @todo: Adicione lógica adicional antes de navegar se necessário
    // Marca como visitado e navega para home
    localStorage.setItem('skipWelcome', 'true');
    this.router.navigate(['/home']);
  }
}
