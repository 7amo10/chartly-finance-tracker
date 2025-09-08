import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  // Default closed to avoid legacy visible sidebar on reload
  private _open$ = new BehaviorSubject<boolean>(false);
  readonly open$ = this._open$.asObservable();

  set(open: boolean) { this._open$.next(open); }
  toggle() { this._open$.next(!this._open$.value); }
  get value() { return this._open$.value; }
}
