import { Component, OnInit, Signal, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../shared/components/navbar/navbar';
import { CatalogCard as CatalogCardComponent } from '../../shared/components/catalog-card/catalog-card';
import { HomeFacade } from './home.facade';
import { AuthService } from '../../core/services/auth.service';
import { Catalog } from '../../core/models/catalog.model';
// POC — Journey Progress (feature flag: showJourneyProgress)
import { JourneyProgress } from '../../shared/components/journey-progress/journey-progress';

/** IDs dos cards que disparam a jornada visual e o painel de log. */
const CARDS_WITH_JOURNEY = new Set(['cta-003', 'cta-005']);

/**
 * FEATURE FLAG — Painel "Acompanhamento do workflow" (debug de jornadas
 * encadeadas). Exibido apenas enquanto estivermos desenvolvendo/validando
 * novos workflows.
 *
 * Para ocultar novamente no futuro: basta trocar para `false` — não é
 * necessário comentar/remover nenhum bloco de template.
 */
const SHOW_WORKFLOW_LOG = true;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, Navbar, CatalogCardComponent, JourneyProgress],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  /**
   * IMPORTANTE: `selectedCatalogId`/`searchTerm` precisam ser Angular
   * Signals (não propriedades simples) para que o `computed()` abaixo os
   * reconheça como dependências reativas. Um `computed()` só recalcula
   * quando um signal LIDO durante sua execução muda — propriedades
   * simples atualizadas via [(ngModel)] não disparam recomputação, o que
   * fazia o filtro de busca parecer "não funcionar" (o campo digitava,
   * mas a lista nunca era refiltrada).
   */
  private readonly _selectedCatalogId = signal('');
  private readonly _searchTerm = signal('');

  get selectedCatalogId(): string {
    return this._selectedCatalogId();
  }
  set selectedCatalogId(value: string) {
    this._selectedCatalogId.set(value);
  }

  get searchTerm(): string {
    return this._searchTerm();
  }
  set searchTerm(value: string) {
    this._searchTerm.set(value);
  }

  readonly catalogs: Signal<Catalog[]>;
  readonly errorMessage: Signal<string | null>;
  readonly workflowLog;
  readonly lastCreatedAccount;
  readonly filteredCards;

  /**
   * POC feature flag — controla a exibição do Journey Progress Tracker.
   * true  = mostra o componente (ativado quando cta-003 é disparado)
   * false = não renderiza nada (rollback instantâneo mudando para false)
   */
  readonly showJourneyProgress = signal(false);

  /** Espelha a feature flag `SHOW_WORKFLOW_LOG` para uso no template. */
  readonly showWorkflowLog = signal(SHOW_WORKFLOW_LOG);

  constructor(
    private readonly homeFacade: HomeFacade,
    readonly authService: AuthService,
  ) {
    this.catalogs = this.homeFacade.catalogs;
    this.errorMessage = this.homeFacade.errorMessage;
    this.workflowLog = this.homeFacade.workflowLog;
    this.lastCreatedAccount = this.homeFacade.lastCreatedAccount;

    this.filteredCards = computed(() => {
      const catalogId = this._selectedCatalogId();
      const term = this._searchTerm().trim().toLowerCase();

      return this.homeFacade.cards().filter((card) => {
        const matchesCatalog = !catalogId || card.catalogId === catalogId;
        const matchesSearch =
          !term ||
          card.title.toLowerCase().includes(term) ||
          card.id.toLowerCase().includes(term) ||
          card.project.toLowerCase().includes(term);

        return matchesCatalog && matchesSearch;
      });
    });
  }

  ngOnInit(): void {
    this.homeFacade.loadInitialData();
  }

  onGenerate(event: { cardId: string; environment?: string; agency?: string }): void {
    // POC: ativa o journey progress ao clicar em "Gerar Massa" nos cards com workflow real
    if (CARDS_WITH_JOURNEY.has(event.cardId)) {
      this.showJourneyProgress.set(true);
    }
    // A lógica de negócio real permanece completamente inalterada
    this.homeFacade.generateMass(event.cardId, event.environment, event.agency);
  }
}
