/**
 * POS Smoke Test — verifies the IndexedDB schema matches the queries used by the POS page.
 *
 * Root cause of the crash: db.modifier.where("isactive") failed because
 * "isactive" wasn't declared as an index in the Dexie schema.
 * This test catches that class of bug by checking every .where() query
 * the POS page uses against the declared indexes.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('POS IndexedDB Schema Integrity', () => {
  // Parse the Dexie schema from db.ts to get declared indexes per table
  const dbFile = fs.readFileSync(
    path.resolve(__dirname, '../../lib/offline/db.ts'),
    'utf-8'
  );

  // Extract store declarations: table: "pk, index1, index2, ..."
  const storeMatches = [...dbFile.matchAll(/(\w+):\s*"([^"]+)"/g)];
  const schema: Record<string, Set<string>> = {};
  for (const [, table, indexes] of storeMatches) {
    schema[table] = new Set(
      indexes.split(',').map(s => s.trim().replace(/^\+\+/, '').replace(/^\&/, ''))
    );
  }

  // Parse the POS page to find all db.TABLE.where("FIELD") calls
  const posFiles = [
    '../../app/pos/page.tsx',
    '../../lib/offline/sync-engine.ts',
    '../../lib/offline/seed.ts',
    '../../lib/offline/integrity.ts',
  ];

  const whereQueries: { file: string; table: string; field: string; line: number }[] = [];

  for (const relPath of posFiles) {
    const fullPath = path.resolve(__dirname, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      // Match patterns like: db.product.where("isactive") or db.modifier.where("isactive")
      const matches = [...lines[i].matchAll(/db\.(\w+)\.where\(["'](\w+)["']\)/g)];
      for (const [, table, field] of matches) {
        whereQueries.push({ file: relPath, table, field, line: i + 1 });
      }
    }
  }

  it('found Dexie schema declarations', () => {
    expect(Object.keys(schema).length).toBeGreaterThan(5);
  });

  it('found .where() queries in POS code', () => {
    expect(whereQueries.length).toBeGreaterThan(0);
  });

  // For each .where("field") query, verify the field is indexed in the schema
  for (const q of whereQueries) {
    it(`db.${q.table}.where("${q.field}") has index — ${q.file}:${q.line}`, () => {
      const tableSchema = schema[q.table];
      expect(tableSchema).toBeDefined();

      if (!tableSchema?.has(q.field)) {
        // This is the exact bug that crashed the POS:
        // A .where() on a non-indexed field throws "KeyPath X on object store Y is not indexed"
        // Either add the index to db.ts, or change the query to .toArray().then(filter)
        throw new Error(
          `MISSING INDEX: db.${q.table}.where("${q.field}") at ${q.file}:${q.line} — ` +
          `"${q.field}" is not in the Dexie schema for "${q.table}". ` +
          `Declared indexes: ${[...(tableSchema || [])].join(', ')}. ` +
          `Fix: either add "${q.field}" to the schema, or use .toArray().then(filter) instead.`
        );
      }
    });
  }
});
