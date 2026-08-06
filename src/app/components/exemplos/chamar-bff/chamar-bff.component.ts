import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ResponseModel } from '@app/components/exemplos/chamar-bff/model/response.model';
import { AlertaCardComponent } from '@app/shared/ui/alerta-card';
import { finalize, Observable } from 'rxjs';
import { BffService } from './service/bff.service';

declare let LiquidCorp: {
  BradAccordionService: {
    getInstance(options: { targetSelector: string }): { toggle: () => void };
  };
};

@Component({
  selector: 'app-chamar-bff',
  standalone: true,
  templateUrl: './chamar-bff.component.html',
  imports: [CommonModule, AlertaCardComponent],
})
export class ChamarBffComponent {
  dados$?: Observable<ResponseModel[]>;
  isLoading = false;

  private readonly _bffService = inject(BffService);
  private readonly _router = inject(Router);

  enviar(): void {
    this.isLoading = true;
    this.dados$ = this._bffService.obterLista().pipe(finalize(() => (this.isLoading = false)));
  }

  public voltar(): void {
    this._router.navigate(['exemplos']);
  }

  abreFechaCard(i: number): void {
    const targetSelector = `#accordion-${i}`;
    const options = { targetSelector };
    LiquidCorp.BradAccordionService.getInstance(options).toggle();
  }
}
