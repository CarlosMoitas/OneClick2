import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiError } from '../models/api-error.model';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let httpTestingController: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceMock: { logout: ReturnType<typeof vi.fn> };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = {
      logout: vi.fn(),
    };
    routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('deve interceptar, normalizar o erro e redirecionar para login em 401', () => {
    const url = '/api/mock';
    const status = 401;
    const statusText = 'Unauthorized';

    httpClient.get(url).subscribe({
      next: () => expect.fail('Deveria ter falhado'),
      error: (error: ApiError) => {
        expect(error.status).toBe(status);
        expect(error.code).toBe('UNAUTHORIZED');
      },
    });

    const req = httpTestingController.expectOne(url);
    req.flush('Erro', { status, statusText });

    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('não deve redirecionar para login em erro 500', () => {
    const url = '/api/mock';
    const status = 500;
    const statusText = 'Internal Server Error';

    httpClient.get(url).subscribe({
      next: () => expect.fail('Deveria ter falhado'),
      error: (error: ApiError) => {
        expect(error.status).toBe(status);
        expect(error.code).toBe('INTERNAL_ERROR');
      },
    });

    const req = httpTestingController.expectOne(url);
    req.flush('Erro', { status, statusText });

    expect(authServiceMock.logout).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
