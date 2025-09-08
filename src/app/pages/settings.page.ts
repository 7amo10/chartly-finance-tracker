import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../data/data.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card p-4">
      <h3 class="text-lg font-semibold">Settings</h3>
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-muted-foreground">Theme</label>
          <select class="input mt-1" [(ngModel)]="settings.theme">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-muted-foreground">Default Currency</label>
          <input class="input mt-1" [(ngModel)]="settings.defaultCurrency" />
        </div>
      </div>
      <div class="mt-4">
        <button class="btn-primary" (click)="save()">Save Settings</button>
      </div>
    </div>
  `
})
export class SettingsPage {
  settings: any = {};
  constructor(private ds: DataService) {
    this.ds.settings$.subscribe(s => this.settings = s ?? {});
  }

  save() {
    this.ds.saveSettings(this.settings);
  }
}
