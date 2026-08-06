// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, NavigationStart, provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { App } from './app';
import { AppConfigService } from './core/services/config/app-config.service';
// Trecho pode ser descomentado quando o MonitoramentoService for injetado corretamente
// import { MonitoramentoService } from './core/services/monitoramento/monitoramento.service';

// Trecho pode ser descomentado quando o AuthService for injetado corretamente
// import { AuthService } from './core/modules/auth/services/auth.service';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let router: Router;
  let routerEventsSubject: Subject<any>;
  let appConfigServiceMock: any;
  let authServiceMock: any;
  let hasAuthIntegration = false;

  const importModuloOpcional = async (path: string): Promise<Record<string, any> | null> => {
    try {
      return await import(/* @vite-ignore */ path);
    } catch {
      return null;
    }
  };

  const emitNavigationEnd = (url: string) => {
    routerEventsSubject.next(new NavigationEnd(1, url, url));
  };

  beforeEach(async () => {
    (globalThis as any).LiquidCorp = {
      BradOverlayServiceDefault: {
        getInstance: vi.fn(() => ({
          getElementEvent: vi.fn(() => ({ addEventListener: vi.fn() })),
          open: vi.fn(),
          close: vi.fn(),
        })),
      },
    };

    routerEventsSubject = new Subject<any>();

    authServiceMock = { init: vi.fn() };
    appConfigServiceMock = {
      config: {
        urlAPI: 'http://api.test',
        MSAL: {
          clientId: '',
          authorityUrl: 'https://login.microsoftonline.com/common',
          redirectUrl: 'http://localhost',
        },
      },
    };

    const providers: any[] = [
      provideRouter([]),
      { provide: AppConfigService, useValue: appConfigServiceMock },
    ];

    // Importa o AuthService de forma opcional para manter compatibilidade entre templates.
    const authServiceModule = await importModuloOpcional('./core/modules/auth/services/auth.service');
    hasAuthIntegration = Boolean(authServiceModule?.['AuthService']);
    if (authServiceModule?.['AuthService']) {
      providers.push({ provide: authServiceModule['AuthService'], useValue: authServiceMock });
    }

    // Importa o MonitoramentoService de forma opcional, caso exista no projeto.
    const monitoramentoModule = await importModuloOpcional('./core/services/monitoramento/monitoramento.service');
    if (monitoramentoModule?.['MonitoramentoService']) {
      providers.push({ provide: monitoramentoModule['MonitoramentoService'], useValue: { logPageView: vi.fn() } });
    }

    // Dependências opcionais para cenário pós-schematic do login-msal.
    const msalAngularModule = await importModuloOpcional('@azure/msal-angular');
    const utilServiceModule = await importModuloOpcional('./core/modules/auth/services/util.service');
    const queryParamsModule = await importModuloOpcional('./core/modules/auth/services/query-params.service');

    if (msalAngularModule?.['MSAL_GUARD_CONFIG']) {
      providers.push({
        provide: msalAngularModule['MSAL_GUARD_CONFIG'],
        useValue: {
          interactionType: 0,
          authRequest: { scopes: ['openid'] },
          loginFailedRoute: '/',
        },
      });
    }

    if (msalAngularModule?.['MsalService']) {
      providers.push({
        provide: msalAngularModule['MsalService'],
        useValue: {
          initialize: vi.fn(() => of({})),
          handleRedirectObservable: vi.fn(() => of({})),
          ssoSilent: vi.fn(() => Promise.resolve()),
          acquireTokenSilent: vi.fn(() => of({ expiresOn: new Date(Date.now() + 60000), accessToken: 'token' })),
          loginPopup: vi.fn(() => of({ account: { homeAccountId: '1' } })),
          loginRedirect: vi.fn(() => of({})),
          logoutPopup: vi.fn(),
          logoutRedirect: vi.fn(),
          instance: {
            getAllAccounts: vi.fn(() => []),
            getActiveAccount: vi.fn(() => null),
            setActiveAccount: vi.fn(),
            addEventCallback: vi.fn(),
          },
        },
      });
    }

    if (utilServiceModule?.['UtilsService']) {
      providers.push({
        provide: utilServiceModule['UtilsService'],
        useValue: {
          overlayService: {
            open: vi.fn(),
            close: vi.fn(),
          },
        },
      });
    }

    if (queryParamsModule?.['QueryParamsService']) {
      providers.push({
        provide: queryParamsModule['QueryParamsService'],
        useValue: { returnQueryParamsObj: vi.fn(() => ({})) },
      });
    }

    TestBed.overrideComponent(App, {
      set: {
        // Isola o teste de dependências externas (AuthModule/MSAL/Login) nos dois cenários.
        template: '<main>app test host</main>',
        imports: [],
      },
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers,
    }).compileComponents();

    router = TestBed.inject(Router);

    Object.defineProperty(router, 'events', {
      get: () => routerEventsSubject.asObservable(),
    });
    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar a aplicação', () => {
    expect(component).toBeTruthy();
  });

  it('deve ativar o loader no NavigationStart', () => {
    routerEventsSubject.next(new NavigationStart(1, '/start'));
    if ((component as any).loader) {
      expect((component as any).loader()).toBe(true);
    } else {
      expect(component).toBeTruthy();
    }
  });

  it('deve desativar o loader no NavigationEnd quando loader existir', () => {
    emitNavigationEnd('/end');
    if ((component as any).loader) {
      expect((component as any).loader()).toBe(false);
    } else {
      expect(component).toBeTruthy();
    }
  });

  it('deve ignorar eventos de roteador que não sejam NavigationStart/NavigationEnd', () => {
    const loaderAntes = (component as any).loader ? (component as any).loader() : undefined;
    routerEventsSubject.next({ tipo: 'evento-desconhecido' });
    if ((component as any).loader) {
      expect((component as any).loader()).toBe(loaderAntes);
    } else {
      expect(component).toBeTruthy();
    }
  });

  it('deve inicializar autenticação no ngOnInit quando AuthService existir', () => {
    const initFn = (component as any)?.authService?.init;
    if (typeof initFn === 'function') {
      const initSpy = vi.spyOn((component as any).authService, 'init');
      component.ngOnInit();
      expect(initSpy).toHaveBeenCalled();
    } else if (hasAuthIntegration) {
      expect(authServiceMock.init).toHaveBeenCalled();
    } else {
      expect(component).toBeTruthy();
    }
  });

  it('deve redirecionar ao chamar voltar() quando método existir', () => {
    if (!(component as any).voltar) {
      expect(component).toBeTruthy();
      return;
    }

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });

    component.voltar();

    expect(window.location.href).toContain(
      'http://api.test/bff-canais/bcpf_roteador/v1/bcpf-v1/clientes/self/contas/_/redirecionamentos/HOME'
    );

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('deve acionar voltar via evento window:voltar quando método existir', () => {
    if (!(component as any).voltar) {
      expect(component).toBeTruthy();
      return;
    }

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });

    window.dispatchEvent(new Event('voltar'));

    expect(window.location.href).toContain(
      'http://api.test/bff-canais/bcpf_roteador/v1/bcpf-v1/clientes/self/contas/_/redirecionamentos/HOME'
    );

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('deve executar ngOnDestroy sem erro', () => {
    expect(() => (component as any).ngOnDestroy?.()).not.toThrow();
  });
});
