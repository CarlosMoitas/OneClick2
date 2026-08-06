import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '@app/app.routes';
import { of } from 'rxjs';
import { ChamarBffComponent } from './chamar-bff.component';

describe(ChamarBffComponent.name, () => {
  let component: ChamarBffComponent;
  let fixture: ComponentFixture<ChamarBffComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChamarBffComponent],
      providers: [provideRouter(routes), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(ChamarBffComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('Deve voltar navegação', () => {
    component.voltar();
    expect(router.navigate).toHaveBeenCalledWith(['exemplos']);
  });

  it('Deve carregar dados e finalizar loading no enviar', () => {
    const bffService = (component as any)._bffService;
    vi.spyOn(bffService, 'obterLista').mockReturnValue(of([]));

    component.enviar();

    expect(component.isLoading).toBe(true);
    component.dados$?.subscribe();
    expect(component.isLoading).toBe(false);
  });

  it(`Deve abrir e fechar card`, () => {
    const toggleMock = vi.fn();

    // Mock global LiquidCorp
    (globalThis as any).LiquidCorp = {
      BradAccordionService: {
        getInstance: vi.fn().mockReturnValue({ toggle: toggleMock }),
      },
    };

    component.abreFechaCard(0);

    expect((globalThis as any).LiquidCorp.BradAccordionService.getInstance).toHaveBeenCalledWith({
      targetSelector: '#accordion-0',
    });
    expect(toggleMock).toHaveBeenCalled();
  });
});
