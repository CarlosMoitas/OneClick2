import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ResponseModel } from '@app/components/exemplos/chamar-bff/model/response.model';
import { BffService } from './bff.service';

describe('BffService', () => {
  let service: BffService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), BffService],
    });
    service = TestBed.inject(BffService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deve buscar dados do BFF', () => {
    const mockData: ResponseModel[] = [
      { id: 1, descricao: 'Item A', canal: 'mock-v1', data: new Date(), valor: 10 },
    ];

    service.obterLista().subscribe((data) => {
      expect(data).toEqual(mockData);
    });

    const req = httpTestingController.expectOne('/check-request');
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });
});
