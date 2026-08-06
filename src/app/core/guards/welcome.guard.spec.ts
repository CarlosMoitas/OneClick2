import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { welcomeGuard } from './welcome.guard';

describe('welcomeGuard', () => {
  let router: Router;
  let localStorageGetItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: routerMock }],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    localStorageGetItemSpy = vi.spyOn(Storage.prototype, 'getItem');
  });

  afterEach(() => {
    localStorageGetItemSpy.mockRestore();
  });

  it.each([
    {
      name: 'allow access when skipWelcome is not set (first visit)',
      storageValue: null,
      expectedResult: true,
      shouldNavigate: false,
    },
    {
      name: 'redirect to home when skipWelcome is set (already visited)',
      storageValue: 'true',
      expectedResult: false,
      shouldNavigate: true,
    },
  ])('should $name', ({ storageValue, expectedResult, shouldNavigate }) => {
    localStorageGetItemSpy.mockReturnValue(storageValue);

    const result = TestBed.runInInjectionContext(() => welcomeGuard({} as any, {} as any));

    expect(result).toBe(expectedResult);
    if (shouldNavigate) {
      expect(router.navigate).toHaveBeenCalledWith(['/home']);
      return;
    }
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect when error', () => {
    localStorageGetItemSpy.mockImplementation(() => {
      throw new Error('Local Storage error');
    });
    const result = TestBed.runInInjectionContext(() => welcomeGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
