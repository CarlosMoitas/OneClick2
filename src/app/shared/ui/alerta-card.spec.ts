import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertaCardComponent } from './alerta-card';

describe('AlertaCardComponent', () => {
  let component: AlertaCardComponent;
  let fixture: ComponentFixture<AlertaCardComponent>;
  const iconCases: Array<{
    type?: 'warning' | 'error' | 'success';
    expected: string;
  }> = [
      { expected: 'icon-feedback-alert-orientation' },
      { type: 'warning', expected: 'icon-feedback-alert-warning' },
      { type: 'error', expected: 'icon-feedback-alert-error' },
      { type: 'success', expected: 'icon-feedback-alert-success' },
    ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertaCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertaCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it.each(iconCases)('deve retornar ícone correto para type="$type"', ({ type, expected }) => {
    if (type) {
      fixture.componentRef.setInput('type', type);
    }
    fixture.detectChanges();
    expect(component.iconClass()).toBe(expected);
  });
});
