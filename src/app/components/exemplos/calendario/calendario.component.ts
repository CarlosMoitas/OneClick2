import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertaCardComponent } from "@app/shared/ui/alerta-card";

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss'],
  imports: [AlertaCardComponent],
})
export class CalendarioComponent {
  private readonly _router = inject(Router);

  public voltar(): void {
    this._router.navigate(['exemplos']);
  }
}
