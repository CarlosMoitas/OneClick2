import { DOCUMENT } from '@angular/common';
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { CookieService } from './cookie.service';

describe('CookieService', () => {
  let service: CookieService;
  let mockDocument: any;
  const nullCookieCases = ['OUTRO-COOKIE=valor', ''];

  beforeEach(() => {
    mockDocument = {
      cookie: '',
    };

    TestBed.configureTestingModule({
      providers: [CookieService, { provide: DOCUMENT, useValue: mockDocument }],
    });
    service = TestBed.inject(CookieService);
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it.each(nullCookieCases)('deve retornar null quando cookie for "%s"', (cookie) => {
    mockDocument.cookie = cookie;
    expect(service.getCsrfToken()).toBeNull();
  });

  it('deve retornar o valor do cookie se existir', () => {
    mockDocument.cookie = 'MOCK-CSRF-TOKEN=valor-do-token; OUTRO=123';
    expect(service.getCsrfToken()).toBe('valor-do-token');
  });

  it('deve usar o cache na segunda chamada', () => {
    mockDocument.cookie = 'MOCK-CSRF-TOKEN=valor-inicial';
    expect(service.getCsrfToken()).toBe('valor-inicial');

    mockDocument.cookie = 'MOCK-CSRF-TOKEN=novo-valor';
    expect(service.getCsrfToken()).toBe('valor-inicial');
  });

  it('deve retornar valor bruto quando decodeURIComponent falhar', () => {
    mockDocument.cookie = 'MOCK-CSRF-TOKEN=%';

    expect(service.getCsrfToken()).toBe('%');
  });

});
