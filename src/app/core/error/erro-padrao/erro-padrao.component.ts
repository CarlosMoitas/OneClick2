import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-erro-padrao',
  standalone: true,
  templateUrl: './erro-padrao.component.html',
  styleUrls: ['./erro-padrao.component.scss'],
})
export class ErroPadraoComponent {
  private readonly _router = inject(Router);

  public voltar() {
    this._router.navigate(['/home'], { skipLocationChange: true });
  }
}
