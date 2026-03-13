import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';

// Syrian male first names
const maleFirstNames = [
  'محمد', 'أحمد', 'علي', 'عمر', 'خالد', 'يوسف', 'إبراهيم', 'حسن', 'حسين', 'سامر',
  'باسل', 'وائل', 'طارق', 'نادر', 'رامي', 'زياد', 'فادي', 'جمال', 'كمال', 'سعيد'
];

// Syrian female first names
const femaleFirstNames = [
  'فاطمة', 'مريم', 'نور', 'سارة', 'هناء', 'رنا', 'دينا', 'منى', 'لما', 'سوسن',
  'ريم', 'هبة', 'سمر', 'نادية', 'أميرة'
];

// Syrian last names
const lastNames = [
  'الأحمد', 'المحمد', 'العلي', 'الحسن', 'السيد', 'الزين', 'القاسم', 'الدرويش',
  'العمر', 'الصالح', 'الخطيب', 'الجراح', 'النجار', 'الحداد', 'المصري',
  'الدمشقي', 'الشامي', 'القريشي', 'الأيوبي', 'البرازي'
];

// Syrian father names
const fatherNames = [
  'محمد', 'أحمد', 'علي', 'عمر', 'خالد', 'يوسف', 'إبراهيم', 'حسن', 'مصطفى', 'عبدالله',
  'كريم', 'عادل', 'ناصر', 'زاهر', 'فارس', 'توفيق', 'منير', 'جميل', 'سليم', 'شريف'
];

// Syrian mother names
const motherNames = [
  'فاطمة', 'مريم', 'سارة', 'نور', 'هناء', 'رنا', 'منى', 'سوسن', 'هبة', 'دينا',
  'نادية', 'سمر', 'ريم', 'لمى', 'أميرة', 'وفاء', 'رحاب', 'غادة', 'إيمان', 'أسمى'
];

// Damascus areas for addresses
const damascusAreas = [
  'المزة', 'المالكي', 'أبو رمانة', 'الميدان', 'جرمانا', 'دوما', 'الزبلطاني',
  'برزة', 'ركن الدين', 'القابون', 'الشيخ سعد', 'الصالحية', 'الروضة',
  'العمارة', 'باب توما', 'الشاغور', 'المرجة', 'ساروجة', 'القيمرية', 'باب سريجة'
];

// Registry places around Damascus
const registryPlaces = [
  'دمشق - السجل 12450', 'دمشق - السجل 8732', 'دمشق - السجل 15200',
  'ريف دمشق - السجل 6341', 'دمشق - السجل 22100', 'دمشق - السجل 9875',
  'ريف دمشق - السجل 4521', 'دمشق - السجل 17630', 'دمشق - السجل 3210',
  'ريف دمشق - السجل 11050'
];

const certificateTypes = ['إعدادية', 'ثانوية', 'ثانوية صناعية', 'مهني', 'جامعة'];

const specializations = [
  'هندسة مدنية', 'هندسة كهربائية', 'هندسة ميكانيكية', 'تقنية معلومات',
  'إدارة أعمال', 'محاسبة', 'قانون', 'كيمياء', 'فيزياء', 'رياضيات',
  'بناء وتشييد', 'تبريد وتكييف', 'أتمتة صناعية', 'شبكات حاسوب', 'إلكترونيات'
];

const jobTitles = [
  'مهندس', 'مهندس أول', 'فني', 'فني أول', 'محاسب', 'مدير قسم',
  'مشرف', 'مستخدم', 'رئيس مجموعة', 'مراقب', 'مساعد مهندس', 'تقني'
];

const categories = ['أولى', 'ثانية', 'ثالثة', 'رابعة'];
const employmentStatuses = ['مثبت', 'عقد'];
const currentStatuses = ['على رأس عمله', 'على رأس عمله', 'على رأس عمله', 'إجازة بلا اجر', 'نقل'];
const assignedWorks = [
  'رئيس القسم الهندسي',
  'صيانة و اشراف و متابعة لجان',
  'مستخدم',
  'ورشة القسم الهندسي'
];

const notes = [
  'موظف متميز', 'حاصل على دورات تدريبية إضافية', 'منتسب لنقابة المهندسين',
  'لا يوجد', 'حاصل على شهادة تقدير', 'يعمل ساعات إضافية بانتظام', '',
  'تحت فترة التجربة', 'أكمل دورة في السلامة المهنية', ''
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function generateNationalId(index) {
  // Syrian national ID: 11 digits, starts with 0
  const base = String(10000000000 + index * 17 + randomInt(100, 999)).padStart(11, '0');
  return base.substring(0, 11);
}

function generateShamCash(index) {
  // 16 digits
  const base = String(4000000000000000 + index * 13 + randomInt(1000, 9999));
  return base.padStart(16, '0').substring(0, 16);
}

function generatePhone(index) {
  const prefixes = ['0932', '0933', '0934', '0935', '0936', '0944', '0945', '0946'];
  return pick(prefixes) + String(randomInt(1000000, 9999999));
}

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  // Return as YYYY-MM-DD string
  return d.toISOString().split('T')[0];
}

const rows = [];

for (let i = 0; i < 50; i++) {
  const isFemale = i >= 40; // 40 males, 10 females
  const gender = isFemale ? 'أنثى' : 'ذكر';
  const firstName = isFemale ? pick(femaleFirstNames) : pick(maleFirstNames);
  const lastName = pick(lastNames);
  const fullName = `${firstName} ${pick(fatherNames)} ${lastName}`;

  const dobYear = randomInt(1968, 1995);
  const appointYear = randomInt(dobYear + 22, 2015);
  const firstStateYear = appointYear;
  const firstDirYear = firstStateYear + randomInt(0, 2);
  const firstDeptYear = firstDirYear + randomInt(0, 2);

  rows.push({
    'الاسم والكنية': fullName,
    'اسم الأب': pick(fatherNames),
    'اسم الأم': (isFemale ? pick(femaleFirstNames) : pick(motherNames)),
    'مكان الولادة': 'دمشق',
    'تاريخ الولادة': randomDate(dobYear, dobYear),
    'محل ورقم القيد': pick(registryPlaces),
    'الرقم الوطني': generateNationalId(i + 1),
    'رقم شام كاش': generateShamCash(i + 1),
    'الجنس': gender,
    'الشهادة': '',
    'نوع الشهادة': pick(certificateTypes),
    'الاختصاص': pick(specializations),
    'الصفة الوظيفية': pick(jobTitles),
    'الفئة': pick(categories),
    'الوضع الوظيفي': pick(employmentStatuses),
    'رقم قرار التعيين': `Q-${randomInt(1000, 9999)}/ت/${appointYear}`,
    'تاريخ قرار التعيين': randomDate(appointYear, appointYear),
    'أول مباشرة بالدولة': randomDate(firstStateYear, firstStateYear),
    'أول مباشرة بالمديرية': randomDate(firstDirYear, firstDirYear),
    'أول مباشرة بالقسم': randomDate(firstDeptYear, firstDeptYear),
    'وضع العامل الحالي': pick(currentStatuses),
    'العمل المكلف به': pick(assignedWorks),
    'رقم الجوال': generatePhone(i),
    'العنوان': `دمشق - ${pick(damascusAreas)} - شارع ${randomInt(1, 50)} - مبنى ${randomInt(1, 200)}`,
    'ملاحظات': pick(notes),
  });
}

const ws = XLSX.utils.json_to_sheet(rows);

// Set column widths
ws['!cols'] = [
  { wch: 25 }, // الاسم والكنية
  { wch: 15 }, // اسم الأب
  { wch: 15 }, // اسم الأم
  { wch: 12 }, // مكان الولادة
  { wch: 14 }, // تاريخ الولادة
  { wch: 28 }, // محل ورقم القيد
  { wch: 14 }, // الرقم الوطني
  { wch: 18 }, // رقم شام كاش
  { wch: 8  }, // الجنس
  { wch: 12 }, // الشهادة
  { wch: 18 }, // نوع الشهادة
  { wch: 20 }, // الاختصاص
  { wch: 18 }, // الصفة الوظيفية
  { wch: 10 }, // الفئة
  { wch: 14 }, // الوضع الوظيفي
  { wch: 22 }, // رقم قرار التعيين
  { wch: 20 }, // تاريخ قرار التعيين
  { wch: 20 }, // أول مباشرة بالدولة
  { wch: 22 }, // أول مباشرة بالمديرية
  { wch: 20 }, // أول مباشرة بالقسم
  { wch: 20 }, // وضع العامل الحالي
  { wch: 32 }, // العمل المكلف به
  { wch: 14 }, // رقم الجوال
  { wch: 40 }, // العنوان
  { wch: 30 }, // ملاحظات
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'الموظفون');

const outputPath = './test_employees_damascus_50.xlsx';
XLSX.writeFile(wb, outputPath);
console.log(`Excel file created: ${outputPath}`);
console.log(`Total rows: ${rows.length}`);
