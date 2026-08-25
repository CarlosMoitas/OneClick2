import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { JourneyProgressService, ABERTURA_CONTAS_STEPS } from '../../services/journey-progress.service';
import { JourneyStep } from '../../models/journey-step.model';

/**
 * Journey Progress Component — Milestone Progress Tracker
 *
 * Exibe a linha do tempo horizontal da jornada "Abertura de Contas"
 * com estados visuais em tempo real: pending, running (spinner + pulse),
 * success, error.
 *
 * ISOLAMENTO TOTAL: este componente não conhece HomeFacade, builders,
 * ExecutionService nem qualquer regra de negócio existente.
 * Consome exclusivamente JourneyProgressService, que é alimentado pelo
 * HomeFacade via startStep / completeStep / failStep.
 *
 * ROLLBACK: remover a tag <app-journey-progress> do home.html e deletar
 * esta pasta — zero impacto no restante da aplicação.
 */
@Component({
  selector: 'app-journey-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './journey-progress.html',
  styleUrl: './journey-progress.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneyProgress implements OnInit, OnDestroy {
  /**
   * Feature flag — controla visibilidade do componente.
   * false = não renderiza nada (desativa sem remover do template).
   */
  @Input() visible = true;

  readonly journeyService = inject(JourneyProgressService);

  /** Tooltip visível (id do step com erro). */
  readonly activeTooltip = signal<number | null>(null);

  ngOnInit(): void {
    // Garante que a jornada está inicializada com os 3 steps reais.
    // O HomeFacade também chama initJourney ao disparar o workflow,
    // por isso esta chamada só serve de fallback para exibição imediata
    // do estado "pending" ao montar o componente.
    if (!this.journeyService.isActive()) {
      this.journeyService.initJourney([...ABERTURA_CONTAS_STEPS]);
    }
  }

  ngOnDestroy(): void {
    // Não faz reset aqui: o estado persiste enquanto o workflow ainda
    // estiver em andamento ou concluído, preservando o resultado visual.
  }

  showTooltip(stepId: number): void {
    this.activeTooltip.set(stepId);
  }

  hideTooltip(): void {
    this.activeTooltip.set(null);
  }

  get steps(): JourneyStep[] {
    return this.journeyService.steps();
  }

  get overallProgress(): number {
    return this.journeyService.overallProgress();
  }

  get isActive(): boolean {
    return this.journeyService.isActive();
  }

  trackByStep(_: number, step: JourneyStep): number {
    return step.id;
  }

  formatDuration(ms?: number): string {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
}
