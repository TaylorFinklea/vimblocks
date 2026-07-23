export type Disposer = () => void;

export class DisposableRegistry {
  private disposers: Disposer[] = [];
  private disposed = false;

  add(disposer: Disposer | null | undefined): void {
    if (!disposer) {
      return;
    }

    if (this.disposed) {
      disposer();
      return;
    }

    this.disposers.push(disposer);
  }

  listen(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    for (const disposer of this.disposers.reverse()) {
      disposer();
    }
    this.disposers = [];
  }
}
