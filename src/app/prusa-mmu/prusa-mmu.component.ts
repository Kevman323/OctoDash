import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { Filament } from '../model/octoprint/octoprint-settings.model';
import { PrusaMMUService } from '../services/prusammu/prusa-mmu.service';

@Component({
  selector: 'app-prusa-mmu',
  templateUrl: './prusa-mmu.component.html',
  styleUrls: ['./prusa-mmu.component.scss'],
})
export class PrusaMMUComponent implements OnDestroy {
  constructor(public prusaMMUService: PrusaMMUService) {}
  subscriptions: Subscription[] = [];

  setFilament(filament: Filament) {
    this.prusaMMUService.setFilament(filament);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
