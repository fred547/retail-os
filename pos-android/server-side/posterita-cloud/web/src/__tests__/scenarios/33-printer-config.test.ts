import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SKIP_SCENARIOS, getSupabase, testId } from './helpers';

const ACCOUNT_ID = testId('printer');
const STORE_ID = 99000 + Math.floor(Math.random() * 9000);
let receiptPrinterId: number;
let kitchenPrinterId: number;
let stationId: number;

describe.skipIf(SKIP_SCENARIOS)('Scenario: Printer Configuration', () => {
  beforeAll(async () => {
    const db = getSupabase();
    await db.from('account').insert({ account_id: ACCOUNT_ID, businessname: 'Printer Test', type: 'testing', status: 'active', currency: 'MUR' });
    await db.from('store').insert({ store_id: STORE_ID, account_id: ACCOUNT_ID, name: 'Print Store', isactive: 'Y' });

    // Create a preparation station for linking
    const { data: station } = await db.from('preparation_station').insert({
      account_id: ACCOUNT_ID, store_id: STORE_ID, name: 'Kitchen',
      station_type: 'kitchen', is_active: true,
    }).select().single();
    stationId = station!.station_id;
  }, 60000);

  afterAll(async () => {
    const db = getSupabase();
    await db.from('printer').delete().eq('account_id', ACCOUNT_ID);
    await db.from('preparation_station').delete().eq('account_id', ACCOUNT_ID);
    await db.from('store').delete().eq('account_id', ACCOUNT_ID);
    await db.from('account').delete().eq('account_id', ACCOUNT_ID);
  }, 60000);

  it('creates a receipt printer', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('printer').insert({
      account_id: ACCOUNT_ID,
      store_id: STORE_ID,
      name: 'Front Desk Printer',
      printer_type: 'thermal',
      ip: '192.168.1.100',
      width: 80,
      print_receipt: true,
      print_kitchen: false,
      cash_drawer: 'Y',
    }).select().single();
    expect(error).toBeNull();
    expect(data.name).toBe('Front Desk Printer');
    expect(data.print_receipt).toBe(true);
    expect(data.cash_drawer).toBe('Y');
    receiptPrinterId = data.printer_id;
  });

  it('creates a kitchen printer linked to station', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('printer').insert({
      account_id: ACCOUNT_ID,
      store_id: STORE_ID,
      name: 'Kitchen Printer',
      printer_type: 'thermal',
      ip: '192.168.1.101',
      width: 80,
      print_receipt: false,
      print_kitchen: true,
      station_id: stationId,
    }).select().single();
    expect(error).toBeNull();
    expect(data.print_kitchen).toBe(true);
    expect(data.station_id).toBe(stationId);
    kitchenPrinterId = data.printer_id;
  });

  it('queries printers by store', async () => {
    const db = getSupabase();
    const { data } = await db.from('printer')
      .select('name, printer_type, print_receipt, print_kitchen')
      .eq('account_id', ACCOUNT_ID)
      .eq('store_id', STORE_ID);
    expect(data!.length).toBe(2);
    const receipt = data!.find(p => p.print_receipt);
    const kitchen = data!.find(p => p.print_kitchen);
    expect(receipt!.name).toBe('Front Desk Printer');
    expect(kitchen!.name).toBe('Kitchen Printer');
  });

  it('printer linked to station is queryable via station_id', async () => {
    const db = getSupabase();
    const { data } = await db.from('printer')
      .select('name, station_id')
      .eq('station_id', stationId);
    expect(data!.length).toBe(1);
    expect(data![0].name).toBe('Kitchen Printer');
  });

  it('updates printer IP and width', async () => {
    const db = getSupabase();
    const { error } = await db.from('printer')
      .update({ ip: '192.168.1.200', width: 58 })
      .eq('printer_id', receiptPrinterId);
    expect(error).toBeNull();

    const { data } = await db.from('printer')
      .select('ip, width')
      .eq('printer_id', receiptPrinterId)
      .single();
    expect(data!.ip).toBe('192.168.1.200');
    expect(data!.width).toBe(58);
  });

  it('bluetooth printer without IP', async () => {
    const db = getSupabase();
    const { data, error } = await db.from('printer').insert({
      account_id: ACCOUNT_ID,
      store_id: STORE_ID,
      name: 'Mobile BT Printer',
      printer_type: 'bluetooth',
      device_name: 'BT-SPP-001',
      width: 58,
      print_receipt: true,
      print_kitchen: false,
    }).select().single();
    expect(error).toBeNull();
    expect(data.printer_type).toBe('bluetooth');
    expect(data.device_name).toBe('BT-SPP-001');
    expect(data.ip).toBeNull();
  });

  it('printers scoped to account', async () => {
    const db = getSupabase();
    const { data } = await db.from('printer')
      .select('*')
      .eq('account_id', 'nonexistent_account');
    expect(data?.length).toBe(0);
  });
});
