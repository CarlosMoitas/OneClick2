import { Component, DestroyRef, HostListener, inject, isDevMode, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { AppConfigService } from './core/services/config/app-config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})

/* v8 ignore start */
export class App implements OnInit {
  /* v8 ignore stop */
  protected readonly title = signal('fed-node-npm-template');
  protected readonly loader = signal(true);
  segmento: string = 'classic';
  private readonly _router = inject(Router);
  private readonly app = inject(AppConfigService);
  private readonly _destroyRef = inject(DestroyRef);
  LiquidCorp = (globalThis as any).LiquidCorp;
  isDevMode: boolean = isDevMode();

  ngOnInit(): void {
    //Mostra ou oculta Loader de acordo com status de navegação
    this._router.events.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((item) => {
      if (item instanceof NavigationStart) {
        this.loader.set(true);
      } else if (item instanceof NavigationEnd) {
        this.loader.set(false);
        // Navega até a rota mais profunda para obter o título da página configurado no app.routes
        let titulo = 'Página';
        let rota = this._router.routerState.snapshot.root;
      }
    });
  }

  //Hostlisterner para "escutar" a ação da embarcada e trocar a URL
  @HostListener('window:voltar')
  voltar(): void {
    // @todo ver como obter o idConta do cliente logado. Normalmente fica armazenado no storage do nativo
    // verifique qual a home do seu canal.
    const idConta = '_'; // Veja qual o padrão usado pelos projetos no canal.
    const url = `${this.app.config.urlAPI}/bff-canais/bcpf_roteador/v1/bcpf-v1/clientes/self/contas/${idConta}/redirecionamentos/HOME`;
    window.location.href = url;
  }
}
