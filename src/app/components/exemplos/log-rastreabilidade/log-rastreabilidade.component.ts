import { HttpClient, HttpContext } from '@angular/common/http';
import { Component, inject, Injector, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AppConfigService } from '@app/core/services/config/app-config.service';
import { AlertaCardComponent } from "@app/shared/ui/alerta-card";

@Component({
  selector: 'app-log-rastreabilidade',
  standalone: true,
  templateUrl: './log-rastreabilidade.component.html',
  styleUrls: ['./log-rastreabilidade.component.scss'],
  imports: [AlertaCardComponent],
})

export class DeviceLogInterceptorComponent {
  private readonly _http = inject(HttpClient);
  private readonly _injector = inject(Injector);
  private readonly _router = inject(Router);
  private readonly _app = inject(AppConfigService);
  LiquidCorp = (window as any).LiquidCorp;
  callPost(): void {
    this._http
      .post(`${this._app.config.urlAPI}/api/v1/livro`, {
        valor: '1000',
        data: 'hoje',
      })
      .subscribe({
        next: () => console.log('Chamada POST ok'),
        error: () => { }, // apenas para não cair no errorhanler
      });
  }
  // TODO: Descomentar esse bloco para adicionar mais infos de hardware no header além da localização
  // Function comentada - adicionar mais infos de hardware no header além da localização
  // callMaisContextoHardware() {
  //   const url = `${this._app.config.urlAPI}/api/v1/livro`;
  //   this._http
  //     .post(
  //       url,
  //       { telefone: 'mudou' }
  //       ,{
  //         context: new HttpContext().set(
  //           LOG_DEVICE_CONTEXT,
  //           LogContextType.HARDWARE
  //         ),
  //       }
  //     )
  //     .subscribe({
  //       next: () => console.log('Chamada com contexto HARDWARE'),
  //       error: () => {}, // apenas para não cair no errorhanler
  //     });
  // }

  openLink(link: string): void {
    const ngZone = this._injector.get(NgZone);
    ngZone.runGuarded(() => {
      window.open(link, '_blank');
    });
  }

  voltar(): void {
    this._router.navigate(['exemplos']);
  }
}
