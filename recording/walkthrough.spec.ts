import { expect, test } from '@playwright/test';
import { ReportPage } from '../tests/pages/report-page';
import { messages } from '../tests/support/messages';

/**
 * One paced walkthrough for the recording. It is not part of the counted suite.
 * The pauses keep the video readable.
 */
test('walkthrough of the police report form', async ({ page }) => {
  const report = new ReportPage(page);
  await report.gotoForm();
  await page.waitForTimeout(700);

  await report.save();
  await expect(report.error('governorate')).toBeVisible();
  await page.waitForTimeout(900);

  await report.by('governorate').selectOption('القاهرة');
  await page.waitForTimeout(700);
  await report.by('governorate').selectOption('الجيزة');
  await page.waitForTimeout(700);

  await report.by('report-number').fill('12A');
  await expect(report.error('report-number')).toHaveText(messages.digits);
  await page.waitForTimeout(800);

  await report.by('report-number').fill('15');
  await report.back();
  await expect(report.by('unsaved-message')).toHaveText(messages.unsaved);
  await page.waitForTimeout(900);
  await report.by('unsaved-no').click();

  await report.by('add-party').click();
  await page.waitForTimeout(500);
  await report.by('party-name').fill('منى حسن');
  await report.by('add-confirm').click();
  await page.waitForTimeout(600);

  await report.fillValid({ governorate: 'الجيزة', station: 'قسم الدقي', number: '15', defendant: 'منى حسن' });
  await report.save();
  await expect(report.by('toast')).toHaveText(messages.success);
  await page.waitForTimeout(1200);
  await report.back();
  await expect(report.by('request-saved-number')).toHaveText('15');
  await page.waitForTimeout(1200);
});
