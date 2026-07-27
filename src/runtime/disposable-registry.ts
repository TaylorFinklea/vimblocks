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

  dispose(options?: { onError?: (error: unknown) => void }): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    const pending = this.disposers.reverse();
    this.disposers = [];
    // Teardown has to be all-or-nothing in the other direction: one failing
    // disposer must not strand the ones registered before it. The host bridge
    // registers first and so disposes last, and leaving it armed would swallow
    // the user's keys for the rest of the session.
    for (const disposer of pending) {
      try {
        disposer();
      } catch (error) {
        if (options?.onError) options.onError(error);
        else console.error("Vimblocks disposer failed", error);
      }
    }
  }
}
