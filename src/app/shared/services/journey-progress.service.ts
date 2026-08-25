import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { JourneyStep, JourneyStepStatus } from '../models/journey-step.model';

/**
 * POC — Journey Progress Service
 *
 * Responsabilidade EXCLUSIVA: gerenciar o estado visual da jornada
 * (milestones). Nenhuma regra de negócio reside aqui.
 *
 * ROLLBACK: remover este service e o componente JourneyProgress não
 * impacta nenhuma funcionalidade existente.
 */

/**
 * Steps do workflow real "Abertura de Contas" (cta-003).
 * IDs 1, 2, 3 correspondem às 3 etapas reais do HomeFacade.
 */
export const ABERTURA_CONTAS_STEPS: Readonly<Omit<JourneyStep, 'status'>[]> = [
  { id: 0, name: 'Portal TDM', icon: '🚀' },
  { id: 1, name: 'Contas Correntes PF', icon: '🏦' },
  { id: 2, name: 'Habilitar Conta MA', icon: '⚙️' },
  { id: 3, name: 'Débito Automático', icon: '💳' },
];

@Injectable({ providedIn: 'root' })
export class JourneyProgressService {
  private readonly _steps = signal<JourneyStep[]>([]);
  private readonly _active = signal(false);

  readonly steps = computed(() => this._steps());
  readonly isActive = computed(() => this._active());
  readonly completedCount = computed(() => this._steps().filter((s) => s.status === 'success').length);
  readonly totalSteps = computed(() => this._steps().length);
  readonly overallProgress = computed(() => {
    const total = this._steps().length;
    if (total === 0) return 0;
    const done = this._steps().filter((s) => s.status === 'success' || s.status === 'error').length;
    return Math.round((done / total) * 100);
  });

  /** Stream de eventos para integração futura com WebSocket/SignalR/Polling. */
  readonly stepEvent$ = new Subject<{ type: 'start' | 'complete' | 'fail'; stepId: number; error?: string }>();

  initJourney(steps: Omit<JourneyStep, 'status'>[]): void {
    this._steps.set(
      steps.map((s) => ({ ...s, status: 'pending' as JourneyStepStatus, progress: 0 })),
    );
    this._active.set(true);
  }

  startStep(stepId: number): void {
    this._updateStep(stepId, { status: 'running', startTime: new Date(), progress: 0 });
    this.stepEvent$.next({ type: 'start', stepId });
  }

  completeStep(stepId: number): void {
    const step = this._findStep(stepId);
    const duration = step?.startTime ? Date.now() - step.startTime.getTime() : undefined;
    this._updateStep(stepId, { status: 'success', endTime: new Date(), progress: 100, duration });
    this.stepEvent$.next({ type: 'complete', stepId });
  }

  failStep(stepId: number, errorMessage: string): void {
    const step = this._findStep(stepId);
    const duration = step?.startTime ? Date.now() - step.startTime.getTime() : undefined;
    this._updateStep(stepId, { status: 'error', endTime: new Date(), progress: 0, duration, errorMessage });
    this.stepEvent$.next({ type: 'fail', stepId, error: errorMessage });
  }

  updateProgress(stepId: number, progress: number): void {
    this._updateStep(stepId, { progress: Math.min(100, Math.max(0, progress)) });
  }

  resetJourney(): void {
    this._steps.set([]);
    this._active.set(false);
  }

  private _findStep(stepId: number): JourneyStep | undefined {
    return this._steps().find((s) => s.id === stepId);
  }

  private _updateStep(stepId: number, partial: Partial<JourneyStep>): void {
    this._steps.update((steps) => steps.map((s) => (s.id === stepId ? { ...s, ...partial } : s)));
  }
}
