import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ResponseModel } from '@app/components/exemplos/chamar-bff/model/response.model';
import { AppConfigService } from '@app/core/services/config/app-config.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BffService {
  private readonly _http = inject(HttpClient);
  private readonly _app = inject(AppConfigService);

  obterLista(): Observable<ResponseModel[]> {
    const url = this._app.config.urlAPI + '/check-request';
    return this._http.get<ResponseModel[]>(url);
  }
}
