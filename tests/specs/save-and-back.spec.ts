import { expect, test } from '@playwright/test';
import { ReportPage } from '../pages/report-page';
import { messages } from '../support/messages';

/**
 * AC4 — حفظ stores the report on the current request and shows the success toast.
 * AC5 — رجوع with no edits leaves quietly.
 * رجوع after a report-field edit shows the catalogue confirmation.
 * A person saved from إضافة is already on the request, so that action alone does not count as an unsaved report edit.
 */
let report!: ReportPage;

test.beforeEach(async ({ page }) => {
  report = new ReportPage(page);
  await report.gotoForm();
});

test('TC-AC4-01 a successful save shows the success toast and stays on the form', async () => {
  const today = await report.todayIso();
  await report.fillValid({ date: today });
  await report.save();
  await expect(report.by('toast')).toHaveText(messages.success);
  await expect(report.by('saved-summary')).toBeVisible();
  await expect(report.by('saved-request-id')).toHaveText('REQ-2026-001');
  await expect(report.reportView).toBeVisible();
});

test('TC-AC4-02 the saved report stays on the request after leaving and after refresh', async ({ page }) => {
  await report.fillValid({
    number: '123456',
    date: '2024-06-01',
    year: '2026',
    type: 'إداري',
  });
  await report.save();
  await report.back();
  await expect(report.requestView).toBeVisible();
  await expect(report.by('request-saved-card')).toBeVisible();
  await expect(report.by('request-saved-request-id')).toHaveText('REQ-2026-001');
  await expect(report.by('request-saved-governorate')).toHaveText('القاهرة');
  await expect(report.by('request-saved-station')).toHaveText('قسم قصر النيل');
  await expect(report.by('request-saved-number')).toHaveText('123456');
  await expect(report.by('request-saved-date')).toHaveText('01/06/2024');
  await expect(report.by('request-saved-type')).toHaveText('إداري');
  await expect(report.by('request-saved-year')).toHaveText('2026');
  await expect(report.by('request-saved-complainant')).toHaveText('أحمد محمود');
  await expect(report.by('request-saved-defendant')).toHaveText('سارة علي');
  await page.reload();
  await expect(report.by('request-saved-number')).toHaveText('123456');
  await expect(report.by('request-saved-defendant')).toHaveText('سارة علي');
});

test('TC-AC5-01 back with no edits leaves without a warning', async () => {
  await report.back();
  await expect(report.by('unsaved-dialog')).toBeHidden();
  await expect(report.requestView).toBeVisible();
});

test('TC-AC5-02 back after an edit shows the confirmation message', async () => {
  await report.by('report-number').fill('15');
  await report.back();
  await expect(report.by('unsaved-dialog')).toBeVisible();
  await expect(report.by('unsaved-message')).toHaveText(messages.unsaved);
});

test('TC-AC5-03 confirming the warning discards the edit and returns', async () => {
  await report.by('report-number').fill('15');
  await report.back();
  await report.by('unsaved-yes').click();
  await expect(report.requestView).toBeVisible();
  await expect(report.by('request-saved-card')).toBeHidden();
  await report.by('open-report').click();
  await expect(report.by('report-number')).toHaveValue('');
});

test('TC-AC5-04 cancelling the warning stays on the form and keeps the edit', async () => {
  await report.by('report-number').fill('15');
  await report.back();
  await report.by('unsaved-no').click();
  await expect(report.by('unsaved-dialog')).toBeHidden();
  await expect(report.reportView).toBeVisible();
  await expect(report.by('report-number')).toHaveValue('15');
});

test('TC-AC5-05 adding a party alone does not warn, and the name stays on the request', async () => {
  await report.by('add-party').click();
  await report.by('party-name').fill('منى حسن');
  await report.by('add-confirm').click();
  await report.back();
  await expect(report.by('unsaved-dialog')).toBeHidden();
  await expect(report.requestView).toBeVisible();
  await expect(report.by('request-parties')).toContainText('منى حسن');
});

test('TC-AC5-06 confirming back drops the report edit and keeps the added party', async () => {
  await report.by('add-party').click();
  await report.by('party-name').fill('منى حسن');
  await report.by('add-confirm').click();
  await report.by('report-number').fill('15');
  await report.back();
  await report.by('unsaved-yes').click();
  await expect(report.by('request-parties')).toContainText('منى حسن');
  await report.by('open-report').click();
  await expect(report.by('report-number')).toHaveValue('');
  expect(await report.optionValues('complainant')).toContain('منى حسن');
});
