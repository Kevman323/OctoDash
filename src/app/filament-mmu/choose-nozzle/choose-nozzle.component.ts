import { Component, EventEmitter, Output, OnInit } from '@angular/core';

import { ConfigService } from '../../config/config.service';
import { FilamentService } from '../../services/filament/filament.service';
import { Filament} from '../../model/octoprint/octoprint-settings.model';
import { FilamentSpool} from '../../model';

@Component({
  selector: 'app-filament-mmu-choose-nozzle',
  templateUrl: './choose-nozzle.component.html',
  styleUrls: ['./choose-nozzle.component.scss', '../filament-mmu.component.scss'],
})
export class ChooseNozzleComponent implements OnInit{
  @Output() chooseMmuSlot = new EventEmitter<{ mmuSlotNum: number; mmuFilament: Filament; mmuSpool: FilamentSpool}>();

  constructor(
    private filamentService: FilamentService,
    private configService: ConfigService,
  ) {}

  filamentsReady = false;
  public filaments: Filament[] = [
    { id: 1, name: 'Filament 1', color: '#FFF', enabled: true },
    { id: 2, name: 'Filament 2', color: '#FFF', enabled: true },
    { id: 3, name: 'Filament 3', color: '#FFF', enabled: true },
    { id: 4, name: 'Filament 4', color: '#FFF', enabled: true },
    { id: 5, name: 'Filament 5', color: '#FFF', enabled: true },
  ];

  public spools: FilamentSpool[];

  ngOnInit(): void {
    this.filamentsReady = false;
    // If filamentManagement is used, then fetch most recent spools (could've changed)
    if (this.configService.isFilamentManagerUsed()) {
      this.filamentService.getCurrentFilamentSpools().subscribe(spools => {
        this.spools = spools;
        this.filaments = spools.map(filament => {
          return {
            id: filament.tool,
            name: `${filament.name}${filament.material ? ' (' + filament.material + ')' : ''}`,
            color: filament.color ?? '#FFF',
            enabled: filament?.id > -1,
          };
        });
        this.filamentsReady = true;
      })
    } else {
      // Otherwise we use the ones provided by the PrusaMMU-plugin
      // TODO
    }
  }

  public setMmuSlot(mmuSlotNum: number): void {
    setTimeout(() => {
      this.chooseMmuSlot.emit({mmuSlotNum, mmuFilament: this.filaments[mmuSlotNum-1], mmuSpool: this.spools[mmuSlotNum-1]});
    }, 150);
  }
}
