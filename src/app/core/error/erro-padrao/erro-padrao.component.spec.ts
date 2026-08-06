import { ComponentFixture, TestBed } from "@angular/core/testing";
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ErroPadraoComponent } from "./erro-padrao.component";
import { Router } from "@angular/router";

describe("ErroPadraoComponent", () => {
  let component: ErroPadraoComponent;
  let fixture: ComponentFixture<ErroPadraoComponent>;

  let route: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErroPadraoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErroPadraoComponent);
    component = fixture.componentInstance;
    route = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it("Deve criar", () => {
    expect(component).toBeTruthy();
  });

  it(`#${ErroPadraoComponent.prototype.voltar.name} deve voltar para o menu da HOME`, () => {
    vi.spyOn(route, "navigate").mockImplementation(() => Promise.resolve(true));
    component.voltar();
    expect(route.navigate).toHaveBeenCalledWith(["/home"], {
      skipLocationChange: true,
    });
  });
});
