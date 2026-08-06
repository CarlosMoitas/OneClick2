// @vitest-environment jsdom
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppConfigService } from '@app/core/services/config/app-config.service';
// TODO: Descomentar essa linha quando a biblioteca de rastreabilidade estiver sendo importada no projeto
// import { LOG_DEVICE_CONTEXT, LogContextType } from '@bradesco/rast-lib-device-interceptor-logging';
import { DeviceLogInterceptorComponent } from './log-rastreabilidade.component';

describe('DeviceLogInterceptorComponent', () => {
  let component: DeviceLogInterceptorComponent;
  let fixture: ComponentFixture<DeviceLogInterceptorComponent>;
  let httpMock: HttpTestingController;
  let router: Router;
  const mockUrlApi = 'http://api.test';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviceLogInterceptorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AppConfigService,
          useValue: { config: { urlAPI: mockUrlApi } },
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceLogInterceptorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve fazer chamada POST em callPost', () => {
    component.callPost();

    const req = httpMock.expectOne(`${mockUrlApi}/api/v1/livro`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ valor: '1000', data: 'hoje' });
    req.flush({});
  });

  it('deve tratar erro em callPost sem propagar exceção', () => {
    component.callPost();

    const req = httpMock.expectOne(`${mockUrlApi}/api/v1/livro`);
    req.flush({}, { status: 500, statusText: 'Erro' });
  });

  // TODO: Descomentar esse bloco para adicionar mais testes da função de adicionar infos de hardware no header
  // it('deve fazer chamada POST com contexto em callMaisContextoHardware', () => {
  //   component.callMaisContextoHardware();

  //   const req = httpMock.expectOne(`${mockUrlApi}/api/v1/livro`);
  //   expect(req.request.method).toBe('POST');
  //   expect(req.request.body).toEqual({ telefone: 'mudou' });
  //   expect(req.request.context.get(LOG_DEVICE_CONTEXT)).toBe(LogContextType.HARDWARE);
  //   req.flush({});
  // });

  it('deve abrir link em nova aba em openLink', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const link = 'http://google.com';

    component.openLink(link);

    expect(openSpy).toHaveBeenCalledWith(link, '_blank');
  });

  it('deve navegar para exemplos em voltar', () => {
    component.voltar();
    expect(router.navigate).toHaveBeenCalledWith(['exemplos']);
  });
});
