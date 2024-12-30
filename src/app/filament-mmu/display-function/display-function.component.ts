import { Component, EventEmitter, Output, Input, OnInit, OnDestroy } from '@angular/core';
import { Filament} from '../../model/octoprint/octoprint-settings.model';
import { FilamentSpool, PrinterStatus } from '../../model';
import { Subscription } from 'rxjs';

import { FilamentService } from '../../services/filament/filament.service';
import { PrinterService } from '../../services/printer/printer.service';
import { SocketService } from '../../services/socket/socket.service';
import { ConfigService } from '../../config/config.service';

@Component({
  selector: 'app-filament-mmu-display-function',
  templateUrl: './display-function.component.html',
  styleUrls: ['./display-function.component.scss', '../filament-mmu.component.scss'],
})
// Component Theory
// Each mmu function has a set of stages, that walk the user through the steps required to complete the function
// these steps include telling the user what to do, executing gcode, waiting for functions to finish, sending filament manager calls, etc.
// The display should start by detecting any upset conditions, and either prompint the user to return, or continue
// Then the display should prompt the user to prepare for an action
// Next the display should start the action, and either wait a set delay, or wait for the user to mark when finished.
// The display may do several stages of this before the function is finished.
// Finially, the display should show the action is finished, and prompt the user to return to the menu.
//
// On init, initiateDisplay is called, which checks the function, and sets the current stage based on any possible upset conditions.
// From then, the stage is set, and only changes when the button is clicked, or a time delay returns
// updateDisplay is the main update function called by initiateDisplay, buttonClick, and timeoutDelay.
// updateDisplay splits out the display updates by mmu function into their own functions for readability
// finally, startCheckmarkAnim is called when a function completes sucessfully, or returnToFunctionPage if unsucessfully
export class DisplayFunctionComponent {
  @Input() selectedMmuFilament: Filament;
  @Input() selectedMmuSpool: FilamentSpool;
  @Input() selectedMmuFunction: String;
  @Input() selectedNewSpool: FilamentSpool;
  @Input() selectedMmuSlot: number;

  @Output() setSpoolSelection = new EventEmitter<void>();
  @Output() unloadSpoolSelection = new EventEmitter<void>();
  @Output() returnToFunctionPage = new EventEmitter<void>();
  @Output() startCheckmarkAnim = new EventEmitter<void>();
  public currentMessage = "Current Message";
  public buttonMessage = "Button";
  public currentStage = 1;
  public hideButton = false;
  public hotendTemperature: number;
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private printerService: PrinterService,
    private socketService: SocketService,
    private configService: ConfigService,
  ) {}

  //oninit, initaite display, and subscribe to temp
  ngOnInit(): void {
    this.initiateDisplay();
    
    this.subscriptions.add(
      this.socketService.getPrinterStatusSubscribable().subscribe((printerStatus: PrinterStatus): void => {
        this.hotendTemperature = printerStatus.tool0.current;
      }),
    );
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  //when starting up, set the screen display based on function and conditions
  public initiateDisplay(): void {
    //by default start on stage 1 and show the button
    this.currentStage = 1;
    this.hideButton = false;
    
    if (this.selectedMmuFunction === "load") {
      //if filament is empty, skip unload
      if (!this.selectedMmuFilament.enabled) {
        this.currentStage = 3;
      }
    } else if (this.selectedMmuFunction === "unload") {
      //if filament is empty, just prompt user to return
      if (!this.selectedMmuFilament.enabled) {
        this.currentStage = 11;
      }
    } else if (this.selectedMmuFunction === "load-nozzle") {
      //if filament slot looks empty, ask user first.
      if (!this.selectedMmuFilament.enabled) {
        this.currentStage = 0;
      }
    } else if (this.selectedMmuFunction === "unload-nozzle") {
      //if filament slot looks empty, ask user first.
      if (!this.selectedMmuFilament.enabled) {
        this.currentStage = 0;
      }
    } else if (this.selectedMmuFunction === "cut") {
      //if filament slot looks empty, ask user first.
      if (!this.selectedMmuFilament.enabled) {
        this.currentStage = 0;
      }
    } else if (this.selectedMmuFunction === "eject") {
      //if filament slot looks empty, ask user first.
      if (!this.selectedMmuFilament.enabled) {
        this.currentStage = 0;
      }
    }
    
    this.updateDisplay();
  }

  //update the display based on the mmu function
  public updateDisplay(): void {
    if (this.selectedMmuFunction === "load") {
      this.updateDisplayLoad();
    } else if (this.selectedMmuFunction === "unload") {
      this.updateDisplayUnload();
    } else if (this.selectedMmuFunction === "load-nozzle") {
      this.updateDisplayLoadNozzle();
    } else if (this.selectedMmuFunction === "unload-nozzle") {
      this.updateDisplayUnloadNozzle();
    } else if (this.selectedMmuFunction === "cut") {
      this.updateDisplayCut();
    } else if (this.selectedMmuFunction === "eject") {
      this.updateDisplayEject();
    }
  }

  //display update for load
  public updateDisplayLoad(): void{
      //unload filament, user just pulls it out and confirms, then we remove the spool from the filament manager
      if (this.currentStage === 1) {
        this.currentMessage = "unload the filament from slot " + this.selectedMmuSlot;
        this.hideButton = false;
        this.buttonMessage = "done unloading filament";
      } else if (this.currentStage === 2) {
        this.unloadSpoolSelection.emit();
        this.currentMessage = "unloading filament..."
        this.hideButton = true;
        setTimeout(this.timeoutDelay.bind(this), 1500);
      //if the filament starts empty, skip to this step
      } else if (this.currentStage === 3) {
        this.currentMessage = "get ready to load filament into slot " + this.selectedMmuSlot;
        this.hideButton = false;
        this.buttonMessage = "ready to load";
      //load filament, send gcode to load, and wait for user to confirm when done. Update filament manager then return
      } else if (this.currentStage === 4) {
        this.sendGcode("load", this.selectedMmuSlot - 1);
        this.currentMessage = "please load filament: " + this.selectedNewSpool.name;
        this.hideButton = false;
        this.buttonMessage = "done loading filament";
      } else if (this.currentStage === 5) {
        this.setSpoolSelection.emit();
        this.currentMessage = "loading filament..."
        this.hideButton = true;
        setTimeout(this.timeoutDelay.bind(this), 1500);
      } else if (this.currentStage === 6) {
        this.currentMessage = "filament change complete!";
        this.hideButton = true;
        setTimeout(this.timeoutDelay.bind(this), 1500);
      } else if (this.currentStage === 7) {
        this.startCheckmarkAnim.emit();
      }
  }

  //display update for unload
  public updateDisplayUnload(): void {
    //unload the filament
    if (this.currentStage === 1) {
      this.currentMessage = "unload the filament from slot " + this.selectedMmuSlot;
      this.hideButton = false;
      this.buttonMessage = "done unloading filament";
    } else if (this.currentStage === 2) {
      this.unloadSpoolSelection.emit();
      this.currentMessage = "unloading filament..."
      this.hideButton = true;
      setTimeout(this.timeoutDelay.bind(this), 1500);
    } else if (this.currentStage === 3) {
      this.currentMessage = "filament unload complete!";
      this.hideButton = true;
      setTimeout(this.timeoutDelay.bind(this), 1500);
    } else if (this.currentStage === 4) {
      this.startCheckmarkAnim.emit();
    //if filament is already empty, skip to here
    } else if (this.currentStage === 11) {
      this.currentMessage = "filament slot " + this.selectedMmuSlot + " is already empty!"
      this.hideButton = false;
      this.buttonMessage = "return to menu";
    } else if (this.currentStage === 12) {
      this.returnToFunctionPage.emit();
    }
  }

  //display update for load to nozzle
  public updateDisplayLoadNozzle(): void {
    if (this.currentStage === 0) {
      this.currentMessage = "filament slot " + this.selectedMmuSlot + " looks empty, continue?";
      this.hideButton = false;
      this.buttonMessage = "continue";
    } else if (this.currentStage === 1) {
      this.currentMessage = "checking nozzle temperature...";
      this.hideButton = true;
      setTimeout(this.timeoutDelay.bind(this), 1500);
    } else if (this.currentStage === 2) {
      if (this.checkTempOK()){
        this.currentStage = 4;
      } else {
        this.currentStage = 3;
      }
      this.updateDisplay();
    } else if (this.currentStage === 3) {
      this.currentMessage = "hotend may not be hot enough, continue?";
      this.hideButton = false;
      this.buttonMessage = "continue";
    } else if (this.currentStage === 4) {
      this.currentMessage = "ready to load filament to nozzle";
      this.hideButton = false;
      this.buttonMessage = "start load to nozzle";
    } else if (this.currentStage === 5) {
      this.sendGcode("load-nozzle", this.selectedMmuSlot - 1);
      this.currentMessage = "loading filament to nozzle...";
      this.hideButton = false;
      this.buttonMessage = "done loading to nozzle";
    } else if (this.currentStage === 6) {
      this.currentMessage = "load to nozzle complete!";
      this.hideButton = true;
      setTimeout(this.timeoutDelay.bind(this), 1500);
    } else if (this.currentStage === 7) {
      this.startCheckmarkAnim.emit();
    }
  }

  //display update for unload from nozzle
  public updateDisplayUnloadNozzle(): void {
    if (this.currentStage === 0) {
      this.currentMessage = "filament slot " + this.selectedMmuSlot + " looks empty, continue?";
      this.hideButton = false;
      this.buttonMessage = "continue";
    } else if (this.currentStage === 1) {
      this.currentMessage = "checking nozzle temperature...";
      this.hideButton = true;
      setTimeout(this.timeoutDelay.bind(this), 1500);
    } else if (this.currentStage === 2) {
      if (this.checkTempOK()){
        this.currentStage = 4;
      } else {
        this.currentStage = 3;
      }
      this.updateDisplay();
    } else if (this.currentStage === 3) {
      this.currentMessage = "hotend may not be hot enough, continue?";
      this.hideButton = false;
      this.buttonMessage = "continue";
    } else if (this.currentStage === 4) {
      this.currentMessage = "ready to unload filament from nozzle";
      this.hideButton = false;
      this.buttonMessage = "start unload from nozzle";
    } else if (this.currentStage === 5) {
      this.sendGcode("unload-nozzle", this.selectedMmuSlot - 1);
      this.currentMessage = "unloading filament from nozzle...";
      this.hideButton = false;
      this.buttonMessage = "done unloading from nozzle";
    } else if (this.currentStage === 6) {
      this.currentMessage = "unload from nozzle complete!";
      this.hideButton = true;
      setTimeout(this.timeoutDelay.bind(this), 1500);
    } else if (this.currentStage === 7) {
      this.startCheckmarkAnim.emit();
    }
  }

  //display update for filament cut
  public updateDisplayCut(): void {
    if (this.currentStage === 0) {
      this.currentMessage = "filament slot " + this.selectedMmuSlot + " looks empty, continue?";
      this.hideButton = false;
      this.buttonMessage = "continue";
    } else if (this.currentStage === 1) {
      this.currentMessage = "ready to cut filament";
      this.hideButton = false;
      this.buttonMessage = "start cut";
    } else if (this.currentStage === 2) {
      this.sendGcode("cut", this.selectedMmuSlot - 1);
      this.currentMessage = "cutting filament...";
      this.hideButton = false;
      this.buttonMessage = "done cutting filament";
    } else if (this.currentStage === 3) {
      this.currentMessage = "cut filament complete!";
      this.hideButton = true;
      setTimeout(this.timeoutDelay.bind(this), 1500);
    } else if (this.currentStage === 4) {
      this.startCheckmarkAnim.emit();
    }
  }

  //display update for filament eject
  public updateDisplayEject(): void {
    if (this.currentStage === 0) {
      this.currentMessage = "filament slot " + this.selectedMmuSlot + " looks empty, continue?";
      this.hideButton = false;
      this.buttonMessage = "continue";
    } else if (this.currentStage === 1) {
      this.currentMessage = "ready to eject filament";
      this.hideButton = false;
      this.buttonMessage = "start eject";
    } else if (this.currentStage === 2) {
      this.sendGcode("eject", this.selectedMmuSlot - 1);
      this.currentMessage = "ejecting filament...";
      this.hideButton = false;
      this.buttonMessage = "done ejecting filament";
    } else if (this.currentStage === 3) {
      this.currentMessage = "eject filament complete!";
      this.hideButton = true;
      setTimeout(this.timeoutDelay.bind(this), 1500);
    } else if (this.currentStage === 4) {
      this.startCheckmarkAnim.emit();
    }
  }

  //on button click, increase display
  public buttonClick(): void {
    this.currentStage++;
    this.updateDisplay();
  }

  //hookback for time delay
  public timeoutDelay(): void {
    this.currentStage++;
    this.updateDisplay();
  }

  //this compares the current nozzle temp with the wanted one, and changes the stage
  public checkTempOK(): boolean {
    var wantedTemp = this.configService.getDefaultHotendTemperature();
    if (this.selectedMmuSpool && this.selectedMmuSpool.temperatureOffset) {
      wantedTemp = wantedTemp + this.selectedMmuSpool.temperatureOffset;
    }
    if (this.hotendTemperature > (wantedTemp - 20)) {
      return true;
    } else {
      return false;
    }
  }

  //send gcode based on mmu function
  public sendGcode(gcodeCommand: string, nozzle: number): void {
    console.log(gcodeCommand + " " + nozzle);
    //return;
    if (gcodeCommand === "load") {
      this.printerService.executeGCode("M704 P" + nozzle);
    } else if (gcodeCommand === "load-nozzle") {
      this.printerService.executeGCode("M701 P" + nozzle);
    } else if (gcodeCommand === "unload-nozzle") {
      this.printerService.executeGCode("M702");
    } else if (gcodeCommand === "cut") {
      this.printerService.executeGCode("M706 P" + nozzle);
    } else if (gcodeCommand === "eject") {
      this.printerService.executeGCode("M705 P" + nozzle);
    }
  }
}
