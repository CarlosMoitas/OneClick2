import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { ExemplosComponent } from './exemplos.component';
import { EXEMPLOS_ROUTES } from './exemplos.routes';

describe('ExemplosComponent', () => {
  let component: ExemplosComponent;
  let fixture: ComponentFixture<ExemplosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExemplosComponent, RouterModule.forRoot(EXEMPLOS_ROUTES)],
    }).compileComponents();

    fixture = TestBed.createComponent(ExemplosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('Deve voltar navegação', () => {
    const spyVoltar = vi.spyOn(Router.prototype, 'navigate');
    component.voltar();
    expect(spyVoltar).toHaveBeenCalled();
  });

  it('Deve abrir link em nova aba', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    component.openLink('https://exemplo.com');
    expect(openSpy).toHaveBeenCalledWith('https://exemplo.com', '_blank');
  });
});
