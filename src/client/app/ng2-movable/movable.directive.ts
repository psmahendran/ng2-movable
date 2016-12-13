import {
  Directive, Input, HostListener, HostBinding, ContentChildren, QueryList,
  AfterContentInit, ElementRef, ChangeDetectorRef
} from '@angular/core';
import { MovableHandleDirective } from './movablehandle.directive';

export class Position {
  public clientY: number;
  public clientX: number;
  constructor(event: Position | Event | ElementRef | number, posX?: number) {
    if (event instanceof Position) {
      this.clientY = event.clientY;
      this.clientX = event.clientX;
    } else if (event instanceof ElementRef) {
      this.clientY = event.nativeElement.style.top.replace('px', '');
      this.clientX = event.nativeElement.style.left.replace('px', '');
    } else if (event instanceof MouseEvent) {
      this.clientY = event.clientY;
      this.clientX = event.clientX;
    } else if (typeof event === 'number' && posX) {
      this.clientY = event;
      this.clientX = posX;
    } else if ((<any>event).changedTouches && (<any>event).changedTouches.length > 0) {
      this.clientY = (<any>event).changedTouches[0].clientY;
      this.clientX = (<any>event).changedTouches[0].clientX;
    }
  }
  public minus(position: Position) {
    return new Position(this.clientY - position.clientY, this.clientX - position.clientX);
  }
}

@Directive({
  selector: '[movable]'
})
export class MovableDirective implements AfterContentInit {

  /** saved start position when moving starts. */
  protected startPosition: Position;

  /** true if moving is in progress. */
  @HostBinding('class.movable-moving')
  protected isMoving = false;

  @HostBinding('class.movable-handle')
  protected isHandle = false;

  /** set position style on host to relative. */
  @HostBinding('style.position')
  protected positionStyle: string = 'relative';

  /** set class on host to indicate movable support. */
  @HostBinding('class.movable')
  protected isMovable: boolean = true;

  /** set class depending on the status. */
  @HostBinding('class.movable-enabled')
  protected _movableEnabled: boolean = true;
  protected get movableEnabled(): boolean {
    return this._movableEnabled;
  };

  /** optional input to toggle movable status. */
  @Input()
  protected set movableEnabled(value: boolean) {
    this._movableEnabled = value;
    // propagate enabled status to handles
    if (this.handles.length > 0) {
      this.handles.forEach(handle => handle.movableEnabled = value);
    }
  }

  protected movableName: string;
  @Input()
  protected set movable(value: string) {
    this.movableName = value;
  }

  @ContentChildren(MovableHandleDirective, { descendants: true })
  protected allHandles: QueryList<MovableHandleDirective>;
  protected handles: MovableHandleDirective[] = [];

  constructor(public element: ElementRef, protected cd: ChangeDetectorRef) {
  }

  ngAfterContentInit() {
    this.allHandles.changes.subscribe((handles: QueryList<MovableHandleDirective>) => this.updateQuery(handles));
    // TODO: workaround for https://github.com/angular/angular/issues/12818 and https://github.com/angular/angular/issues/9689
    // manually trigger first update.
    this.updateQuery(this.allHandles);
  }

  protected updateQuery(handles: QueryList<MovableHandleDirective>) {
    this.handles = handles.filter(handle => handle.movableHandle === this.movableName);
    // fallback to this as handle if not specified
    if (this.handles.length === 0) {
      this.isHandle = true;
    }
    // propagate enabled status to handles
    if (this.handles.length > 0) {
      this.handles.forEach(handle => handle.movableEnabled = this.movableEnabled);
    }
  }

  @HostListener('mousedown', ['$event'])
  protected onMouseDown(event: MouseEvent) {
    this.startMoving(event);
  }

  @HostListener('document:mouseup')
  protected onMouseUp() {
    this.stopMoving();
  }

  // using document to move even pointer leaves the host (fast moving)
  @HostListener('document:mousemove', ['$event'])
  protected onMouseMove(event: MouseEvent) {
    this.moveElement(event);
  }

  @HostListener('touchstart', ['$event'])
  protected onTouchStart(event: Event) {

    this.startMoving(event);
  }

  @HostListener('document:touchend')
  protected onTouchEnd() {
    this.stopMoving();
  }

  // using document to move even pointer leaves the host (fast moving)
  @HostListener('document:touchmove', ['$event'])
  protected onTouchMove(event: Event) {
    this.moveElement(event);
  }

  protected startMoving(event: Event) {
    if (this.isEventInHandle(event) && this.movableEnabled) {
      this.startPosition = new Position(event).minus(new Position(this.element));
      this.isMoving = true;
      if (this.handles.length > 0) {
        this.handles.forEach(handle => handle.isMoving = true);
      }
      this.cd.detectChanges(); // don't know why this is required, in some situations the HostBinding's don't work as expected.
    }
  }

  protected stopMoving() {
    this.isMoving = false;
    if (this.handles.length > 0) {
      this.handles.forEach(handle => handle.isMoving = false);
    }
    this.cd.detectChanges(); // don't know why this is required, in some situations the HostBinding's don't work as expected.
  }

  /**
   * update host position for the specific event when moving.
   */
  protected moveElement(event: Event) {
    if (this.isMoving) {
      var newPosition = new Position(event).minus(this.startPosition);
      this.element.nativeElement.style.top = newPosition.clientY + 'px';
      this.element.nativeElement.style.left = newPosition.clientX + 'px';
    }
  }

  /**
   * checks if the event occured inside the handle element.
   */
  protected isEventInHandle(event: Event) {
    if (this.isHandle) {
      var srcElement = event.srcElement;
      // check parent elements too.
      while (srcElement !== this.element.nativeElement && srcElement.parentElement) {
        srcElement = srcElement.parentElement;
      }
      return this.element.nativeElement === srcElement;
    } else {
      return this.handles.some(handle => {
        var srcElement = event.srcElement;
        // check parent elements too.
        while (srcElement !== handle.element.nativeElement && srcElement.parentElement) {
          srcElement = srcElement.parentElement;
        }
        return handle.element.nativeElement === srcElement;
      });
    }
  }

}