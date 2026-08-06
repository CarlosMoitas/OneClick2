import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { MonitoramentoService } from '@app/core/services/monitoramento/monitoramento.service';

import { Router } from '@angular/router';
import { GtmComponent } from './gtm.component';

describe('GtmComponent', () => {
  let component: GtmComponent;
  let fixture: ComponentFixture<GtmComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GtmComponent],
      providers: [{ provide: 'googleTagManagerId', useValue: 'GTM_MOCK' }],
    }).compileComponents();

    fixture = TestBed.createComponent(GtmComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    component = fixture.componentInstance;
  });

  it('Deve criar', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  //TODO: Descomentar esses testes quando o script do GTM estiver sendo importado no index.html e o MonitoramentoService estiver sendo injetado no componente
  // it('# ngInit() deve chamar o monitoramento "VirtualPageview"', () => {
  //   const spy = vi.spyOn(MonitoramentoService.prototype, 'logPageView');
  //   fixture.detectChanges();
  //   expect(spy).toHaveBeenCalled();
  // });

  // it('# enviar() deve chamar o monitoramento "interaction"', () => {
  //   const spy = vi.spyOn(MonitoramentoService.prototype, 'logInteraction');
  //   component.enviar();
  //   expect(spy).toHaveBeenCalled();
  // });

  it('Deve voltar navegação', () => {
    fixture.detectChanges();
    component.voltar();
    expect(router.navigate).toHaveBeenCalledWith(['exemplos']);
  });

  it('deve executar enviar sem lançar erro e manter incremento explícito pendente', () => {
    fixture.detectChanges();
    expect(() => component.enviar()).not.toThrow();
    expect(component.contador).toBe(0);
  });

  it('deve renderizar alerta de erro quando em dev sem dataLayer', () => {
    component.isDevMode = true;
    component.hasDataLayer = false;
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('GTM Script GTM ou service de monitoramento não encontrado');
  });

  it('deve renderizar alerta de sucesso quando houver dataLayer', () => {
    component.isDevMode = true;
    component.hasDataLayer = true;
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Google Tag Manager encontrado');
  });
});
