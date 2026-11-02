import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

describe('Customer Portal output encoding', () => {
  it('renders attacker-controlled order fields as text, not HTML', () => {
    const tbody = { innerHTML: '' };
    const source = readFileSync('public/app.js', 'utf8');
    const context = {
      window: { location: { origin: 'http://localhost:3001' }, addEventListener() {} },
      localStorage: { getItem() { return null; } },
      document: { getElementById(id: string) { return id === 'orders-table-body' ? tbody : null; } },
    };
    runInNewContext(source + `\nrenderOrdersTable([{ id: '<b>ID</b>', item: '<img src=x onerror=alert(1)>', quantity: 1, totalPrice: 10, userEmail: '<svg onload=alert(2)>', status: 'PENDING' }], true);`, context);
    expect(tbody.innerHTML).not.toContain('<img');
    expect(tbody.innerHTML).not.toContain('<svg');
    expect(tbody.innerHTML).toContain('&lt;img');
    expect(tbody.innerHTML).toContain('&lt;b&gt;ID&lt;/b&gt;');
  });
});
