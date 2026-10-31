import { expect, test } from '@playwright/test';
import { ReportPage } from '../pages/report-page';
import { SAMPLE } from '../support/sample-data';

/**
 * AC2 — Cascading dropdown.
 * قسم الشرطة lists only the stations of the selected المحافظة.
 * Changing المحافظة clears the old station because that station is not in the new list.
 */
const rows = [
  { id: 'TC-AC2-01', governorate: 'القاهرة', outsider: 'قسم الدقي' },
  { id: 'TC-AC2-02', governorate: 'الجيزة', outsider: 'قسم المعادي' },
  { id: 'TC-AC2-03', governorate: 'الإسكندرية', outsider: 'قسم الدقي' },
] as const;

let report!: ReportPage;

test.beforeEach(async ({ page }) => {
  report = new ReportPage(page);
  await report.gotoForm();
});

for (const row of rows) {
  test(`${row.id} ${row.governorate} shows only its police stations`, async () => {
    await report.by('governorate').selectOption(row.governorate);
    const stations = await report.optionValues('police-station');
    expect(stations).toEqual([...SAMPLE.stations[row.governorate]]);
    expect(stations).not.toContain(row.outsider);
  });
}

test('TC-AC2-04 changing governorate reloads stations and clears the previous station', async () => {
  await report.by('governorate').selectOption('القاهرة');
  await report.by('police-station').selectOption('قسم المعادي');
  await report.by('governorate').selectOption('الإسكندرية');
  expect(await report.optionValues('police-station')).toEqual([...SAMPLE.stations['الإسكندرية']]);
  await expect(report.by('police-station')).toHaveValue('');
});

test('TC-AC2-05 station list is empty before a governorate is chosen', async () => {
  await expect(report.by('police-station')).toBeDisabled();
  await expect(report.by('police-station').locator('option').first()).toHaveText('اختر المحافظة أولاً');
  expect(await report.optionValues('police-station')).toEqual([]);
});
