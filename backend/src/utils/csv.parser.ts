import { z } from 'zod';
import { ValidationError, CsvCandidate } from '../types';
import * as XLSX from 'xlsx';

const candidateRowSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email format'),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number (10 digits starting with 6-9)'),
  dateOfBirth: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date of birth'),
  gender: z
    .string()
    .refine(
      (v) => ['male', 'female', 'other'].includes(v.toLowerCase()),
      'Gender must be Male, Female, or Other'
    ),
  courseName: z.string().min(2).max(200),
  trainingCentre: z.string().min(2).max(200),
  completionDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid completion date'),
});

const COLUMN_MAP: Record<string, string> = {
  'full name': 'fullName',
  fullname: 'fullName',
  name: 'fullName',
  email: 'email',
  'email address': 'email',
  mobile: 'mobile',
  'mobile number': 'mobile',
  phone: 'mobile',
  'date of birth': 'dateOfBirth',
  dob: 'dateOfBirth',
  dateofbirth: 'dateOfBirth',
  gender: 'gender',
  course: 'courseName',
  'course name': 'courseName',
  coursename: 'courseName',
  'training centre': 'trainingCentre',
  'training center': 'trainingCentre',
  trainingcentre: 'trainingCentre',
  centre: 'trainingCentre',
  'completion date': 'completionDate',
  completiondate: 'completionDate',
};

export interface ParseResult {
  valid: CsvCandidate[];
  errors: ValidationError[];
}

export function parseCandidateFile(buffer: Buffer, mimetype: string, originalname?: string): ParseResult {
  let rows: Record<string, string>[] = [];

  const isExcel =
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-excel' ||
    originalname?.endsWith('.xlsx');

  if (!isExcel) {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2)
      return {
        valid: [],
        errors: [{ row: 0, field: 'file', message: 'File is empty or has no data rows' }],
      };

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
  } else {
    // Excel
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      raw: false,
      defval: '',
    });
    rows = data.map((r) => {
      const normalized: Record<string, string> = {};
      Object.entries(r).forEach(([k, v]) => {
        normalized[k.toLowerCase().trim()] = String(v || '');
      });
      return normalized;
    });
  }

  const valid: CsvCandidate[] = [];
  const errors: ValidationError[] = [];
  const seenEmails = new Set<string>();
  const seenMobiles = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNum = i + 2;

    const mapped: Record<string, string> = {};
    Object.entries(rawRow).forEach(([k, v]) => {
      const normalKey = COLUMN_MAP[k] || k;
      mapped[normalKey] = v;
    });

    const result = candidateRowSchema.safeParse(mapped);
    if (!result.success) {
      result.error.errors.forEach((e) => {
        errors.push({ row: rowNum, field: e.path.join('.'), message: e.message });
      });
      continue;
    }

    const candidate = result.data as CsvCandidate;
    const emailLower = candidate.email.toLowerCase();
    const mobileTrimmed = candidate.mobile.trim();

    if (seenEmails.has(emailLower)) {
      errors.push({
        row: rowNum,
        field: 'email',
        message: `Duplicate email: ${candidate.email}`,
      });
      continue;
    }
    if (seenMobiles.has(mobileTrimmed)) {
      errors.push({
        row: rowNum,
        field: 'mobile',
        message: `Duplicate mobile: ${candidate.mobile}`,
      });
      continue;
    }

    seenEmails.add(emailLower);
    seenMobiles.add(mobileTrimmed);
    valid.push(candidate);
  }

  return { valid, errors };
}
