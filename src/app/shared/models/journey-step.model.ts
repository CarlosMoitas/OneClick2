/**
 * Modelo de domínio da POC "Journey Progress" — Milestone Progress Tracker.
 *
 * ISOLAMENTO: este arquivo pertence exclusivamente à POC de acompanhamento
 * visual da jornada. Não é consumido por nenhuma regra de negócio
 * existente (HomeFacade, builders, services de execução) e pode ser
 * removido sem qualquer impacto funcional no restante da aplicação.
 */
export type JourneyStepStatus = 'pending' | 'running' | 'success' | 'error';

export interface JourneyStep {
  id: number;
  name: string;
  icon?: string;
  status: JourneyStepStatus;
  /** Progresso da etapa (0–100), usado para preencher a barra enquanto 'running'. */
  progress?: number;
  startTime?: Date;
  endTime?: Date;
  /** Duração em milissegundos, calculada quando a etapa é concluída ou falha. */
  duration?: number;
  errorMessage?: string;
}
