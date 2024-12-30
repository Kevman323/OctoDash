import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnimationItem } from 'lottie-web';
import { AnimationOptions } from 'ngx-lottie';
import { take } from 'rxjs/operators';

import { ConfigService } from '../config/config.service';
import { FilamentSpool, PrinterStatus } from '../model';
import { FilamentService } from '../services/filament/filament.service';
import { PrinterService } from '../services/printer/printer.service';
import { SocketService } from '../services/socket/socket.service';
import { Filament} from '../model/octoprint/octoprint-settings.model';

@Component({
  selector: 'app-filament-mmu',
  templateUrl: './filament-mmu.component.html',
  styleUrls: ['./filament-mmu.component.scss'],
  providers: [FilamentService],
})
export class FilamentMMUComponent implements OnInit, OnDestroy {
  //totalPages - Used by this to limit pages
  private totalPages = 4;
  //hotendPreviousTemperature - Used by this to return hotend temperature once done
  private hotendPreviousTemperature = 0;

  //page - used by this to keep track of page number
  public page: number;
  //showCheckmark - used by this to keep track of whether the checkmark animation is being shown or not
  public showCheckmark = false;
  //selectedMmuSlot - used to keep track of which mmu slot was selected on page 0
  public selectedMmuSlot: number;
  //selectedMmuFunction - used to keep track of which mmu function was selected on page 1
  public selectedMmuFunction = "";
  //selectedMmuFilament - used to keep track of the filament details of the current selected slot
  public selectedMmuFilament: Filament = { id: 1, name: 'Empty', color: '#FFF', enabled: false };
  //selectedMmuSpool - used to keep track of the specific spool in the selected mmu slot
  public selectedMmuSpool: FilamentSpool;
  //selectedNewSpool - used to keep track of the selected new spool on page 2
  public selectedNewSpool: FilamentSpool;
  public checkmarkOptions: AnimationOptions = {
    path: 'assets/animations/checkmark.json',
    loop: false,
  };

  public constructor(
    private router: Router,
    private configService: ConfigService,
    private printerService: PrinterService,
    private socketService: SocketService,
    private filament: FilamentService,
  ) {
    this.socketService
      .getPrinterStatusSubscribable()
      .pipe(take(1))
      .subscribe((printerStatus: PrinterStatus): void => {
        this.hotendPreviousTemperature = printerStatus.tool0.set;
      });
  }

  //on init, set page to 0. Unsure if needed, original filament menu took steps to handle lack of a filament manager. TODO
  public ngOnInit(): void {
    this.setPage(0);
  }

  //on destroy, set the hotend back to original temperature
  public ngOnDestroy(): void {
    this.printerService.setTemperatureHotend(this.hotendPreviousTemperature);
  }

  //if page is too high, or passed true, return to main screen, otherwise increase page
  public increasePage(returnToMainScreen = false): void {
    if (this.page === this.totalPages || returnToMainScreen) {
      this.router.navigate(['/main-screen']);
    } else if (this.page == 2) {
      this.setPage(4);
    } else {
      this.setPage(this.page + 1);
    }
  }

  //decrease page based on multiple conditions
  public decreasePage(): void {
    //if on page 0, return to the main screen
    if (this.page === 0) {
      this.router.navigate(['/main-screen']);
    //If on page 3, the heat nozzle page, skip page 2, the filament select page, and go to page 1
    } else if (this.page === 3) {
      this.setPage(1);
    //If on page for, return to either page 3, 2, or 1, based on the current function
    } else if (this.page === 4) {
      if (this.selectedMmuFunction === "load") {
        this.setPage(3);
      } else if (this.selectedMmuFunction === "load-nozzle" || this.selectedMmuFunction === "unload-nozzle") {
        this.setPage(2);
      } else {
        this.setPage(1);
      }
    //otherwise, decrease the page
    } else {
      this.setPage(this.page - 1);
    }
  }

  //sets a page to a specific one, and updates the progress bar
  private setPage(page: number): void {
    setTimeout((): void => {
      const progressBar = document.getElementById('progressBar');
      if (progressBar) {
        if (page == 2 || page == 3) {
          document.getElementById('progressBar').style.width = '10vw';
        } else if (page === 4) {
          document.getElementById('progressBar').style.width = '20vw';
        }
      }
    }, 200);
    this.page = page;
  }

  //starts the checkmark animation, before returning to the function page
  public startCheckmarkAnim(): void {
    this.showCheckmark = true;
    setTimeout(this.returnToFunctionPage.bind(this), 1350, true);
  }

  //after checkmark shows, disables it and returns to mmu function select page
  public returnToFunctionPage(): void {
    this.showCheckmark = false;
    this.setPage(1);
  }

  //Sets the selected new spool, if long press, just sets. otherwise, proceeds to next page
  public setSpool(spoolInformation: { spool: FilamentSpool; skipChange: boolean }): void {
    this.selectedNewSpool = spoolInformation.spool;
    if (spoolInformation.skipChange) {
      this.setSpoolSelection();
    } else {
      this.increasePage();
    }
  }

  //triggers filament manager plugin spool change, sets selectedNewSpool to selectedMmuSpool, and sets new data for selectedMmuFilament, then increases page
  public setSpoolSelection(): void {
    if (this.selectedNewSpool && this.selectedMmuSlot) {
      this.filament
        .setSpoolToolIndex(this.selectedNewSpool, (this.selectedMmuSlot - 1))
        .then((): void => {
          this.selectedMmuFilament = { 
            id: this.selectedMmuSlot, 
            name: `${this.selectedNewSpool.name}${this.selectedNewSpool.material ? ' (' + this.selectedNewSpool.material + ')' : ''}`,
            color: this.selectedNewSpool.color ?? '#FFF',
            enabled: this.selectedNewSpool?.id > -1, };
          this.selectedMmuSpool = this.selectedNewSpool
        })
        .catch(() => this.increasePage(true));
    } else {
      this.increasePage(true);
    }
  }

  //triggers filament manager plugin spool unload by setting the id to -1, updates data for selectedMmuFilament, then increases page
  public unloadSpoolSelection(): void {
    if (this.selectedMmuSlot) {
      this.filament
        .setSpoolToolIndex(<FilamentSpool>{id: -1}, (this.selectedMmuSlot - 1))
        .then((): void => {
          this.selectedMmuFilament = { 
            id: this.selectedMmuSlot, 
            name: "empty",
            color: "#FFF",
            enabled: false, };
          this.selectedMmuSpool = <FilamentSpool>{id: -1};
        })
        .catch(() => this.increasePage(true));
    } else {
      this.increasePage(true);
    }
  }

  public setAnimationSpeed(animation: AnimationItem): void {
    animation.setSpeed(0.55);
  }

  //sets the mmu slot, filament, and spool based on selection, then increases the page
  public setMmuSlot(mmuInfo: {mmuSlotNum: number; mmuFilament: Filament; mmuSpool: FilamentSpool}): void {
    this.selectedMmuSlot = mmuInfo.mmuSlotNum;
    this.selectedMmuFilament = mmuInfo.mmuFilament;
    this.selectedMmuSpool = mmuInfo.mmuSpool
    this.increasePage();
  }

  //sets the mmu function, then icnreases the page based on the function
  public setMmuFunction(mmuInfo: {mmuFunction: string}): void {
    this.selectedMmuFunction = mmuInfo.mmuFunction;
    if (mmuInfo.mmuFunction == "load-nozzle" || mmuInfo.mmuFunction == "unload-nozzle") {
      this.setPage(2);
    } else if (mmuInfo.mmuFunction == "load") {
      this.setPage(3);
    } else {
      this.setPage(4);
    }
  }
}
