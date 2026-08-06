import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { EXEMPLOS_ROUTES } from './exemplos.routes';

describe('Router: App', () => {
  let location: Location;
  let router: Router;
  const paths = ['chamar-bff', 'calendario', 'autorizador', 'gtm', 'logging'];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterModule.forRoot(EXEMPLOS_ROUTES)],
    });
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    router.initialNavigation();
  });

  it.each(paths)('Navegar para "%s" redireciona para /%s', async (path) => {
    await router.navigate([`/${path}`]);
    expect(location.path()).toBe(`/${path}`);
  });
});
