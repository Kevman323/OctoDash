import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { Filament } from '../model/octoprint/octoprint-settings.model';
import { PrusaMMUService } from '../services/prusammu/prusa-mmu.service';

@Component({
  selector: 'app-prusa-mmu',
  templateUrl: './prusa-mmu.component.html',
  styleUrls: ['./prusa-mmu.component.scss'],
})
export class PrusaMMUComponent implements OnDestroy, OnInit {
  constructor(public prusaMMUService: PrusaMMUService) {}
  subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.subscriptions.push(this.prusaMMUService.initFilaments().subscribe());
  }

  setFilament(filament: Filament) {
    this.subscriptions.push(this.prusaMMUService.setFilament(filament).subscribe());
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
