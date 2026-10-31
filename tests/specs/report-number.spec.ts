import { expect, test } from '@playwright/test';
import { ReportPage } from '../pages/report-page';
import { messages } from '../support/messages';

/**
 * Report number rules from the story: digits only, 1 to 999999, at most 6 digits.
 * The digits-only message is in the catalogue.
 * The range message is an assumption. See the review.
 * Leading zeros are stored as the numeric value: 000123 becomes 123.
 */
let report!: ReportPage;

test.beforeEach(async ({ page }) => {
  report = new ReportPage(page);
  await report.gotoForm();
});

test('TC-NUM-01 letters show the digits-only message', async () => {
  await report.fillValid();
  await report.by('report-number').fill('AB');
  // The catalogue trigger is entering letters, so the message appears before حفظ.
  await expect(report.error('report-number')).toHaveText(messages.digits);
  await report.save();
  await report.expectOnlyMessage('report-number', messages.digits);
});

test('TC-NUM-02 symbols show the digits-only message', async () => {
  await report.fillValid();
  await report.by('report-number').fill('12-3');
  await expect(report.error('report-number')).toHaveText(messages.digits);
  await report.save();
  await report.expectOnlyMessage('report-number', messages.digits);
});

test('TC-NUM-03 mixed letters and digits show the digits-only message', async () => {
  await report.fillValid();
  await report.by('report-number').fill('99B');
  await report.save();
  await report.expectOnlyMessage('report-number', messages.digits);
});

test('TC-NUM-04 minimum value 1 can be saved', async () => {
  await report.fillValid({ number: '1' });
  await report.save();
  await expect(report.by('toast')).toHaveText(messages.success);
  await expect(report.by('saved-number')).toHaveText('1');
});

test('TC-NUM-05 maximum value 999999 can be saved', async () => {
  await report.fillValid({ number: '999999' });
  await report.save();
  await expect(report.by('toast')).toHaveText(messages.success);
  await expect(report.by('saved-number')).toHaveText('999999');
});

test('TC-NUM-06 value 0 is rejected', async () => {
  await report.fillValid({ number: '0' });
  await report.save();
  await report.expectOnlyMessage('report-number', messages.range);
});

test('TC-NUM-07 a value above 999999 is rejected', async () => {
  await report.fillValid();
  // maxlength blocks a 7th keystroke. TC-NUM-08 covers that.
  // Setting the value here proves the 1..999999 rule still rejects 1000000.
  await report.by('report-number').evaluate((element, value) => {
    const input = element as HTMLInputElement;
    input.removeAttribute('maxlength');
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, '1000000');
  await report.save();
  await report.expectOnlyMessage('report-number', messages.range);
});

test('TC-NUM-08 input stops at 6 digits', async () => {
  await report.by('report-number').click();
  await report.by('report-number').pressSequentially('1234567');
  await expect(report.by('report-number')).toHaveValue('123456');
});

test('TC-NUM-09 leading zeros within 6 digits save as the numeric value', async () => {
  await report.fillValid({ number: '000123' });
  await report.save();
  await expect(report.by('toast')).toHaveText(messages.success);
  await expect(report.by('saved-number')).toHaveText('123');
});
