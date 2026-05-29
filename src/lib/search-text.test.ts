import { describe, expect, it } from 'vitest';

import type { Order } from '../api/orders';
import { orderMatchesSearch } from './search-text';

describe('orderMatchesSearch', () => {
  const base: Order = {
    id: 'S0000000304',
    external_order_id: 'S0000000304',
    customer_name: 'Yaman Kupeli',
    status: 'confirmed',
  };

  it('matches partial external order id suffix', () => {
    expect(orderMatchesSearch(base, '304')).toBe(true);
    expect(orderMatchesSearch({ ...base, id: 'S00000000000304', external_order_id: 'S00000000000304' }, '304')).toBe(true);
    expect(orderMatchesSearch({ ...base, id: 'X00000000000304', external_order_id: 'X00000000000304' }, '304')).toBe(true);
    expect(orderMatchesSearch({ ...base, id: 'S000000123456', external_order_id: 'S000000123456' }, '304')).toBe(false);
  });

  it('matches customer name', () => {
    expect(orderMatchesSearch(base, 'Yaman Kupeli')).toBe(true);
    expect(orderMatchesSearch(base, 'yaman')).toBe(true);
    expect(orderMatchesSearch(base, 'Yaman  Kupeli')).toBe(true);
  });

  it('returns true for empty needle', () => {
    expect(orderMatchesSearch(base, '')).toBe(true);
  });
});
