import { describe, expect, it, vi } from 'vitest';
import { deliverBarcode, registerBarcodeCallback } from './scanner';

describe('scanner callback delivery', () => {
  it('delivers barcode to registered callback and cleans up', () => {
    const cb = vi.fn();
    registerBarcodeCallback(cb);

    const handled = deliverBarcode('7039010010155');
    expect(handled).toBe(true);
    expect(cb).toHaveBeenCalledWith('7039010010155');

    // Second call should return false as callback was one-time
    const handledAgain = deliverBarcode('7039010010155');
    expect(handledAgain).toBe(false);
  });

  it('allows unregistering callback', () => {
    const cb = vi.fn();
    const unregister = registerBarcodeCallback(cb);
    unregister();

    const handled = deliverBarcode('7039010010155');
    expect(handled).toBe(false);
    expect(cb).not.toHaveBeenCalled();
  });
});
