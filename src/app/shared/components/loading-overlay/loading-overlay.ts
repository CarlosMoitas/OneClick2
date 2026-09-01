import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';
import { JourneyProgressService } from '../../services/journey-progress.service';

/**
 * Loading overlay global.
 *
 * Quando o Journey Progress Tracker estiver ativo (workflow cta-003 em
 * andamento), o overlay é suprimido — o tracker já comunica o progresso
 * ao usuário, tornando o spinner redundante.
 *
 * O LoadingService, o LoadingInterceptor e toda a lógica de negócio
 * permanecem completamente inalterados.
 */
@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  templateUrl: './loading-overlay.html',
  styleUrl: './loading-overlay.scss',
})
export class LoadingOverlay {
  readonly loadingService = inject(LoadingService);
  readonly journeyProgressService = inject(JourneyProgressService);
}
