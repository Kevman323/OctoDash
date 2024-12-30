import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { FilamentSpool } from '../../model';

@Injectable()
export abstract class FilamentPluginService {
  abstract getSpools(): Observable<Array<FilamentSpool>>;

  abstract getCurrentSpool(): Observable<FilamentSpool>;
  abstract getCurrentSpoolToolIndex(toolIndex?: number): Observable<FilamentSpool>;
  abstract getCurrentSpools(): Observable<FilamentSpool[]>;

  abstract setSpool(spool: FilamentSpool): Observable<void>;
  abstract setSpoolToolIndex(spool: FilamentSpool, toolIndex?: number): Observable<void>;
}
