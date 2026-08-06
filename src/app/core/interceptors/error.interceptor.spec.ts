import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let httpTestingController: HttpTestingController;
  let httpClient: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('deve interceptar e relançar o erro', () => {
    const url = '/api/mock';
    const status = 401;
    const statusText = 'Unauthorized';

    httpClient.get(url).subscribe({
      next: () => expect.fail('Deveria ter falhado'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(status);
        expect(error.statusText).toBe(statusText);
      },
    });

    const req = httpTestingController.expectOne(url);
    req.flush('Erro', { status, statusText });
  });
});
