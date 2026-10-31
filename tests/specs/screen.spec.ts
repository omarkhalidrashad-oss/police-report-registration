import { expect, test } from '@playwright/test';
import { ReportPage } from '../pages/report-page';

/**
 * The screen contains the fields and actions named in the user story.
 * The eight story fields are marked with *. The name popup is not one of those eight.
 */
let report!: ReportPage;

test.beforeEach(async ({ page }) => {
  report = new ReportPage(page);
  await report.gotoForm();
});

test('TC-UI-01 the specified fields and actions are on the screen', async () => {
  const labels: Array<[string, string]> = [
    ['governorate', 'المحافظة'],
    ['police-station', 'قسم الشرطة'],
    ['report-number', 'رقم المحضر'],
    ['report-date', 'تاريخ المحضر'],
    ['report-type', 'نوع المحضر'],
    ['year', 'السنة'],
    ['complainant', 'مقدم من'],
    ['defendant', 'ضد من'],
  ];
  for (const [id, label] of labels) {
    await expect(report.page.locator(`label[for="${id}"]`)).toContainText(label);
    await expect(report.by(id)).toBeVisible();
  }
  await expect(report.by('add-party')).toHaveText('إضافة');
  await expect(report.by('save')).toHaveText('حفظ');
  await expect(report.by('back')).toHaveText('رجوع');
  await expect(report.reportView.locator('label span.req')).toHaveCount(8);
  await expect(report.reportView.locator('h2', { hasText: /^بيانات المحضر$/ })).toBeVisible();
  await expect(report.reportView.locator('h2', { hasText: /^أطراف المحضر$/ })).toBeVisible();
});
