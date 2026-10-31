import { expect, type Page } from '@playwright/test';
import { messages } from '../support/messages';

const FIELD_ERRORS = [
  'governorate',
  'police-station',
  'report-number',
  'report-date',
  'report-type',
  'year',
  'complainant',
  'defendant',
];

export type Skippable = 'governorate' | 'station' | 'number' | 'date' | 'type' | 'year' | 'complainant' | 'defendant';

export type ReportInput = {
  governorate?: string;
  station?: string;
  number?: string;
  date?: string;
  type?: string;
  year?: string;
  complainant?: string;
  defendant?: string;
  skip?: Skippable[];
};

/**
 * Drives the request screen and the registration form.
 * Each Playwright test has its own browser context, so one test cannot see another's saved report.
 */
export class ReportPage {
  constructor(readonly page: Page) {}

  by(testId: string) {
    return this.page.getByTestId(testId);
  }

  error(key: string) {
    return this.page.getByTestId(`error-${key}`);
  }

  get reportView() {
    return this.by('view-report');
  }

  get requestView() {
    return this.by('view-request');
  }

  /** Opens the demo on the request, then opens the registration form. */
  async gotoForm(): Promise<void> {
    // './' keeps a GitHub Pages project path. '/' would jump to the user site.
    await this.page.goto('./');
    await this.by('open-report').click();
    await expect(this.reportView).toBeVisible();
  }

  /** Today's date inside the browser, so the test and the form share one clock. */
  async todayIso(): Promise<string> {
    return this.page.evaluate(() => {
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    });
  }

  /** Values of the real options, without the empty "اختر" placeholder. */
  async optionValues(testId: string): Promise<string[]> {
    return this.by(testId).locator('option').evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLOptionElement).value).filter((value) => value !== ''),
    );
  }

  /**
   * Fills a valid report.
   * Pass skip when a case needs one mandatory field left empty.
   * The police station is chosen only after the governorate, because the list is cascading.
   */
  async fillValid(input: ReportInput = {}): Promise<void> {
    const skip = new Set(input.skip ?? []);
    const date = input.date ?? (await this.todayIso());
    if (!skip.has('governorate')) {
      await this.by('governorate').selectOption(input.governorate ?? 'القاهرة');
    }
    if (!skip.has('governorate') && !skip.has('station')) {
      await this.by('police-station').selectOption(input.station ?? 'قسم قصر النيل');
    }
    if (!skip.has('number')) await this.by('report-number').fill(input.number ?? '123456');
    if (!skip.has('date')) await this.by('report-date').fill(date);
    if (!skip.has('type')) await this.by('report-type').selectOption(input.type ?? 'إداري');
    if (!skip.has('year')) await this.by('year').selectOption(input.year ?? '2026');
    if (!skip.has('complainant')) await this.by('complainant').selectOption(input.complainant ?? 'أحمد محمود');
    if (!skip.has('defendant')) await this.by('defendant').selectOption(input.defendant ?? 'سارة علي');
  }

  async save(): Promise<void> {
    await this.by('save').click();
  }

  async back(): Promise<void> {
    await this.by('back').click();
  }

  async expectNotSaved(): Promise<void> {
    await expect(this.by('toast')).toBeHidden();
    await expect(this.by('saved-summary')).toBeHidden();
  }

  /** AC1: only the named fields show هذا الحقل مطلوب, and nothing is saved. */
  async expectRequiredOnly(keys: string[]): Promise<void> {
    for (const field of FIELD_ERRORS) {
      if (keys.includes(field)) await expect(this.error(field)).toHaveText(messages.required);
      else await expect(this.error(field)).toBeHidden();
    }
    await expect(this.error('same-party')).toBeHidden();
    await this.expectNotSaved();
  }

  /** One field shows the given message. Every other field error stays hidden. */
  async expectOnlyMessage(key: string, message: string): Promise<void> {
    for (const field of FIELD_ERRORS) {
      if (field === key) await expect(this.error(field)).toHaveText(message);
      else await expect(this.error(field)).toBeHidden();
    }
    await expect(this.error('same-party')).toBeHidden();
    await this.expectNotSaved();
  }
}
