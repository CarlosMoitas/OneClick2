import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { WelcomeComponent } from './welcome.component';

describe('WelcomeComponent', () => {
  let component: WelcomeComponent;
  let fixture: ComponentFixture<WelcomeComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeComponent],
      providers: [
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WelcomeComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('deve criar', () => {
    expect(component).toBeTruthy();
  });

  it('deve navegar para home e salvar no localStorage ao chamar continuar', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    component.continuar();

    expect(setItemSpy).toHaveBeenCalledWith('skipWelcome', 'true');
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });
});
