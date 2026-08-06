import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AutorizadorComponent } from './autorizador.component';

describe('AutorizadorComponent', () => {
  let component: AutorizadorComponent;
  let fixture: ComponentFixture<AutorizadorComponent>;
  let location: Location;
  let router: Router;

  beforeAll(() => {
    vi.stubGlobal('sdkLogin', { a: {} });
    vi.stubGlobal('sdkSecurityKey', {
      initCryptoSecurityKeyAd: (chave: string, idSessao: string): void => {
        if ((window as any).onErrorInitCryptoSecurityKeyAdCallback) {
          (window as any).onErrorInitCryptoSecurityKeyAdCallback(
            'Erro ao inicializar a sdk criptografica da embarcada'
          );
        }
      },
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutorizadorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    location = TestBed.inject(Location);
    fixture = TestBed.createComponent(AutorizadorComponent);
    router = TestBed.inject(Router);
    // router.initialNavigation(); // Não necessário para teste unitário de componente
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('Deve navegar para exemplos ao chamar voltar', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.voltar();
    expect(navigateSpy).toHaveBeenCalledWith(['exemplos']);
  });

  it('Deve abrir link em nova aba', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    component.openLink('https://exemplo.com');
    expect(openSpy).toHaveBeenCalledWith('https://exemplo.com', '_blank');
  });
});
