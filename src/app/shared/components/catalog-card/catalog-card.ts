import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogCard as CatalogCardModel } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-catalog-card',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './catalog-card.html',
  styleUrl: './catalog-card.scss',
})
export class CatalogCard {
  @Input({ required: true }) card!: CatalogCardModel;
  @Output() generate = new EventEmitter<{ cardId: string; environment?: string; agency?: string }>();

  selectedEnvironment?: string;
  agency = '3995';

  /** Controla a exibição do modal com a imagem da jornada ("mile stone"). */
  readonly showJourneyModal = signal(false);

  onGenerate(): void {
    // `agency` é sempre emitido com o valor atual da variável — seja digitado
    // pelo usuário (quando `requiresAgencyInput` é true) ou com o valor fixo
    // padrão '3995' (quando o campo está oculto). Isso garante que o builder
    // nunca precise de fallback e que re-habilitar o campo seja uma alteração
    // de apenas uma linha em catalog.mock.ts (requiresAgencyInput: true).
    this.generate.emit({
      cardId: this.card.id,
      environment: this.selectedEnvironment,
      agency: this.agency,
    });
  }

  openJourneyModal(): void {
    this.showJourneyModal.set(true);
  }

  closeJourneyModal(): void {
    this.showJourneyModal.set(false);
  }
}
