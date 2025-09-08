import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../data/data.service';

@Component({
  standalone: true,
  selector: 'audit-log-component',
  imports: [CommonModule],
  template: `
    <div class="p-3">
      <h4 class="font-semibold">Audit Log</h4>
      <div *ngIf="logs.length === 0" class="text-sm text-muted-foreground">No audit entries yet.</div>
      <div *ngFor="let l of logs" class="mt-2 p-3 card">
        <div class="text-sm text-muted-foreground">{{l.timestamp}} • {{l.entity}} • {{l.action}}</div>
        <div class="mt-1 text-xs">Before: <pre class="whitespace-pre-wrap">{{l.before | json}}</pre></div>
        <div class="mt-1 text-xs">After: <pre class="whitespace-pre-wrap">{{l.after | json}}</pre></div>
      </div>
    </div>
  `
})
export class AuditLogComponent {
  logs: any[] = [];
  constructor(private ds: DataService) {
    (this.ds as any)._db.auditLogs.orderBy('timestamp').reverse().toArray().then((r: any) => this.logs = r || []);
  }
}
