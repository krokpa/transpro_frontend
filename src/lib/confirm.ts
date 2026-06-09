export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
};

type Listener = (state: { options: ConfirmOptions; id: number } | null) => void;

let _listener: Listener | null = null;
let _resolver: ((value: boolean) => void) | null = null;
let _counter  = 0;

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    _resolver = resolve;
    _listener?.({ options, id: ++_counter });
  });
}

export function _registerConfirmListener(fn: Listener): () => void {
  _listener = fn;
  return () => { _listener = null; };
}

export function _resolveConfirm(value: boolean): void {
  const r = _resolver;
  _resolver = null;
  r?.(value);
}
