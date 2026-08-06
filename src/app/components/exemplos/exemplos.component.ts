import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AlertaCardComponent } from "@app/shared/ui/alerta-card";

@Component({
  selector: 'app-exemplos',
  standalone: true,
  templateUrl: './exemplos.component.html',
  imports: [CommonModule, RouterModule, AlertaCardComponent],
})
export class ExemplosComponent {
  private readonly _router = inject(Router);

  openLink(link: string): void {
    window.open(link, '_blank');
  }

  voltar() {
    this._router.navigate(['/home']);
  }
}
