import { describe, it, expect } from 'vitest';
import { SKIP_SCENARIOS, apiUrl } from './helpers';

/**
 * Verifies every web console route returns a valid response (not 404/500).
 * Unauthenticated requests get 307 redirect to login — that's OK.
 * 404 means the page doesn't exist — that's a bug.
 */

// All routes from CLAUDE.md + Next.js build output
const DASHBOARD_ROUTES = [
  '/', '/products', '/orders', '/customers', '/categories', '/stores',
  '/terminals', '/users', '/reports', '/errors', '/settings', '/brands',
  '/intake', '/ai-import', '/price-review', '/catalogue', '/inventory',
  '/tables', '/stations', '/sync-inbox', '/platform',
];

const CUSTOMER_ROUTES = [
  '/customer', '/customer/products', '/customer/orders', '/customer/customers',
  '/customer/categories', '/customer/stores', '/customer/terminals',
  '/customer/users', '/customer/reports', '/customer/errors', '/customer/settings',
  '/customer/intake', '/customer/ai-import', '/customer/price-review',
  '/customer/catalogue', '/customer/inventory', '/customer/tables',
  '/customer/sync-inbox',
];

const AUTH_ROUTES = [
  '/login', '/customer/login', '/manager/login',
];

describe.skipIf(SKIP_SCENARIOS)('Scenario: Web Page Health Check', () => {
  // Dashboard routes should return 200 or 307 (auth redirect), never 404/500
  for (const route of DASHBOARD_ROUTES) {
    it(`GET ${route} is reachable`, async () => {
      const res = await fetch(apiUrl(route), { redirect: 'manual' });
      expect(res.status, `${route} returned ${res.status}`).not.toBe(404);
      expect(res.status, `${route} returned ${res.status}`).toBeLessThan(500);
    });
  }

  // Customer routes (OTT/WebView portal)
  for (const route of CUSTOMER_ROUTES) {
    it(`GET ${route} is reachable`, async () => {
      const res = await fetch(apiUrl(route), { redirect: 'manual' });
      expect(res.status, `${route} returned ${res.status}`).not.toBe(404);
      expect(res.status, `${route} returned ${res.status}`).toBeLessThan(500);
    });
  }

  // Auth routes should always return 200 (login pages are public)
  for (const route of AUTH_ROUTES) {
    it(`GET ${route} returns 200`, async () => {
      const res = await fetch(apiUrl(route));
      expect(res.status).toBe(200);
    });
  }
});
