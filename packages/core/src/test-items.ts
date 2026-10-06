import type { StockItem } from './types';

/** A stock item for tests, with defaults for everything but its type. */
export const item = (id: string, fields: Partial<StockItem> & Pick<StockItem, 'type'>): StockItem => ({
  id,
  name: id,
  quantity: 1,
  remind: true,
  location: '',
  ...fields,
});
