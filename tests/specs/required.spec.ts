import { test } from '@playwright/test';
import { ReportPage, type Skippable } from '../pages/report-page';

/**
 * AC1 — Mandatory fields.
 * حفظ with an empty mandatory field shows هذا الحقل مطلوب under that field.
 * TC-AC1-02 also flags قسم الشرطة, because a station cannot be chosen before المحافظة.
 */
const single: Array<{ id: string; title: string; skip: Skippable[]; errors: string[] }> = [
  { id: 'TC-AC1-03', title: 'police station left empty', skip: ['station'], errors: ['police-station'] },
  { id: 'TC-AC1-04', title: 'report number left empty', skip: ['number'], errors: ['report-number'] },
  { id: 'TC-AC1-05', title: 'report date left empty', skip: ['date'], errors: ['report-date'] },
  { id: 'TC-AC1-06', title: 'report type left empty', skip: ['type'], errors: ['report-type'] },
  { id: 'TC-AC1-07', title: 'year left empty', skip: ['year'], errors: ['year'] },
  { id: 'TC-AC1-08', title: 'complainant left empty', skip: ['complainant'], errors: ['complainant'] },
  { id: 'TC-AC1-09', title: 'defendant left empty', skip: ['defendant'], errors: ['defendant'] },
];

let report!: ReportPage;

test.beforeEach(async ({ page }) => {
  report = new ReportPage(page);
  await report.gotoForm();
});

test('TC-AC1-01 all mandatory fields empty on save', async () => {
  await report.save();
  await report.expectRequiredOnly([
    'governorate',
    'police-station',
    'report-number',
    'report-date',
    'report-type',
    'year',
    'complainant',
    'defendant',
  ]);
});

test('TC-AC1-02 governorate left empty', async () => {
  await report.fillValid({ skip: ['governorate'] });
  await report.save();
  await report.expectRequiredOnly(['governorate', 'police-station']);
});

for (const row of single) {
  test(`${row.id} ${row.title}`, async () => {
    await report.fillValid({ skip: row.skip });
    await report.save();
    await report.expectRequiredOnly(row.errors);
  });
}
