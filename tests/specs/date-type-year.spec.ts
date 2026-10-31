import { expect, test } from '@playwright/test';
import { ReportPage } from '../pages/report-page';
import { displayDate } from '../support/dates';
import { messages } from '../support/messages';
import { SAMPLE } from '../support/sample-data';

/**
 * Date, report type, and year.
 * Today and any past date are accepted. A future date is rejected.
 * The future-date message is an assumption. The story states the rule and gives no text.
 * The year does not have to match the report date. The story never ties them together.
 */
let report!: ReportPage;

test.beforeEach(async ({ page }) => {
  report = new ReportPage(page);
  await report.gotoForm();
});

test('TC-DATE-01 today can be saved', async () => {
  const today = await report.todayIso();
  await report.fillValid({ date: today });
  await report.save();
  await expect(report.by('toast')).toHaveText(messages.success);
  await expect(report.by('saved-date')).toHaveText(displayDate(today));
});

test('TC-DATE-02 a past date can be saved', async () => {
  await report.fillValid({ date: '2020-05-20', year: '2024' });
  await report.save();
  await expect(report.by('toast')).toHaveText(messages.success);
  await expect(report.by('saved-date')).toHaveText('20/05/2020');
});

test('TC-DATE-03 a future date is rejected', async () => {
  await report.fillValid({ date: '2027-01-01' });
  await report.save();
  await report.expectOnlyMessage('report-date', messages.future);
});

test('TC-DATE-04 the selected date is shown as DD/MM/YYYY', async () => {
  await report.by('report-date').fill('2024-01-15');
  await expect(report.by('date-display')).toHaveText('15/01/2024');
});

test('TC-TYPE-01 report type options are إداري and جنح', async () => {
  expect(await report.optionValues('report-type')).toEqual([...SAMPLE.types]);
});

test('TC-TYPE-02 جنح can be saved', async () => {
  await report.fillValid({ type: 'جنح' });
  await report.save();
  await expect(report.by('saved-type')).toHaveText('جنح');
});

test('TC-YEAR-01 the year list is the years registered in this demo', async () => {
  expect(await report.optionValues('year')).toEqual([...SAMPLE.years]);
});

test('TC-YEAR-02 a year that differs from the report date can be saved', async () => {
  await report.fillValid({ date: '2024-01-15', year: '2026' });
  await report.save();
  await expect(report.by('saved-date')).toHaveText('15/01/2024');
  await expect(report.by('saved-year')).toHaveText('2026');
});
