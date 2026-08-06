import { Component, inject, isDevMode, OnInit } from '@angular/core';
import { Router } from '@angular/router';
//TODO: Descomentar essa linha quando o script do GTM estiver sendo importado no index.html e o MonitoramentoService estiver sendo injetado no componente
// import { MonitoramentoService } from '@app/core/services/monitoramento/monitoramento.service';
import { AlertaCardComponent } from "@app/shared/ui/alerta-card";

@Component({
  standalone: true,
  selector: 'app-gtm',
  templateUrl: './gtm.component.html',
  imports: [AlertaCardComponent],
})
export class GtmComponent implements OnInit {

  //TODO: Descomentar essa linha quando o script do GTM estiver sendo importado no index.html e o MonitoramentoService estiver sendo injetado no componente
  // private readonly _monitoramento = inject(MonitoramentoService);
  private readonly _router = inject(Router);

  contador = 0;
  isDevMode: boolean = isDevMode();
  hasDataLayer: boolean = false;

  ngOnInit(): void {
    //TODO: Descomentar esse bloco quando o script do GTM estiver sendo importado no index.html e o MonitoramentoService estiver sendo injetado no componente
    // this.hasDataLayer = this._monitoramento.hasDataLayer();
    // Exemplo ao iniciar do componente
    // this._monitoramento.logPageView('/gtm', 'Exemplo do GTM');
  }

  enviar(): void {
    //TODO: Descomentar esse bloco quando o script do GTM estiver sendo importado no index.html e o MonitoramentoService estiver sendo injetado no componente
    // Exemplo ao executar uma ação
    // this._monitoramento.logInteraction(
    //   'clique_no_enviar',
    //   'Enviar monitoramento de teste: ' + ++this.contador
    // );
  }

  public voltar(): void {
    this._router.navigate(['exemplos']);
  }
}
