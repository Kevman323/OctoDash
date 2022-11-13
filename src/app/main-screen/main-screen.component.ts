import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { ConfigService } from '../config/config.service';
import { EventService } from '../event.service';
import { FilesService } from '../services/files/files.service';
import {PrusaMMUService} from "../services/prusammu/prusa-mmu.service";

@Component({
  selector: 'app-main-screen',
  templateUrl: './main-screen.component.html',
})
export class MainScreenComponent {
  public printing = false;
  usePrusaMMU = false;

  public constructor(
    private eventService: EventService,
    private fileService: FilesService,
    private configService: ConfigService,
    private router: Router,
    public prusaMMUService: PrusaMMUService
  ) {
    if (!this.configService.isInitialized()) {
      this.router.navigate(['/']);
    } else {
      this.usePrusaMMU = this.configService.isPrusaMMUPluginEnabled();
    }
  }

  public isPrinting(): boolean {
    return this.eventService.isPrinting();
  }

  public isFileLoaded(): boolean {
    return this.fileService.getLoadedFile();
  }
}
