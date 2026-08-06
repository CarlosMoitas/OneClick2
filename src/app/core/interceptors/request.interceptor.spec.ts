import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CookieService } from '../services/cookie/cookie.service';
import { requestInterceptor } from './request.interceptor';

describe('requestInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let cookieServiceMock: any;

  beforeEach(() => {
    cookieServiceMock = {
      getCsrfToken: vi.fn().mockReturnValue('mock-token'),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([requestInterceptor])),
        provideHttpClientTesting(),
        { provide: CookieService, useValue: cookieServiceMock },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('deve adicionar headers e withCredentials', () => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe();

    const req = httpTestingController.expectOne(testUrl);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.headers.get('x-csrf-token')).toBe('mock-token');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('deve usar token vazio se cookieService retornar null', () => {
    cookieServiceMock.getCsrfToken.mockReturnValue(null);
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe();

    const req = httpTestingController.expectOne(testUrl);
    expect(req.request.headers.get('x-csrf-token')).toBe('');
    req.flush({});
  });
});
