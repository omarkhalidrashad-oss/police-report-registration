import { expect, test } from '@playwright/test';
import { ReportPage } from '../pages/report-page';
import { messages } from '../support/messages';
import { SAMPLE } from '../support/sample-data';

/**
 * Parties.
 * Both dropdowns start with the people already on the request.
 * The same person in مقدم من and ضد من is rejected on حفظ with the catalogue message.
 * إضافة opens one name field. Saving that name updates both lists and does not reload the page.
 * The new person is stored on the request immediately, which is what AC3 says by "بمجرد حفظ".
 */
let report!: ReportPage;

test.beforeEach(async ({ page }) => {
  report = new ReportPage(page);
  await report.gotoForm();
});

test('TC-PARTY-01 both dropdowns list the parties already on the request', async () => {
  expect(await report.optionValues('complainant')).toEqual([...SAMPLE.parties]);
  expect(await report.optionValues('defendant')).toEqual([...SAMPLE.parties]);
});

test('TC-PARTY-02 the same party in both dropdowns is rejected', async () => {
  await report.fillValid({ complainant: 'أحمد محمود', defendant: 'أحمد محمود' });
  await report.save();
  await expect(report.error('same-party')).toHaveText(messages.sameParty);
  await report.expectNotSaved();
});

test('TC-AC3-01 إضافة opens the name field', async () => {
  await report.by('add-party').click();
  await expect(report.by('add-dialog')).toBeVisible();
  await expect(report.by('party-name')).toBeVisible();
  await expect(report.by('party-name')).toBeEditable();
});

test('TC-AC3-02 saving a name adds it to both lists without a reload', async ({ page }) => {
  await page.evaluate(() => {
    (window as Window & { __stay?: number }).__stay = 1;
  });
  await report.by('add-party').click();
  await report.by('party-name').fill('منى حسن');
  await report.by('add-confirm').click();
  await expect(report.by('add-dialog')).toBeHidden();
  expect(await report.optionValues('complainant')).toContain('منى حسن');
  expect(await report.optionValues('defendant')).toContain('منى حسن');
  expect(await page.evaluate(() => (window as Window & { __stay?: number }).__stay)).toBe(1);
  await expect(report.reportView).toBeVisible();
});

test('TC-AC3-03 an empty name is rejected and the lists stay unchanged', async () => {
  await report.by('add-party').click();
  await report.by('add-confirm').click();
  await expect(report.error('party-name')).toHaveText(messages.required);
  await expect(report.by('add-dialog')).toBeVisible();
  expect(await report.optionValues('complainant')).toEqual([...SAMPLE.parties]);
});

test('TC-AC3-04 cancel closes the popup and does not add a name', async () => {
  await report.by('add-party').click();
  await report.by('party-name').fill('كمال عادل');
  await report.by('add-cancel').click();
  await expect(report.by('add-dialog')).toBeHidden();
  expect(await report.optionValues('complainant')).not.toContain('كمال عادل');
});

test('TC-AC3-05 a newly added person can be chosen and saved on the report', async () => {
  await report.by('add-party').click();
  await report.by('party-name').fill('منى حسن');
  await report.by('add-confirm').click();
  await report.fillValid({ defendant: 'منى حسن' });
  await report.save();
  await expect(report.by('saved-defendant')).toHaveText('منى حسن');
  await expect(report.by('saved-complainant')).toHaveText('أحمد محمود');
});

test('TC-AC3-06 a duplicate name is rejected', async () => {
  await report.by('add-party').click();
  await report.by('party-name').fill('أحمد محمود');
  await report.by('add-confirm').click();
  await expect(report.error('party-name')).toHaveText(messages.duplicate);
  await expect(report.by('add-dialog')).toBeVisible();
  expect(await report.optionValues('complainant')).toEqual([...SAMPLE.parties]);
});
