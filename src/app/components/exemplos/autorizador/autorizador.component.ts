import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertaCardComponent } from '@app/shared/ui/alerta-card';

@Component({
  standalone: true,
  selector: 'app-autorizador',
  templateUrl: './autorizador.component.html',
  imports: [AlertaCardComponent],
})
export class AutorizadorComponent {
  private readonly _cdr = inject(ChangeDetectorRef);
  private readonly _router = inject(Router);

  openLink(link: string): void {
    window.open(link, '_blank');
  }

  voltar() {
    this._router.navigate(['exemplos']);
  }
}
