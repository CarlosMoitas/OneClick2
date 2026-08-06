import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Router } from '@angular/router';
import { CalendarioComponent } from './calendario.component';

describe('CalendarioComponent', () => {
  let component: CalendarioComponent;
  let fixture: ComponentFixture<CalendarioComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({}).compileComponents();

    fixture = TestBed.createComponent(CalendarioComponent);
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
});
