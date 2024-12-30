import { Component, EventEmitter, Output, Input } from '@angular/core';
import { Filament} from '../../model/octoprint/octoprint-settings.model';

@Component({
  selector: 'app-filament-mmu-choose-function',
  templateUrl: './choose-function.component.html',
  styleUrls: ['./choose-function.component.scss', '../filament-mmu.component.scss'],
})
export class ChooseFunctionComponent {
  @Output() chooseMmuFunction = new EventEmitter<{ mmuFunction: string}>();

  public setMmuFunction(mmuFunction: string): void {
    setTimeout(() => {
      this.chooseMmuFunction.emit({mmuFunction});
    }, 150);
  }
}
