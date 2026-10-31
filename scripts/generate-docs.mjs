import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { CASES, PRE, PRE_AR } from './cases.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');

function numbered(steps) {
  return steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
}

function checkIds() {
  const specsDir = path.join(root, 'tests', 'specs');
  let specText = '';
  for (const name of fs.readdirSync(specsDir)) {
    if (name.endsWith('.ts')) specText += `\n${fs.readFileSync(path.join(specsDir, name), 'utf8')}`;
  }
  const ids = CASES.map((item) => item.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const missingInSpecs = ids.filter((id) => !specText.includes(id));
  const specIds = [...new Set([...specText.matchAll(/TC-[A-Z0-9]+(?:-[A-Z0-9]+)*/g)].map((match) => match[0]))];
  const missingInExcel = specIds.filter((id) => !ids.includes(id));
  if (duplicateIds.length || missingInSpecs.length || missingInExcel.length) {
    console.error(JSON.stringify({ duplicateIds, missingInSpecs, missingInExcel }, null, 2));
    process.exit(1);
  }
}

function styleHeader(row) {
  row.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2744' } };
  row.alignment = { wrapText: true, vertical: 'middle' };
  row.height = 22;
}

function addSheet(workbook, name, rtl, headers, rows) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }],
  });
  sheet.addRow(headers);
  styleHeader(sheet.getRow(1));
  rows.forEach((values, index) => {
    const row = sheet.addRow(values);
    row.alignment = { wrapText: true, vertical: 'top' };
    row.font = { name: 'Calibri', size: 11 };
    if (index % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7FB' } };
    }
  });
  const widths = [18, 42, 46, 12, 14, 16, 42, 36, 55, 55, 14, 38, 42];
  sheet.columns.forEach((column, index) => {
    column.width = widths[index] || 30;
  });
  sheet.autoFilter = { from: 'A1', to: 'M1' };
  return sheet;
}

const headersEn = ['Test Case ID', 'Title', 'Objective', 'Priority', 'Type', 'Source', 'Preconditions', 'Test Data', 'Steps', 'Expected Result', 'Automated', 'Spec File', 'Note'];
const headersAr = ['رقم الحالة', 'العنوان', 'الهدف', 'الأولوية', 'النوع', 'المصدر', 'الشروط المسبقة', 'بيانات الاختبار', 'الخطوات', 'النتيجة المتوقعة', 'مؤتمت', 'ملف السكربت', 'ملاحظة'];

function englishRow(item) {
  return [item.id, item.title, item.objective, item.priority, item.type, item.source, PRE, item.data, numbered(item.steps), item.expected, 'Yes', item.spec, item.note];
}

function arabicRow(item) {
  return [item.id, item.titleAr, item.objectiveAr, item.priority, item.type, item.source, PRE_AR, item.dataAr, numbered(item.stepsAr), item.expectedAr, 'Yes', item.spec, item.noteAr];
}

async function writeExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Police report test design';
  workbook.created = new Date('2026-10-31T00:00:00Z');
  addSheet(workbook, 'Manual Test Cases', false, headersEn, CASES.map(englishRow));
  addSheet(workbook, 'Arabic Reference', true, headersAr, CASES.map(arabicRow));

  const trace = workbook.addWorksheet('Traceability', { views: [{ state: 'frozen', ySplit: 1 }] });
  trace.addRow(['Area', 'Test Case IDs', 'Count']);
  styleHeader(trace.getRow(1));
  const groups = new Map();
  for (const item of CASES) {
    if (!groups.has(item.covers)) groups.set(item.covers, []);
    groups.get(item.covers).push(item.id);
  }
  for (const [area, ids] of groups) {
    const row = trace.addRow([area, ids.join(', '), ids.length]);
    row.alignment = { wrapText: true, vertical: 'top' };
    row.font = { name: 'Calibri', size: 11 };
  }
  trace.getColumn(1).width = 22;
  trace.getColumn(2).width = 88;
  trace.getColumn(3).width = 12;
  trace.addRow([]);
  trace.addRow(['Total', '', CASES.length]);

  await workbook.xlsx.writeFile(path.join(docsDir, 'Police-Report-Manual-Test-Cases.xlsx'));
}

function run(text, options = {}) {
  return new Paragraph({
    heading: options.heading,
    bullet: options.bullet,
    bidirectional: /[\u0600-\u06FF]/.test(text),
    spacing: { before: options.heading ? 280 : 0, after: options.bullet ? 80 : 140 },
    children: [new TextRun({ text, font: 'Calibri', size: options.heading ? undefined : 22, bold: Boolean(options.heading) })],
  });
}

function writeReview() {
  const groups = new Map();
  for (const item of CASES) {
    if (!groups.has(item.covers)) groups.set(item.covers, []);
    groups.get(item.covers).push(item.id);
  }
  const findings = [
    ['F-01', 'Resolved', 'The إضافة popup had no fields in the story. The team confirmed it is one text field: the person name. Saving that name adds it to مقدم من and ضد من. It does not add a third party row.'],
    ['F-02', 'Resolved', 'The form keeps one complainant and one defendant. إضافة inserts a new name into those two lists.'],
    ['F-03', 'Medium', 'A future date is forbidden, and the catalogue has no message for it. The demo shows: لا يمكن أن يكون تاريخ المحضر في المستقبل.'],
    ['F-04', 'Medium', 'Values outside 1 to 999999 are forbidden, and the catalogue has no message for them. The only written number message is يسمح بالأرقام فقط, which is for letters and symbols. The demo shows: يجب أن يكون رقم المحضر بين 1 و 999999.'],
    ['F-05', 'Medium', 'The same-party rule does not say whether it runs when the second list changes or when the user presses حفظ. The demo checks it on حفظ.'],
    ['F-06', 'Low', 'The confirmation dialog has the catalogue sentence and no button labels. The demo uses نعم and إلغاء. The sentence is kept exactly as written, including هل أنت تأكد.'],
    ['F-07', 'Low', 'An empty name in the popup is not specified. The demo reuses هذا الحقل مطلوب and does not add a party.'],
    ['F-08', 'Low', 'A repeated name is not specified. The party has no identifier other than the name, so the demo blocks it with: هذا الطرف مسجل مسبقاً في الطلب.'],
    ['F-09', 'Low', 'Leading zeros are not specified. 000123 has six digits and a numeric value of 123, so the demo stores 123.'],
    ['F-10', 'Medium', 'The screen after a successful save is not named. The demo stays on the form, shows the success toast, shows a summary linked to REQ-2026-001, and locks the fields. رجوع then shows the same report on the request.'],
    ['F-11', 'Medium', 'AC5 does not define an unsaved change. The demo treats edited report fields as unsaved. The party popup has its own save, because AC3 says the party is added once that save succeeds. Adding a party alone does not open the back warning.'],
    ['F-12', 'Low', 'The year list is described only as the years registered in the system. This demo registers 2023, 2024, 2025, and 2026.'],
    ['F-13', 'Low', 'Governorates, police stations, and the two starting people are fictional training data. They are not a national directory.'],
    ['F-14', 'Medium', 'The story does not say whether the report number is unique. The demo does not check duplicates against other requests. It stores one report on this request.'],
    ['F-15', 'Medium', 'There is no message for a failed save, a failed station lookup, or a governorate with no stations.'],
    ['F-16', 'Low', 'Arabic-Indic digits are not mentioned. The demo treats them as non-digits and shows يسمح بالأرقام فقط.'],
    ['F-17', 'Low', 'No earliest date is given. Any past date is accepted. Today is accepted because it is not in the future. The clock is the browser local date.'],
    ['F-18', 'Low', 'The date control is a date picker, and the chosen value is also printed as DD/MM/YYYY. The native picker cannot represent an impossible day such as 31/02.'],
    ['F-19', 'Info', 'السنة and تاريخ المحضر are not required to match. A report with 15/01/2024 and year 2026 can be saved. TC-YEAR-02 locks that reading.'],
    ['F-20', 'Info', 'Changing المحافظة clears قسم الشرطة. AC2 reloads the list for the new governorate only, and the old station is not in that list.'],
    ['F-21', 'Info', 'This is a training page. It is not a real police system and it has no backend.'],
  ];

  const children = [
    run('User story review — تسجيل بيانات المحضر', { heading: HeadingLevel.TITLE }),
    run('Police report registration. Review before manual cases and automation.'),
    run('ملخص', { heading: HeadingLevel.HEADING_1 }),
    run('هذه الوثيقة مراجعة لقصة المستخدم قبل كتابة حالات الاختبار. الحالات في ملف الإكسل بالإنجليزية، وفيها ورقة عربية للرجوع. أي سلوك غير مكتوب في القصة مذكور هنا ومُعلَّم في الإكسل بكلمة Assumption.'),
    run('1. What was reviewed', { heading: HeadingLevel.HEADING_1 }),
    run('User story: تسجيل بيانات المحضر (Police Report Registration).'),
    run('The user registers the report and links the parties to the current request. The story gives the fields, five acceptance criteria, and five messages.'),
    run('2. What is testable as written', { heading: HeadingLevel.HEADING_1 }),
    run('Mandatory fields and the message هذا الحقل مطلوب on حفظ.', { bullet: { level: 0 } }),
    run('قسم الشرطة shows only the stations of the selected المحافظة, and the list reloads when the governorate changes.', { bullet: { level: 0 } }),
    run('رقم المحضر accepts digits only, at most six digits, from 1 to 999999. Letters and symbols show يسمح بالأرقام فقط.', { bullet: { level: 0 } }),
    run('تاريخ المحضر uses DD/MM/YYYY and cannot be in the future.', { bullet: { level: 0 } }),
    run('نوع المحضر is إداري or جنح.', { bullet: { level: 0 } }),
    run('مقدم من and ضد من list the parties already on the request. The same person in both is rejected.', { bullet: { level: 0 } }),
    run('إضافة opens a form for a new party. After that party is saved, the lists update without a page reload.', { bullet: { level: 0 } }),
    run('حفظ shows تم حفظ بيانات المحضر بنجاح and stores the report on the current request.', { bullet: { level: 0 } }),
    run('رجوع with unsaved changes shows هل أنت تأكد من التراجع؟ سيتم فقد البيانات غير المحفوظة. Confirming discards the registration and returns to the previous screen.', { bullet: { level: 0 } }),
    run('3. Findings', { heading: HeadingLevel.HEADING_1 }),
    run('Resolved items were closed with the team before the cases were written. The other items are open questions. The demo still had to choose a behaviour so the scripts could run. Those choices are in the Assumptions section and in the Excel Note column.'),
    ...findings.flatMap(([id, severity, text]) => [
      run(`${id} — ${severity}`, { heading: HeadingLevel.HEADING_2 }),
      run(text),
    ]),
    run('4. Assumptions used so the demo can run', { heading: HeadingLevel.HEADING_1 }),
    run('Future date message: لا يمكن أن يكون تاريخ المحضر في المستقبل.', { bullet: { level: 0 } }),
    run('Out-of-range report number message: يجب أن يكون رقم المحضر بين 1 و 999999.', { bullet: { level: 0 } }),
    run('Duplicate party message: هذا الطرف مسجل مسبقاً في الطلب.', { bullet: { level: 0 } }),
    run('Empty party name reuses: هذا الحقل مطلوب.', { bullet: { level: 0 } }),
    run('Confirmation buttons: نعم and إلغاء.', { bullet: { level: 0 } }),
    run('Leading zeros are stored as the numeric value.', { bullet: { level: 0 } }),
    run('Training years: 2023, 2024, 2025, 2026.', { bullet: { level: 0 } }),
    run('Training governorates: القاهرة, الجيزة, الإسكندرية, each with three fictional stations.', { bullet: { level: 0 } }),
    run('Starting parties: أحمد محمود and سارة علي.', { bullet: { level: 0 } }),
    run('5. Traceability', { heading: HeadingLevel.HEADING_1 }),
    run(`The Excel file has ${CASES.length} manual cases. Every case is automated. The spec file column points at the Playwright script.`),
    ...[...groups.entries()].map(([area, ids]) => run(`${area}: ${ids.join(', ')}`, { bullet: { level: 0 } })),
    run('6. How to read the result', { heading: HeadingLevel.HEADING_1 }),
    run('Source = Specified means the behaviour is in the user story or the message catalogue.'),
    run('Source = Assumption means the story forced a choice that is written in this review. The script comments in demo/app.js mark the same messages with the word ASSUMPTION.'),
    run('The automation project runs against the local training page. A public address can be used later through the BASE_URL setting described in the README.'),
  ];

  const document = new Document({
    creator: 'Police report test design',
    title: 'User story review - Police report registration',
    description: 'Requirement review for تسجيل بيانات المحضر',
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(document).then((buffer) => {
    fs.writeFileSync(path.join(docsDir, 'Police-Report-User-Story-Review.docx'), buffer);
  });
}

checkIds();
fs.mkdirSync(docsDir, { recursive: true });
await writeExcel();
await writeReview();
console.log(`Wrote ${CASES.length} cases to docs/`);
