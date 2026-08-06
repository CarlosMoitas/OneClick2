import { ComponentFixture, TestBed } from "@angular/core/testing";
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { NotFoundComponent } from "./not-found.component";
import { Router } from "@angular/router";

describe("NotFoundComponent", () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  let route: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    route = TestBed.inject(Router);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("Deve criar", () => {
    expect(component).toBeTruthy();
  });

  it(`#${NotFoundComponent.prototype.voltar.name} deve voltar para o menu da HOME`, () => {
    vi.spyOn(route, "navigate").mockImplementation(() => Promise.resolve(true));
    component.voltar();
    expect(route.navigate).toHaveBeenCalledWith(["/home"], {
      skipLocationChange: true,
    });
  });
});
