import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ConfigService } from '../../config/config.service';
import { Filament, OctoPrintSettings, PrusaMMU } from '../../model/octoprint/octoprint-settings.model';
import { PrusaMMUCommand } from '../../model/octoprint/prusammu.model';

@Injectable({
  providedIn: 'root',
})
export class PrusaMMUService {
  public filamentPickerIsVisible = false;
  public filaments: Filament[] = [
    { id: 1, name: 'Filament 1', color: '#FFF', enabled: true },
    { id: 2, name: 'Filament 2', color: '#FFF', enabled: true },
    { id: 3, name: 'Filament 3', color: '#FFF', enabled: true },
    { id: 4, name: 'Filament 4', color: '#FFF', enabled: true },
    { id: 5, name: 'Filament 5', color: '#FFF', enabled: true },
  ];

  constructor(private http: HttpClient, private configService: ConfigService) {}

  showHideFilamentPicker(show: boolean) {
    this.filamentPickerIsVisible = show;
  }

  setFilament(filament: Filament): Observable<unknown> {
    // Hide the filament-picker
    this.filamentPickerIsVisible = false;
    // Subtract one from id (choice is zero-indexed)
    const payload: PrusaMMUCommand = { choice: filament.id - 1, command: 'select' };
    return this.http.post(
      this.configService.getApiURL('plugin/prusammu'),
      payload,
      this.configService.getHTTPHeaders(),
    );
  }

  public initFilaments(): Observable<void> {
    return this.getPrusaMMUSettings().pipe(
      map(prusaMMUSettings => {
        // Right now we only handle those from PrusaMMU's own settings
        if (prusaMMUSettings.filamentSource === 'prusammu' && prusaMMUSettings?.filament?.length) {
          this.filaments = prusaMMUSettings.filament;
        }
      }),
    );
  }

  private getPrusaMMUSettings(): Observable<PrusaMMU> {
    const settingsUrl = this.configService.getApiURL('settings');
    return this.http
      .get<OctoPrintSettings>(settingsUrl, this.configService.getHTTPHeaders())
      .pipe(map(settings => settings.plugins.prusammu));
  }
}
