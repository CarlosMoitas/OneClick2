import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
})
export class NotFoundComponent {
  private readonly _router = inject(Router);

  public voltar() {
    this._router.navigate(['/home'], { skipLocationChange: true });
  }
}
