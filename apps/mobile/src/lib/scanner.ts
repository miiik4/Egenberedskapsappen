type BarcodeCallback = (barcode: string) => void;

let activeCallback: BarcodeCallback | null = null;

/**
 * Registers a one-time callback to receive a scanned barcode.
 * Returns an unregister cleanup function.
 */
export function registerBarcodeCallback(cb: BarcodeCallback): () => void {
  activeCallback = cb;
  return () => {
    if (activeCallback === cb) {
      activeCallback = null;
    }
  };
}

/**
 * Delivers the scanned barcode to the registered listener if present.
 * Returns true if a listener handled it, false otherwise.
 */
export function deliverBarcode(barcode: string): boolean {
  if (activeCallback) {
    const cb = activeCallback;
    activeCallback = null;
    cb(barcode);
    return true;
  }
  return false;
}
