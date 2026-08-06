// @vitest-environment jsdom
import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppErrorHandler } from './app-error-handler';

describe('AppErrorHandler', () => {
  let errorHandler: AppErrorHandler;
  let router: Router;
  let ngZone: NgZone;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppErrorHandler,
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
        {
          provide: NgZone,
          useValue: { runGuarded: vi.fn((fn: () => void) => fn()) },
        },
      ],
    });

    errorHandler = TestBed.inject(AppErrorHandler);
    router = TestBed.inject(Router);
    ngZone = TestBed.inject(NgZone);
  });

  it('deve ser criado', () => {
    expect(errorHandler).toBeTruthy();
  });

  it.each([
    {
      name: 'status existente',
      error: { status: 404, message: 'Not Found' },
      expectedPath: ['erro/404'],
    },
    {
      name: 'status ausente',
      error: new Error('Generic Error'),
      expectedPath: ['erro/undefined'],
    },
  ])('deve navegar para rota correta com $name', ({ error, expectedPath }) => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    errorHandler.handleError(error);

    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(ngZone.runGuarded).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(expectedPath, { skipLocationChange: true });

    consoleSpy.mockRestore();
  });
});
