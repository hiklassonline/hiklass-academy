import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  hasSmtpConfig,
  smtpTimeoutMs,
  smtpConfig,
  smtpConfigCandidates,
  createTransporter,
  createVerifiedTransporter,
  sendMailWithSmtpCandidates,
  withTimeout,
  explainSmtpError,
  publicEmailFailureMessage,
  checkSmtpPort,
  setSmtpOverride,
  verifySmtpOnStartup,
} from './config/mailer.js';
import { sendEmail, sendEnrollmentConfirmation, sendAdminNotification, sendPasswordReset, sendContactEmail } from './services/emailService.js';
import { passwordResetTemplate, contactNotificationTemplate, testEmailTemplate } from './templates/emailTemplates.js';
import { generateSecureToken } from './utils/tokens.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

const app = express();
const PORT = Number(process.env.PORT || 5000);
const DATA_DIR = path.isAbsolute(process.env.DATA_DIR || '')
  ? process.env.DATA_DIR
  : path.join(__dirname, '..', process.env.DATA_DIR || 'storage');
const ORDERS_FILE = path.join(DATA_DIR, 'course-orders.json');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@hiklassacademy.com';
const ADMIN_LOGIN_EMAIL = process.env.ADMIN_LOGIN_EMAIL || ADMIN_EMAIL || 'admin@hiklassacademy.com';
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-insecure-student-jwt-secret');
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn('JWT_SECRET is not set; using an insecure development fallback. Set JWT_SECRET in server/.env before deploying.');
}
const STUDENT_TOKEN_EXPIRY = '30d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'HIKLASS Academy';
const ORDER_EMAIL_SENT_MESSAGE = '🎉 Your enrollment request has been received successfully! A confirmation email has been sent to your registered email address. Please check your inbox (and spam folder if necessary). Our admissions team will contact you shortly.';
const ORDER_EMAIL_INTRO = 'This automated email confirms that your order was saved successfully. Please keep this message for your records.';
const EMAIL_LOGO_SVG_CID = 'hiklass-logo-horizontal-svg';
const EMAIL_LOGO_PNG_CID = 'hiklass-email-logo-png';
const EMAIL_WHATSAPP_SVG_CID = 'hiklass-whatsapp-svg';
const EMAIL_WHATSAPP_PNG_CID = 'hiklass-whatsapp-png';
const EMAIL_SOCIAL_ICONS_SVG_CID = 'hiklass-social-icons-svg';
const WHATSAPP_PRIMARY = (process.env.WHATSAPP_PRIMARY || '237651251941').replace(/\D/g, '');
const EMAIL_LOGO_DIRS = [
  path.join(__dirname, '..', 'public', 'assets'),
  path.join(__dirname, '..', 'client', 'public', 'assets'),
  path.join(__dirname, '..', 'src', 'assets'),
  path.join(__dirname, '..', 'client', 'src', 'assets'),
];
const allowedModes = new Set(['Online', 'Physical', 'Hybrid', 'Onsite', 'Weekend']);
const allowedEnrollmentStatuses = new Set(['Pending', 'Confirmed', 'Paid', 'Completed', 'Cancelled', 'Refunded']);
const allowedPaymentMethods = new Set(['MTN MOMO', 'Orange OM', 'PayPal', 'Cash']);
const DEFAULT_COURSE_PRICES = new Map([
  ['Basic Computer Training', 25000],
  ['Microsoft Office Suite', 35000],
  ['Graphic Design', 50000],
  ['Video Editing', 60000],
  ['Web Design', 75000],
  ['Web Development', 100000],
  ['Mobile App Development', 120000],
  ['Programming', 75000],
  ['Database Management', 60000],
  ['AI & Prompt Engineering', 50000],
  ['Data Science & Analytics', 90000],
  ['Cybersecurity', 100000],
  ['Networking', 75000],
  ['Cloud Computing', 100000],
  ['DevOps Engineering', 120000],
  ['UI/UX Design', 65000],
  ['Digital Marketing', 50000],
  ['Accounting Software', 45000],
  ['Computer Hardware & Maintenance', 60000],
  ['Multimedia & Broadcasting', 75000],
  ['3D Design & Animation', 100000],
  ['AutoCAD / Engineering Software', 90000],
  ['Coding for Kids', 35000],
  ['Freelancing & Online Business', 50000],
]);

// Mutable, kept in sync with storage/courses.json (via refreshCoursePriceCache) so
// admin price edits immediately apply to storefront display and order validation.
let COURSE_PRICES = new Map(DEFAULT_COURSE_PRICES);
const PACKAGE_CATALOG = new Map(
  [
    {
      id: 'starter',
      name: 'Starter Package',
      price: 50000,
      duration: '2 Weeks',
      courses: ['Basic Computer', 'Internet & Email', 'Microsoft Word', 'Microsoft PowerPoint'],
    },
    {
      id: 'creative',
      name: 'Creative Package',
      price: 100000,
      duration: '1 Month',
      courses: ['Canva', 'Photoshop', 'Illustrator', 'CorelDRAW', 'CapCut'],
    },
    {
      id: 'developer',
      name: 'Developer Package',
      price: 150000,
      duration: '2 Months',
      courses: ['HTML5', 'CSS3', 'JavaScript', 'React', 'Node.js', 'Database Fundamentals'],
    },
    {
      id: 'professional',
      name: 'Professional Package',
      price: 200000,
      duration: '3 Months',
      courses: ['Full Stack Development', 'Mobile App Development', 'UI/UX Design', 'Cloud Computing'],
    },
    {
      id: 'ai-future-tech',
      name: 'AI & Future Tech Package',
      price: 150000,
      duration: '1 Month',
      courses: ['Artificial Intelligence', 'Prompt Engineering', 'ChatGPT Productivity', 'Automation Tools'],
    },
    {
      id: 'kids-holiday',
      name: 'Kids Holiday Package',
      price: 75000,
      duration: '1 Month',
      courses: ['Scratch Programming', 'Coding for Kids', 'Animation', 'Robotics Basics'],
    },
    {
      id: 'professional-secretary',
      name: 'Professional Secretary & Office Administration',
      price: 250000,
      duration: '3 Months',
      courses: [
        'Office Administration & Management',
        'Business Communication',
        'Professional Business Writing',
        'Microsoft Word',
        'Microsoft Excel',
        'Microsoft PowerPoint',
        'Microsoft Outlook',
        'Google Workspace (Docs, Sheets, Drive, Calendar)',
        'Records & File Management',
        'Executive Calendar & Appointment Scheduling',
        'Meeting Planning & Minute Taking',
        'Customer Service & Front Desk Management',
        'Telephone & Email Etiquette',
        'Office Equipment & Digital Tools',
        'Office Finance & Petty Cash Basics',
        'Human Resource Administrative Support',
        'Business Ethics & Workplace Professionalism',
        'AI for Office Productivity (ChatGPT, Claude AI, Microsoft Copilot, Google Gemini)',
        'Time Management & Productivity',
        'Virtual Assistant Skills',
      ],
    },
  ].flatMap((item) => [
    [item.id, item],
    [item.name, item],
  ]),
);

const DEFAULT_DISCOUNTS = [
  {
    id: 'discount-holiday10',
    code: 'HOLIDAY10',
    type: 'percentage',
    value: 10,
    appliesTo: 'all',
    minOrderAmount: 0,
    startDate: '',
    endDate: '',
    usageLimit: 0,
    usedCount: 0,
    status: 'Active',
  },
  {
    id: 'discount-hiklass5000',
    code: 'HIKLASS5000',
    type: 'fixed',
    value: 5000,
    appliesTo: 'all',
    minOrderAmount: 0,
    startDate: '',
    endDate: '',
    usageLimit: 0,
    usedCount: 0,
    status: 'Active',
  },
];

function formatXaf(value) {
  return `${Number(value || 0).toLocaleString('en-US')} FCFA`;
}

function parseOrigins(value = '') {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const defaultOrigins = [
  'https://hiklassacademy.com',
  'https://www.hiklassacademy.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];
const allowedOrigins = [...new Set([...defaultOrigins, ...parseOrigins(process.env.CLIENT_URL)])];
const localDevOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return process.env.NODE_ENV !== 'production' && localDevOriginPattern.test(origin);
}

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    res.status(400).json({ message: 'Invalid JSON request body.' });
    return;
  }
  next(error);
});
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const UPLOADS_DIR = path.isAbsolute(process.env.UPLOAD_DIR || '')
  ? process.env.UPLOAD_DIR
  : path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
function ensureStartupDir(dir, label) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    console.error(`Could not create ${label} directory at ${dir}:`, error?.message || error);
  }
}
const AVATAR_DIR = path.join(UPLOADS_DIR, 'admin-avatars');
ensureStartupDir(AVATAR_DIR, 'admin avatar');
const STUDENT_AVATAR_DIR = path.join(UPLOADS_DIR, 'student-avatars');
ensureStartupDir(STUDENT_AVATAR_DIR, 'student avatar');

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `admin-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024;

function avatarFileFilter(_req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
  else {
    const error = new Error('Only JPG, PNG, and WEBP files are allowed.');
    error.status = 400;
    cb(error);
  }
}

const uploadAvatar = multer({ storage: avatarStorage, fileFilter: avatarFileFilter, limits: { fileSize: MAX_SIZE } });

const studentAvatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, STUDENT_AVATAR_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `student-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});
const uploadStudentAvatar = multer({ storage: studentAvatarStorage, fileFilter: avatarFileFilter, limits: { fileSize: MAX_SIZE } });

const INSTRUCTOR_AVATAR_DIR = path.join(UPLOADS_DIR, 'instructor-avatars');
ensureStartupDir(INSTRUCTOR_AVATAR_DIR, 'instructor avatar');
const instructorAvatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, INSTRUCTOR_AVATAR_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `instructor-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});
const uploadInstructorAvatar = multer({ storage: instructorAvatarStorage, fileFilter: avatarFileFilter, limits: { fileSize: MAX_SIZE } });

const COURSE_IMAGE_DIR = path.join(UPLOADS_DIR, 'course-images');
ensureStartupDir(COURSE_IMAGE_DIR, 'course image');
const courseImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, COURSE_IMAGE_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `course-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});
const COURSE_IMAGE_MAX_SIZE = 4 * 1024 * 1024;
const uploadCourseImage = multer({ storage: courseImageStorage, fileFilter: avatarFileFilter, limits: { fileSize: COURSE_IMAGE_MAX_SIZE } });

const PACKAGE_IMAGE_DIR = path.join(UPLOADS_DIR, 'package-images');
ensureStartupDir(PACKAGE_IMAGE_DIR, 'package image');
const packageImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PACKAGE_IMAGE_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `package-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});
const uploadPackageImage = multer({ storage: packageImageStorage, fileFilter: avatarFileFilter, limits: { fileSize: COURSE_IMAGE_MAX_SIZE } });

const ASSIGNMENT_UPLOAD_DIR = path.join(UPLOADS_DIR, 'assignment-submissions');
ensureStartupDir(ASSIGNMENT_UPLOAD_DIR, 'assignment upload');
const ASSIGNMENT_ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const ASSIGNMENT_MAX_SIZE = 15 * 1024 * 1024;
const assignmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ASSIGNMENT_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `submission-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});
function assignmentFileFilter(_req, file, cb) {
  if (ASSIGNMENT_ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
  else {
    const error = new Error('Only PDF, Word, Excel, PowerPoint, ZIP, JPG, PNG, and WEBP files are allowed.');
    error.status = 400;
    cb(error);
  }
}
const uploadAssignmentFile = multer({ storage: assignmentStorage, fileFilter: assignmentFileFilter, limits: { fileSize: ASSIGNMENT_MAX_SIZE } });

const VOICE_NOTE_DIR = path.join(UPLOADS_DIR, 'voice-notes');
ensureStartupDir(VOICE_NOTE_DIR, 'voice note');
const VOICE_NOTE_ALLOWED_MIME = [
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
];
const VOICE_NOTE_MAX_SIZE = 10 * 1024 * 1024;
const voiceNoteStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VOICE_NOTE_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.webm';
    const safeName = `voice-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});
function voiceNoteFileFilter(_req, file, cb) {
  // MediaRecorder reports mimeType with codec params (e.g. "audio/webm;codecs=opus"),
  // so compare only the base type against the allow-list.
  const baseMime = String(file.mimetype || '').split(';')[0].trim();
  if (VOICE_NOTE_ALLOWED_MIME.includes(baseMime)) cb(null, true);
  else {
    const error = new Error('Only audio recordings are allowed.');
    error.status = 400;
    cb(error);
  }
}
const uploadVoiceNote = multer({ storage: voiceNoteStorage, fileFilter: voiceNoteFileFilter, limits: { fileSize: VOICE_NOTE_MAX_SIZE } });

app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(UPLOADS_DIR));

const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX || (process.env.NODE_ENV === 'production' ? 600 : 2000));
const ADMIN_LOGIN_RATE_LIMIT_MAX = Number(process.env.ADMIN_LOGIN_RATE_LIMIT_MAX || (process.env.NODE_ENV === 'production' ? 20 : 100));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a few minutes and try again.' },
  // Authenticated admin traffic (already gated by ADMIN_TOKEN) shouldn't share the
  // public-facing budget with anonymous visitors — a busy admin panel session alone
  // can burn through 120 requests. The login route keeps its own stricter limiter below.
  skip: (req) => req.path.startsWith('/admin/') && req.path !== '/admin/auth/login',
});

const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: ADMIN_LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please wait a few minutes and try again.' },
});

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions. Please wait a few minutes and try again.' },
});

const emailStatusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many email status checks. Please wait a few minutes and try again.' },
});

const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many messages sent. Please wait a few minutes and try again.' },
});

const studentAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

const testimonialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions. Please wait a few minutes and try again.' },
});

const testEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many test emails requested. Please wait a few minutes and try again.' },
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many messages sent. Please wait a few minutes and try again.' },
});

app.use('/api', apiLimiter);

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN && process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  if (!ADMIN_TOKEN) {
    res.status(503).json({ message: 'Admin dashboard is not configured. Set ADMIN_TOKEN in server/.env.' });
    return;
  }

  const token = req.get('x-admin-token') || '';
  if (token !== ADMIN_TOKEN) {
    res.status(401).json({ message: 'Admin access denied.' });
    return;
  }

  next();
}

async function requireStudent(req, res, next) {
  if (!JWT_SECRET) {
    res.status(503).json({ message: 'Student login is not configured. Set JWT_SECRET in server/.env.' });
    return;
  }

  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ message: 'Student access denied.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const accounts = await readJsonFile('student-accounts');
    const account = accounts.find((item) => item.id === payload.id);
    if (!account) {
      res.status(401).json({ message: 'This account no longer exists. Please sign in again.' });
      return;
    }
    req.student = { id: account.id, email: account.email, name: account.name };
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

function cleanText(value, maxLength = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanMultilineText(value, maxLength = 4000) {
  const NL = String.fromCharCode(10);
  const CR = String.fromCharCode(13);
  const tripleNL = NL + NL + NL;
  return String(value || '')
    .split('')
    .filter((ch) => ch !== CR)
    .join('')
    .split(NL)
    .map((line) => line.split('').filter((ch) => ch.charCodeAt(0) >= 32).join('').replace(/ {2,}/g, ' ').trim())
    .join(NL)
    .split(tripleNL).join(NL + NL)
    .trim()
    .slice(0, maxLength);
}

async function updateEnvValue(key, value) {
  const cleanKey = String(key || '').replace(/[^A-Z0-9_]/g, '');
  const cleanValue = String(value || '').replace(/\r?\n/g, '');
  let content = '';
  try {
    content = await fsp.readFile(ENV_FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const line = `${cleanKey}=${cleanValue}`;
  const pattern = new RegExp(`^${cleanKey}=.*$`, 'm');
  const nextContent = pattern.test(content)
    ? content.replace(pattern, line)
    : `${content.trimEnd()}${content.trim() ? '\n' : ''}${line}\n`;

  await fsp.writeFile(ENV_FILE, nextContent, 'utf8');
  process.env[cleanKey] = cleanValue;
}

function escapeHtml(value = '') {
  return cleanText(value, 1000)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function normalizeCourseTitle(value) {
  if (typeof value === 'object' && value !== null) {
    return cleanText(value.title || value.name, 90);
  }
  return cleanText(value, 90);
}

function normalizeCourses(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((course) => normalizeCourseTitle(course))
    .filter(Boolean)
    .slice(0, 30)
    .map((title) => ({ title, price: COURSE_PRICES.get(title) || 0 }));
}

function normalizePackageKey(value) {
  if (typeof value === 'object' && value !== null) {
    return cleanText(value.id || value.name, 90);
  }
  return cleanText(value, 90);
}

function normalizePackages(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((item) => PACKAGE_CATALOG.get(normalizePackageKey(item)))
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      duration: item.duration,
      courses: item.courses,
    }));
}

function selectionSubtotal(courses, packages) {
  return {
    coursesSubtotal: courses.reduce((sum, course) => sum + Number(course.price || 0), 0),
    packagesSubtotal: packages.reduce((sum, item) => sum + Number(item.price || 0), 0),
  };
}

function normalizeDiscountCode(value) {
  return cleanText(value, 40).toUpperCase();
}

function normalizeDiscount(record = {}) {
  const type = cleanText(record.type || (record.percentage ? 'percentage' : 'fixed'), 30).toLowerCase();
  const appliesTo = cleanText(record.appliesTo || 'all', 30).toLowerCase();
  return {
    id: record.id || `disc-${normalizeDiscountCode(record.code)}`,
    code: normalizeDiscountCode(record.code),
    type: type === 'percentage' ? 'percentage' : 'fixed',
    value: Number(record.value ?? record.percentage ?? 0),
    appliesTo: ['courses', 'packages', 'all'].includes(appliesTo) ? appliesTo : 'all',
    minOrderAmount: Number(record.minOrderAmount ?? record.minimumOrderAmount ?? 0),
    startDate: cleanText(record.startDate || '', 40),
    endDate: cleanText(record.endDate || '', 40),
    usageLimit: Number(record.usageLimit ?? record.maxUses ?? 0),
    usedCount: Number(record.usedCount ?? record.used ?? 0),
    status: cleanText(record.status || 'Active', 30),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function getDiscountsWithDefaults() {
  const stored = await readJsonFile('discounts');
  const normalizedStored = stored.map(normalizeDiscount).filter((discount) => discount.code);
  const storedCodes = new Set(normalizedStored.map((discount) => discount.code));
  return [
    ...normalizedStored,
    ...DEFAULT_DISCOUNTS.filter((discount) => !storedCodes.has(discount.code)),
  ];
}

function discountValidityError(discount, subtotal) {
  if (!discount?.code) return 'Invalid or expired discount code';
  if (discount.status && discount.status.toLowerCase() !== 'active') return 'Invalid or expired discount code';
  const now = new Date();
  if (discount.startDate && new Date(discount.startDate) > now) return 'Invalid or expired discount code';
  if (discount.endDate) {
    const end = new Date(discount.endDate);
    end.setHours(23, 59, 59, 999);
    if (end < now) return 'Invalid or expired discount code';
  }
  if (discount.usageLimit > 0 && discount.usedCount >= discount.usageLimit) return 'Discount usage limit reached';
  if (subtotal < discount.minOrderAmount) return `Minimum order amount is ${formatXaf(discount.minOrderAmount)}.`;
  return '';
}

function evaluateDiscount(discount, courses, packages) {
  const { coursesSubtotal, packagesSubtotal } = selectionSubtotal(courses, packages);
  const subtotal = coursesSubtotal + packagesSubtotal;
  const validityError = discountValidityError(discount, subtotal);
  if (validityError) {
    return { success: false, message: validityError, subtotal, discountAmount: 0, grandTotal: subtotal };
  }

  const applicableSubtotal = discount.appliesTo === 'courses'
    ? coursesSubtotal
    : discount.appliesTo === 'packages'
      ? packagesSubtotal
      : subtotal;

  if (applicableSubtotal <= 0) {
    return { success: false, message: `This discount applies to ${discount.appliesTo} only.`, subtotal, discountAmount: 0, grandTotal: subtotal };
  }

  const rawAmount = discount.type === 'percentage'
    ? Math.round((applicableSubtotal * discount.value) / 100)
    : discount.value;
  const discountAmount = Math.max(0, Math.min(subtotal, Math.floor(Number(rawAmount || 0))));
  const grandTotal = Math.max(0, subtotal - discountAmount);

  return {
    success: true,
    code: discount.code,
    type: discount.type,
    value: discount.value,
    appliesTo: discount.appliesTo,
    discountAmount,
    subtotal,
    grandTotal,
    message: 'Discount applied successfully',
  };
}

async function calculateDiscount(code, courses, packages) {
  const { coursesSubtotal, packagesSubtotal } = selectionSubtotal(courses, packages);
  const subtotal = coursesSubtotal + packagesSubtotal;
  const normalizedCode = normalizeDiscountCode(code);
  if (!normalizedCode) {
    return { subtotal, discountCode: '', discountAmount: 0, grandTotal: subtotal };
  }

  const discounts = await getDiscountsWithDefaults();
  const discount = discounts.find((item) => item.code === normalizedCode);
  const result = evaluateDiscount(discount, courses, packages);
  if (!result.success) return result;
  return {
    ...result,
    discountCode: result.code,
  };
}

async function incrementDiscountUsage(code) {
  const normalizedCode = normalizeDiscountCode(code);
  if (!normalizedCode) return;
  const discounts = await readJsonFile('discounts');
  const index = discounts.findIndex((item) => normalizeDiscountCode(item.code) === normalizedCode);
  if (index === -1) return;
  discounts[index] = {
    ...discounts[index],
    usedCount: Number(discounts[index].usedCount ?? discounts[index].used ?? 0) + 1,
    used: Number(discounts[index].usedCount ?? discounts[index].used ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFile('discounts', discounts);
}

async function createPendingPaymentForOrder(order) {
  const payments = await readJsonFile('payments');
  if (payments.some((payment) => payment.enrollmentId === order.id)) return null;
  const payment = {
    id: `payment-${order.id}`,
    enrollmentId: order.id,
    studentName: order.name,
    amount: Number(order.grandTotal ?? order.totalAmount ?? 0),
    method: order.paymentMethod,
    status: 'Pending',
    reference: null,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  payments.unshift(payment);
  await writeJsonFile('payments', payments);
  return payment;
}

async function validateOrder(body) {
  const order = {
    name: cleanText(body.name || body.studentName, 90),
    phone: cleanText(body.phone, 40),
    email: cleanText(body.email, 120).toLowerCase(),
    mode: cleanText(body.mode || body.learningMode, 30),
    notes: cleanText(body.notes || body.message, 700),
    paymentMethod: cleanText(body.paymentMethod, 30),
    courses: normalizeCourses(body.courses || body.selectedCourses),
    packages: normalizePackages(body.packages || body.selectedPackages),
  };
  const pricing = await calculateDiscount(body.discountCode, order.courses, order.packages);
  order.subtotal = pricing.subtotal;
  order.discountCode = pricing.discountCode || '';
  order.discountType = pricing.type || '';
  order.discountValue = Number(pricing.value || 0);
  order.discountAmount = Number(pricing.discountAmount || 0);
  order.grandTotal = Number(pricing.grandTotal ?? pricing.subtotal);
  order.totalAmount = order.grandTotal;

  const errors = [];
  if (order.name.length < 2) errors.push('Student name is required.');
  if (!isEmail(order.email)) errors.push('A valid email address is required.');
  if (!/^[+()\d\s.-]{7,25}$/.test(order.phone)) errors.push('A valid phone number is required.');
  if (!allowedModes.has(order.mode)) errors.push('Preferred learning mode must be Online, Physical, Hybrid, Onsite, or Weekend.');
  if (!allowedPaymentMethods.has(order.paymentMethod)) errors.push('Please select a payment method.');
  if (!order.courses.length && !order.packages.length) errors.push('Select at least one course or package.');
  const unknownCourses = order.courses.filter((course) => !COURSE_PRICES.has(course.title)).map((course) => course.title);
  if (unknownCourses.length) errors.push(`Unknown course selection: ${unknownCourses.join(', ')}.`);
  const unknownPackages = Array.isArray(body.packages)
    ? body.packages.map((item) => normalizePackageKey(item)).filter((item) => item && !PACKAGE_CATALOG.has(item))
    : [];
  if (unknownPackages.length) errors.push(`Unknown package selection: ${unknownPackages.join(', ')}.`);
  if (body.discountCode && !pricing.success) errors.push(pricing.message || 'Invalid or expired discount code.');

  return { order, errors };
}

async function readOrders() {
  try {
    const content = await fsp.readFile(ORDERS_FILE, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function saveOrder(order) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const orders = await readOrders();
  const savedOrder = {
    id: `HIK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: 'Pending',
    ...order,
  };

  orders.push(savedOrder);
  const tempFile = `${ORDERS_FILE}.tmp`;
  await fsp.writeFile(tempFile, `${JSON.stringify(orders, null, 2)}\n`, 'utf8');
  await fsp.rename(tempFile, ORDERS_FILE);
  return savedOrder;
}

// Generic JSON file read/write helpers
const STORAGE_FILES = {
  courses: path.join(DATA_DIR, 'courses.json'),
  packages: path.join(DATA_DIR, 'packages.json'),
  students: path.join(DATA_DIR, 'students.json'),
  'student-accounts': path.join(DATA_DIR, 'student-accounts.json'),
  'password-resets': path.join(DATA_DIR, 'password-resets.json'),
  payments: path.join(DATA_DIR, 'payments.json'),
  discounts: path.join(DATA_DIR, 'discounts.json'),
  instructors: path.join(DATA_DIR, 'instructors.json'),
  testimonials: path.join(DATA_DIR, 'testimonials.json'),
  messages: path.join(DATA_DIR, 'messages.json'),
  'email-logs': path.join(DATA_DIR, 'email-logs.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
  admins: path.join(DATA_DIR, 'admins.json'),
  roles: path.join(DATA_DIR, 'roles.json'),
  'activity-logs': path.join(DATA_DIR, 'activity-logs.json'),
  reports: path.join(DATA_DIR, 'reports.json'),
  announcements: path.join(DATA_DIR, 'announcements.json'),
  'upcoming-items': path.join(DATA_DIR, 'upcoming-items.json'),
  'course-curricula': path.join(DATA_DIR, 'course-curricula.json'),
  'lesson-progress': path.join(DATA_DIR, 'lesson-progress.json'),
  'student-messages': path.join(DATA_DIR, 'student-messages.json'),
  'course-assignments': path.join(DATA_DIR, 'course-assignments.json'),
  'assignment-submissions': path.join(DATA_DIR, 'assignment-submissions.json'),
  'course-quizzes': path.join(DATA_DIR, 'course-quizzes.json'),
  'quiz-attempts': path.join(DATA_DIR, 'quiz-attempts.json'),
  'blog-posts': path.join(DATA_DIR, 'blog-posts.json'),
  'blog-categories': path.join(DATA_DIR, 'blog-categories.json'),
  'blog-comments': path.join(DATA_DIR, 'blog-comments.json'),
  'blog-subscribers': path.join(DATA_DIR, 'blog-subscribers.json'),
};

// One-time migration: if DATA_DIR was pointed at a new location (e.g. to survive
// redeploys), pull over any data files still sitting in the old hardcoded `storage/`
// folder so existing orders/enrollments aren't seen as missing.
const LEGACY_DATA_DIR = path.join(__dirname, '..', 'storage');

async function migrateLegacyDataFiles() {
  if (path.resolve(DATA_DIR) === path.resolve(LEGACY_DATA_DIR)) return;
  let legacyEntries;
  try {
    legacyEntries = await fsp.readdir(LEGACY_DATA_DIR);
  } catch {
    return;
  }

  const fileNames = new Set([
    path.basename(ORDERS_FILE),
    'admin-profile.json',
    ...Object.values(STORAGE_FILES).map((filePath) => path.basename(filePath)),
  ]);

  for (const fileName of fileNames) {
    if (!legacyEntries.includes(fileName)) continue;
    const target = path.join(DATA_DIR, fileName);
    try {
      await fsp.access(target);
      continue; // already present at the new location; never overwrite it
    } catch {
      // not present yet at the new location, fall through and copy it
    }
    try {
      await fsp.mkdir(DATA_DIR, { recursive: true });
      await fsp.copyFile(path.join(LEGACY_DATA_DIR, fileName), target);
      console.log(`Migrated legacy data file into DATA_DIR: ${fileName}`);
    } catch (error) {
      console.error(`Failed to migrate legacy data file ${fileName}:`, error);
    }
  }
}

async function readJsonFile(key) {
  const filePath = STORAGE_FILES[key];
  if (!filePath) return [];
  try {
    const content = await fsp.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeJsonFile(key, data) {
  const filePath = STORAGE_FILES[key];
  if (!filePath) return;
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${filePath}.tmp`;
  await fsp.writeFile(tempFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fsp.rename(tempFile, filePath);
}

async function recordEmailDelivery({ id, recipient, subject, status, errorMessage = '' }) {
  try {
    const logs = await readJsonFile('email-logs');
    const entry = {
      id: id || `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      recipient: cleanText(recipient, 180),
      subject: cleanText(subject, 240),
      status,
      date: new Date().toISOString(),
      errorMessage: cleanText(errorMessage, 500),
    };
    const existingIndex = logs.findIndex((log) => log.id === entry.id);
    if (existingIndex >= 0) logs[existingIndex] = entry;
    else logs.unshift(entry);
    await writeJsonFile('email-logs', logs.slice(0, 500));
  } catch (error) {
    console.error('Email delivery log failed:', error);
  }
}

function createAdminId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value, fallback = 'item') {
  const slug = cleanText(value, 120)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || `${fallback}-${Date.now()}`;
}

const BLOG_CATEGORY_SEEDS = [
  ['digital-skills', 'Digital Skills', 'Practical technology skills for students and professionals.', 'Laptop', '#1E2F97'],
  ['artificial-intelligence', 'Artificial Intelligence', 'AI tools, automation, prompts, and future work trends.', 'Brain', '#6D28D9'],
  ['web-development', 'Web Development', 'Frontend, backend, websites, and coding career guides.', 'Code', '#2563EB'],
  ['graphic-design', 'Graphic Design', 'Design thinking, branding, Canva, Photoshop, and creative careers.', 'PenTool', '#16A34A'],
  ['video-editing', 'Video Editing', 'Editing workflows, content creation, motion graphics, and storytelling.', 'Video', '#EA580C'],
  ['digital-marketing', 'Digital Marketing', 'Social media, SEO, analytics, campaigns, and business growth.', 'Megaphone', '#F59E0B'],
  ['career-development', 'Career Development', 'Roadmaps, portfolios, freelancing, interviews, and workplace growth.', 'Briefcase', '#0F766E'],
  ['student-resources', 'Student Resources', 'Guides, downloads, scholarships, productivity, and learning support.', 'BookOpen', '#D30D1A'],
];

function defaultBlogCategories() {
  return BLOG_CATEGORY_SEEDS.map(([slug, name, description, icon, color], index) => ({
    id: `cat-${slug}`,
    slug,
    name,
    description,
    icon,
    color,
    seoTitle: `${name} Articles | HIKLASS Academy`,
    metaDescription: description,
    order: index + 1,
    status: 'Active',
    createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }));
}

function defaultBlogPosts() {
  const now = Date.now();
  const author = {
    id: 'author-tah-terence',
    name: 'Tah Terence',
    role: 'Founder, CEO & Lead Instructor',
    bio: 'Technology professional, creative strategist, and educator with over 15 years of experience in digital innovation, software development, creative media, and professional training.',
    avatar: '',
  };
  return [
    {
      title: 'How AI Is Transforming Education and the Future of Work',
      category: 'Artificial Intelligence',
      categorySlug: 'artificial-intelligence',
      excerpt: 'Discover how artificial intelligence is changing learning, business, creativity, and employment opportunities across the world.',
      content: '## Why AI matters now\nArtificial intelligence is becoming a practical everyday tool for students, creators, administrators, and entrepreneurs. It can summarize lessons, explain difficult topics, draft business documents, support coding, and help teams work faster.\n\n## What learners should focus on\nStudents should learn how to ask better questions, verify AI output, combine AI with human judgment, and use tools ethically. The strongest digital professionals will not be replaced by AI; they will learn how to lead with it.\n\n## Practical ways to begin\nStart with prompt writing, AI research workflows, content planning, spreadsheet analysis, image generation, and automation. Then connect those skills to a real course, project, or business problem.\n\n> AI is most powerful when it supports clear thinking, not when it replaces it.\n\n## Related course\nHIKLASS Academy offers AI and future technology training for learners who want practical, project-based AI skills.',
      tags: ['AI', 'Future of Work', 'Student Tips'],
      relatedCourse: 'AI & Prompt Engineering',
      readingTime: 8,
      featured: true,
      status: 'Published',
      views: 1840,
      likes: 92,
      shares: 31,
      publishedAt: new Date(now - 46 * 24 * 60 * 60 * 1000).toISOString(),
      author,
    },
    {
      title: 'A Complete Roadmap to Become a Full-Stack Developer',
      category: 'Web Development',
      categorySlug: 'web-development',
      excerpt: 'A beginner-friendly path from HTML and CSS to React, Node.js, databases, deployment, and portfolio projects.',
      content: '## Start with the web foundations\nLearn HTML for structure, CSS for layout, and JavaScript for interaction. Build small pages before moving to larger applications.\n\n## Add modern frontend skills\nReact helps you build reusable interfaces. Practice components, state, forms, routing, and API calls.\n\n## Learn backend thinking\nNode.js, Express, databases, authentication, and deployment help you build complete products.\n\n## Build proof\nYour portfolio should include a landing page, dashboard, authentication flow, API-backed app, and one real client-style project.',
      tags: ['Coding', 'React', 'Career'],
      relatedCourse: 'Web Development',
      readingTime: 7,
      featured: false,
      status: 'Published',
      views: 1260,
      likes: 64,
      shares: 22,
      publishedAt: new Date(now - 43 * 24 * 60 * 60 * 1000).toISOString(),
      author,
    },
    {
      title: 'Top Graphic Design Trends in 2025 You Should Know',
      category: 'Graphic Design',
      categorySlug: 'graphic-design',
      excerpt: 'Brand systems, AI-assisted design, bold typography, social-first layouts, and portfolio-ready creative direction.',
      content: '## Design is becoming more strategic\nGood design is no longer only about making things attractive. Businesses need consistent brand systems, fast content workflows, and visuals that convert.\n\n## Trends worth learning\nFocus on layout hierarchy, accessible color, motion-ready assets, AI-assisted ideation, and templates that help brands publish faster.\n\n## Build a portfolio\nCreate social media campaigns, logos, flyers, landing page mockups, and brand guides. Show process, not only final images.',
      tags: ['Canva', 'Photoshop', 'Design'],
      relatedCourse: 'Graphic Design',
      readingTime: 6,
      featured: false,
      status: 'Published',
      views: 980,
      likes: 51,
      shares: 18,
      publishedAt: new Date(now - 42 * 24 * 60 * 60 * 1000).toISOString(),
      author: { ...author, name: 'Esther Ngokam', role: 'Creative Design Instructor' },
    },
    {
      title: '10 Social Media Marketing Tips That Actually Work',
      category: 'Digital Marketing',
      categorySlug: 'digital-marketing',
      excerpt: 'Simple, practical marketing habits for students, creators, small businesses, and growing brands.',
      content: '## Choose one clear audience\nMarketing works when your message is specific. Define who you help and what problem you solve.\n\n## Build a repeatable content system\nUse educational posts, proof posts, offers, behind-the-scenes stories, and customer questions. Track what gets saves, comments, clicks, and enquiries.\n\n## Improve every week\nReview analytics, test better hooks, improve visuals, and connect your content to a real offer.',
      tags: ['Marketing', 'Business', 'Social Media'],
      relatedCourse: 'Digital Marketing',
      readingTime: 5,
      featured: false,
      status: 'Published',
      views: 1110,
      likes: 59,
      shares: 29,
      publishedAt: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(),
      author: { ...author, name: 'Kiven Emmanuel', role: 'Digital Marketing Instructor' },
    },
  ].map((post, index) => ({
    id: `post-${slugify(post.title)}`,
    slug: slugify(post.title),
    subtitle: post.excerpt,
    image: '',
    imageAlt: post.title,
    imageCaption: '',
    commentsEnabled: true,
    seoTitle: post.title,
    metaDescription: post.excerpt,
    focusKeyword: post.category,
    canonicalUrl: '',
    noIndex: false,
    noFollow: false,
    scheduledAt: '',
    createdAt: new Date(now - (60 - index) * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now - (10 - index) * 24 * 60 * 60 * 1000).toISOString(),
    ...post,
  }));
}

async function blogCategoriesWithDefaults() {
  const stored = await readJsonFile('blog-categories');
  return stored.length ? stored : defaultBlogCategories();
}

async function blogPostsWithDefaults() {
  const stored = await readJsonFile('blog-posts');
  return stored.length ? stored : defaultBlogPosts();
}

function normalizeBlogCategory(input = {}, existing = {}) {
  const name = cleanText(input.name ?? existing.name, 100);
  const slug = slugify(input.slug || name || existing.slug, 'category');
  const now = new Date().toISOString();
  return {
    id: existing.id || input.id || createAdminId('cat'),
    name,
    slug,
    description: cleanText(input.description ?? existing.description, 500),
    icon: cleanText(input.icon ?? existing.icon ?? 'BookOpen', 40),
    color: cleanText(input.color ?? existing.color ?? '#1E2F97', 20),
    seoTitle: cleanText(input.seoTitle ?? existing.seoTitle, 160),
    metaDescription: cleanText(input.metaDescription ?? existing.metaDescription, 220),
    order: Number(input.order ?? existing.order ?? 0),
    status: cleanText(input.status ?? existing.status ?? 'Active', 30),
    createdAt: existing.createdAt || input.createdAt || now,
    updatedAt: now,
  };
}

function normalizeBlogPost(input = {}, existing = {}) {
  const title = cleanText(input.title ?? existing.title, 180);
  const slug = slugify(input.slug || title || existing.slug, 'post');
  const category = cleanText(input.category ?? existing.category ?? 'Digital Skills', 100);
  const categorySlug = slugify(input.categorySlug || category);
  const now = new Date().toISOString();
  const publishedAt = input.publishedAt || existing.publishedAt || (input.status === 'Published' ? now : '');
  const author = typeof input.author === 'object' && input.author
    ? input.author
    : existing.author || {};
  return {
    id: existing.id || input.id || createAdminId('post'),
    title,
    slug,
    subtitle: cleanText(input.subtitle ?? existing.subtitle, 220),
    excerpt: cleanText(input.excerpt ?? existing.excerpt, 500),
    content: cleanMultilineText(input.content ?? existing.content, 20000),
    image: cleanText(input.image ?? existing.image, 500),
    imageAlt: cleanText(input.imageAlt ?? existing.imageAlt ?? title, 180),
    imageCaption: cleanText(input.imageCaption ?? existing.imageCaption, 220),
    category,
    categorySlug,
    tags: Array.isArray(input.tags)
      ? input.tags.map((tag) => cleanText(tag, 50)).filter(Boolean).slice(0, 12)
      : cleanText(input.tags ?? existing.tags?.join(', ') ?? '', 400).split(',').map((tag) => cleanText(tag, 50)).filter(Boolean).slice(0, 12),
    relatedCourse: cleanText(input.relatedCourse ?? existing.relatedCourse, 120),
    status: cleanText(input.status ?? existing.status ?? 'Draft', 40),
    readingTime: Math.max(1, Number(input.readingTime ?? existing.readingTime ?? 5)),
    views: Math.max(0, Number(input.views ?? existing.views ?? 0)),
    likes: Math.max(0, Number(input.likes ?? existing.likes ?? 0)),
    shares: Math.max(0, Number(input.shares ?? existing.shares ?? 0)),
    featured: Boolean(input.featured ?? existing.featured),
    commentsEnabled: input.commentsEnabled === undefined ? existing.commentsEnabled !== false : Boolean(input.commentsEnabled),
    publishedAt,
    scheduledAt: cleanText(input.scheduledAt ?? existing.scheduledAt, 80),
    seoTitle: cleanText(input.seoTitle ?? existing.seoTitle ?? title, 180),
    metaDescription: cleanText(input.metaDescription ?? existing.metaDescription ?? input.excerpt ?? existing.excerpt, 240),
    focusKeyword: cleanText(input.focusKeyword ?? existing.focusKeyword, 120),
    canonicalUrl: cleanText(input.canonicalUrl ?? existing.canonicalUrl, 500),
    noIndex: Boolean(input.noIndex ?? existing.noIndex),
    noFollow: Boolean(input.noFollow ?? existing.noFollow),
    author: {
      id: cleanText(author.id || existing.author?.id || 'author-admin', 80),
      name: cleanText(author.name || existing.author?.name || 'HIKLASS Academy', 100),
      role: cleanText(author.role || existing.author?.role || 'Academy Editorial Team', 120),
      bio: cleanText(author.bio || existing.author?.bio || 'Digital education team at HIKLASS Academy.', 700),
      avatar: cleanText(author.avatar || existing.author?.avatar || '', 500),
    },
    createdAt: existing.createdAt || input.createdAt || now,
    updatedAt: now,
  };
}

function publicBlogPost(post, comments = []) {
  const approvedComments = comments.filter((comment) => comment.postId === post.id && comment.status === 'Approved');
  return {
    ...post,
    commentCount: approvedComments.length,
  };
}

function defaultAdminCourses() {
  return [...DEFAULT_COURSE_PRICES.entries()].map(([title, price]) => ({
    id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    title,
    price,
    category: 'Holiday Course',
    duration: 'Flexible',
    description: `${title} holiday training at HIKLASS Academy.`,
    status: 'Active',
  }));
}

function defaultAdminPackages() {
  return [...new Map([...PACKAGE_CATALOG.values()].map((item) => [item.id, item])).values()]
    .map((item) => ({ ...item, discountBadge: 'Bundle', status: 'Active' }));
}

async function readCoursesForAdminWrite() {
  const stored = await readJsonFile('courses');
  return stored.length ? stored : defaultAdminCourses();
}

async function refreshCoursePriceCache() {
  try {
    const courses = await readCoursesForAdminWrite();
    const next = new Map();
    for (const course of courses) {
      if (!course?.title || course.status === 'Inactive') continue;
      next.set(course.title, Number(course.price) || 0);
    }
    COURSE_PRICES = next;
  } catch (error) {
    console.error('Could not refresh course price cache:', error);
  }
}

async function readPackagesForAdminWrite() {
  const stored = await readJsonFile('packages');
  return stored.length ? stored : defaultAdminPackages();
}

function deriveStudentsFromOrders(orders) {
  return [...new Map(orders.map((order) => [
    order.email || order.phone || order.id,
    {
      id: `student-${order.id}`,
      name: order.name,
      email: order.email,
      phone: order.phone,
      mode: order.mode,
      courses: [...(order.courses || []).map((course) => course.title || course), ...(order.packages || []).map((item) => item.name || item)],
      createdAt: order.createdAt,
      source: 'enrollment',
    },
  ])).values()];
}

function derivePaymentsFromOrders(orders) {
  return orders.map((order) => ({
    id: `payment-${order.id}`,
    enrollmentId: order.id,
    studentName: order.name,
    method: order.paymentMethod || 'Pending confirmation',
    amount: order.grandTotal || order.totalAmount || 0,
    status: order.status === 'Paid' ? 'Paid' : 'Pending',
    reference: order.paymentReference || null,
    date: order.createdAt,
    createdAt: order.createdAt,
    source: 'enrollment',
  }));
}

function mergeByKey(baseItems, overrideItems, keyFn) {
  const merged = new Map();
  baseItems.forEach((item) => merged.set(keyFn(item), item));
  overrideItems.forEach((item) => merged.set(keyFn(item), item));
  return [...merged.values()];
}

function sanitizePayload(payload = {}, schema = {}) {
  return Object.fromEntries(
    Object.entries(schema).map(([key, config]) => {
      const value = payload[key];
      if (config.type === 'number') return [key, Number(value || 0)];
      if (config.type === 'array') {
        if (Array.isArray(value)) return [key, value.map((item) => cleanText(item, config.max || 160)).filter(Boolean)];
        return [key, cleanText(value, config.max || 500).split(',').map((item) => item.trim()).filter(Boolean)];
      }
      if (config.type === 'boolean') return [key, Boolean(value)];
      return [key, cleanText(value, config.max || 500)];
    }),
  );
}

async function recordActivity(action, target, detail = '') {
  try {
    const logs = await readJsonFile('activity-logs');
    logs.unshift({
      id: createAdminId('act'),
      action,
      target,
      detail: cleanText(detail, 500),
      actor: 'Admin',
      createdAt: new Date().toISOString(),
    });
    await writeJsonFile('activity-logs', logs.slice(0, 250));
  } catch (error) {
    console.error('Admin activity log failed:', error);
  }
}


function courseTitle(course) {
  return typeof course === 'string' ? course : course?.title || 'Unknown course';
}

function coursePrice(course) {
  if (typeof course === 'object' && course?.price) return Number(course.price);
  return COURSE_PRICES.get(courseTitle(course)) || 0;
}

function packageName(item) {
  return typeof item === 'string' ? item : item?.name || 'Unknown package';
}

function packagePrice(item) {
  if (typeof item === 'object' && item?.price) return Number(item.price);
  return PACKAGE_CATALOG.get(packageName(item))?.price || 0;
}

function packageDuration(item) {
  return typeof item === 'object' && item?.duration ? item.duration : PACKAGE_CATALOG.get(packageName(item))?.duration || 'Duration not set';
}

function packageCourses(item) {
  if (Array.isArray(item?.courses)) return item.courses;
  return PACKAGE_CATALOG.get(packageName(item))?.courses || [];
}

function findLogoAsset(fileName) {
  return EMAIL_LOGO_DIRS.map((dir) => path.join(dir, fileName)).find((assetPath) => fs.existsSync(assetPath)) || null;
}

function emailLogoAssets() {
  return {
    svgPath: findLogoAsset('logo-horizontal.svg'),
    pngPath: findLogoAsset('email.png') || findLogoAsset('logo-horizontal.png'),
    whatsappSvgPath: findLogoAsset('ui/whatsapp.svg'),
    whatsappPngPath: findLogoAsset('ui/whatsapp-email.png'),
    socialIconsSvgPath: findLogoAsset('social-icons.svg'),
  };
}

function emailLogoAttachments() {
  const { pngPath, whatsappPngPath } = emailLogoAssets();
  return [
    pngPath
      ? {
          filename: path.basename(pngPath),
          path: pngPath,
          cid: EMAIL_LOGO_PNG_CID,
        }
      : null,
    whatsappPngPath
      ? {
          filename: path.basename(whatsappPngPath),
          path: whatsappPngPath,
          cid: EMAIL_WHATSAPP_PNG_CID,
        }
      : null,
  ].filter(Boolean);
}

function emailLogoHeader() {
  const { pngPath } = emailLogoAssets();
  const logoSrc = pngPath ? `cid:${EMAIL_LOGO_PNG_CID}` : '';
  const logoHtml = logoSrc
    ? `<img class="hiklass-email-logo" src="${logoSrc}" width="260" alt="HIKLASS Academy" style="display:block;width:260px;max-width:100%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none">`
    : `<strong style="display:block;color:#1E2F97;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.2;text-align:center">HIKLASS Academy</strong>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#FFFFFF">
      <tr>
        <td align="center" style="padding:28px 20px 24px">${logoHtml}</td>
      </tr>
      <tr>
        <td bgcolor="#1E2F97" height="3" style="height:3px;font-size:0;line-height:3px;background:#1E2F97">&nbsp;</td>
      </tr>
    </table>`;
}

function emailResponsiveStyles() {
  return `
    <style>
      body, table, td, p, a { font-family: Arial, Helvetica, sans-serif; }
      table { border-collapse: collapse; }
      @media only screen and (max-width: 480px) {
        .hiklass-email-logo {
          width: 200px !important;
          max-width: 200px !important;
        }
        .hiklass-email-body {
          padding: 18px !important;
        }
        .hiklass-email-title {
          font-size: 24px !important;
        }
        .hiklass-email-column,
        .hiklass-contact-column {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .hiklass-email-column-pad {
          padding: 0 0 16px !important;
        }
        .hiklass-email-hero-title {
          font-size: 24px !important;
        }
        .hiklass-email-hero-art {
          display: none !important;
        }
        .hiklass-email-cta {
          width: 100% !important;
        }
      }
    </style>`;
}

function safeEmailText(value, fallback = 'Not provided') {
  const cleaned = cleanText(value, 1000);
  return escapeHtml(cleaned || fallback);
}

function orderCoursesTotal(order) {
  return (order.courses || []).reduce((sum, course) => sum + coursePrice(course), 0);
}

function orderPackagesTotal(order) {
  return (order.packages || []).reduce((sum, item) => sum + packagePrice(item), 0);
}

function orderGrandTotal(order) {
  return Number(order.grandTotal ?? order.totalAmount ?? orderCoursesTotal(order) + orderPackagesTotal(order));
}

function orderSubtotal(order) {
  return Number(order.subtotal ?? orderCoursesTotal(order) + orderPackagesTotal(order));
}

function orderDiscountAmount(order) {
  return Number(order.discountAmount || 0);
}

function formatSubmissionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function wordsUnderThousand(value) {
  const ones = [
    'Zero',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (value < 20) return ones[value];
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ''}`;
  return `${ones[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${wordsUnderThousand(value % 100)}` : ''}`;
}

function numberToWords(value) {
  const amount = Math.max(0, Math.floor(Number(value || 0)));
  if (!amount) return 'Zero';
  const units = [
    [1000000000, 'Billion'],
    [1000000, 'Million'],
    [1000, 'Thousand'],
  ];
  let remainder = amount;
  const parts = [];

  units.forEach(([unitValue, unitName]) => {
    const count = Math.floor(remainder / unitValue);
    if (count) {
      parts.push(`${wordsUnderThousand(count)} ${unitName}`);
      remainder %= unitValue;
    }
  });

  if (remainder) parts.push(wordsUnderThousand(remainder));
  return parts.join(' ');
}

function amountInWords(value) {
  return `${numberToWords(value)} FCFA Only`;
}

function emailIconCircle(label, color, background) {
  return `<span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:${background};color:${color};font-size:19px;line-height:34px;text-align:center;font-weight:700">${label}</span>`;
}

function cardTitleHtml({ icon, title, color, background }) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr>
        <td width="42" valign="middle" style="width:42px">${emailIconCircle(icon, color, background)}</td>
        <td valign="middle" style="font-size:15px;line-height:20px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0">${title}</td>
      </tr>
    </table>`;
}

function emailCard({ titleHtml, bodyHtml, background = '#FFFFFF' }) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:${background};border:1px solid #E5E7EB;border-radius:14px;box-shadow:0 8px 25px rgba(0,0,0,0.06)">
      <tr>
        <td style="padding:22px">${titleHtml}${bodyHtml}</td>
      </tr>
    </table>`;
}

function fieldRowsHtml(rows) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px">
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #EEF1F5;color:#6B7280;font-size:14px;line-height:20px">${escapeHtml(label)}</td>
              <td align="right" style="padding:8px 0;border-bottom:1px solid #EEF1F5;color:#111827;font-size:14px;line-height:20px;font-weight:700">${safeEmailText(value)}</td>
            </tr>`,
        )
        .join('')}
    </table>`;
}

function selectedCoursesCard(order) {
  const courses = order.courses || [];
  const rows = courses.length
    ? courses
        .map(
          (course) => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #EEF1F5;color:#111827;font-size:14px;line-height:20px">
                <span style="color:#1E2F97;font-weight:700">&#10003;</span>
                <span style="padding-left:8px">${safeEmailText(courseTitle(course))}</span>
              </td>
              <td align="right" style="padding:10px 0;border-bottom:1px solid #EEF1F5;color:#111827;font-size:14px;line-height:20px;font-weight:700">${escapeHtml(formatXaf(coursePrice(course)))}</td>
            </tr>`,
        )
        .join('')
    : `<tr><td colspan="2" style="padding:14px 0;color:#5F5F5F;font-size:14px;line-height:20px">No individual course selected.</td></tr>`;

  return emailCard({
    titleHtml: cardTitleHtml({ icon: '&#128214;', title: 'Selected Courses', color: '#1E2F97', background: '#E8EEFF' }),
    bodyHtml: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px">
        ${rows}
        <tr>
          <td style="padding:16px 0 0;color:#6B7280;font-size:14px;line-height:20px;font-weight:700">Subtotal (Courses)</td>
          <td align="right" style="padding:16px 0 0;color:#1E2F97;font-size:16px;line-height:22px;font-weight:700">${escapeHtml(formatXaf(orderCoursesTotal(order)))}</td>
        </tr>
      </table>`,
  });
}

function packageIncludesHtml(item) {
  const included = packageCourses(item);
  if (!included.length) return '<p style="margin:10px 0 0;color:#5F5F5F;font-size:14px;line-height:20px">No package items listed.</p>';

  const rows = [];
  for (let index = 0; index < included.length; index += 2) {
    rows.push([included[index], included[index + 1]]);
  }

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px">
      ${rows
        .map(
          ([left, right]) => `
            <tr>
              <td width="50%" style="padding:5px 8px 5px 0;color:#374151;font-size:14px;line-height:19px">
                <span style="color:#D30D1A;font-weight:700">&#10003;</span>
                <span style="padding-left:7px">${safeEmailText(left)}</span>
              </td>
              <td width="50%" style="padding:5px 0 5px 8px;color:#374151;font-size:14px;line-height:19px">
                ${
                  right
                    ? `<span style="color:#D30D1A;font-weight:700">&#10003;</span><span style="padding-left:7px">${safeEmailText(right)}</span>`
                    : '&nbsp;'
                }
              </td>
            </tr>`,
        )
        .join('')}
    </table>`;
}

function selectedPackageCard(order) {
  const packages = order.packages || [];
  const packagesHtml = packages.length
    ? packages
        .map(
          (item, index) => `
            <div style="${index ? 'border-top:1px solid #EEF1F5;margin-top:18px;padding-top:18px' : 'margin-top:14px'}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
                <tr>
                  <td style="color:#111827;font-size:16px;line-height:22px;font-weight:700">${safeEmailText(packageName(item))}</td>
                  <td align="right"><span style="display:inline-block;background:#FFE5EC;color:#D30D1A;border-radius:7px;padding:5px 8px;font-size:12px;line-height:14px;font-weight:700;text-transform:uppercase">${safeEmailText(packageDuration(item))}</span></td>
                </tr>
              </table>
              <p style="margin:14px 0 0;color:#6B7280;font-size:14px;line-height:20px;font-weight:700">Includes:</p>
              ${packageIncludesHtml(item)}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #E5E7EB;margin-top:16px">
                <tr>
                  <td style="padding-top:14px;color:#6B7280;font-size:14px;line-height:20px;font-weight:700">Package Price</td>
                  <td align="right" style="padding-top:14px;color:#D30D1A;font-size:16px;line-height:22px;font-weight:700">${escapeHtml(formatXaf(packagePrice(item)))}</td>
                </tr>
              </table>
            </div>`,
        )
        .join('')
    : '<p style="margin:14px 0 0;color:#5F5F5F;font-size:14px;line-height:20px">No package selected.</p>';

  return emailCard({
    titleHtml: cardTitleHtml({ icon: '&#127873;', title: 'Selected Package', color: '#D30D1A', background: '#FFE5EC' }),
    bodyHtml: packagesHtml,
  });
}

function studentInformationCard(order) {
  return emailCard({
    titleHtml: cardTitleHtml({ icon: '&#128100;', title: 'Student Information', color: '#1E2F97', background: '#E8EEFF' }),
    bodyHtml: fieldRowsHtml([
      ['Name', order.name],
      ['Email', order.email],
      ['Phone', order.phone],
      ['Learning Mode', order.mode],
      ['Payment Method', order.paymentMethod],
      ['Enrollment Date', formatSubmissionDate(order.createdAt)],
    ]),
  });
}

function adminDetailsCard(order) {
  return emailCard({
    titleHtml: cardTitleHtml({ icon: '&#128196;', title: 'Request Details', color: '#1E2F97', background: '#E8EEFF' }),
    bodyHtml: fieldRowsHtml([
      ['Order ID', order.id],
      ['Date Submitted', formatSubmissionDate(order.createdAt)],
      ['Payment Method', order.paymentMethod],
      ['Notes', order.notes],
    ]),
  });
}

function totalAmountCard(order) {
  const total = orderGrandTotal(order);
  const subtotal = orderSubtotal(order);
  const discountAmount = orderDiscountAmount(order);
  const discountCode = order.discountCode || 'None';
  return emailCard({
    background: '#F0FFF4',
    titleHtml: cardTitleHtml({ icon: '&#128176;', title: 'Total Amount', color: '#1B5E20', background: '#D6F7DE' }),
    bodyHtml: `
      ${fieldRowsHtml([
        ['Subtotal', formatXaf(subtotal)],
        ['Discount Code', discountCode],
        ['Discount', `-${formatXaf(discountAmount)}`],
      ])}
      <div style="text-align:center;margin-top:18px;color:#1B5E20;font-size:32px;line-height:38px;font-weight:700">${escapeHtml(formatXaf(total))}</div>
      <div style="border-top:1px solid #D9EBDD;margin-top:14px;padding-top:12px;text-align:center;color:#1B5E20;font-size:14px;line-height:20px;font-weight:700">${escapeHtml(amountInWords(total))}</div>`,
  });
}

function twoColumnRow(leftHtml, rightHtml) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr>
        <td class="hiklass-email-column hiklass-email-column-pad" width="50%" valign="top" style="width:50%;padding:0 8px 16px 0">${leftHtml}</td>
        <td class="hiklass-email-column hiklass-email-column-pad" width="50%" valign="top" style="width:50%;padding:0 0 16px 8px">${rightHtml}</td>
      </tr>
    </table>`;
}

function emailHero(title, subtitle) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1E2F97" style="border-collapse:separate;background:#1E2F97;background-image:linear-gradient(135deg,#1E2F97,#2554A5);border-radius:14px;overflow:hidden">
      <tr>
        <td width="92" valign="middle" style="padding:26px 0 26px 28px;width:92px">
          <div style="width:56px;height:56px;border-radius:50%;background:#FFFFFF;color:#1E2F97;font-size:34px;line-height:56px;text-align:center;font-weight:700">&#10003;</div>
          <div style="width:70px;height:2px;background:#D30D1A;margin-top:14px;font-size:0;line-height:2px">&nbsp;</div>
        </td>
        <td valign="middle" style="padding:26px 18px 26px 0;color:#FFFFFF">
          <h1 class="hiklass-email-hero-title" style="margin:0;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;font-weight:700;letter-spacing:0">${escapeHtml(title)}</h1>
          <p style="margin:8px 0 0;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:24px;font-weight:400">${escapeHtml(subtitle)}</p>
          <div style="width:70px;height:2px;background:#D30D1A;margin-top:15px;font-size:0;line-height:2px">&nbsp;</div>
        </td>
        <td class="hiklass-email-hero-art" width="160" align="center" valign="middle" style="padding:20px 24px 20px 0;width:160px;color:#FFFFFF">
          <div style="font-size:48px;line-height:54px">&#128187;</div>
          <div style="font-size:34px;line-height:38px">&#127891;</div>
        </td>
      </tr>
    </table>`;
}

function ctaBlock({
  icon = '&#128203;',
  label = 'ENROLLMENT RECEIVED',
  message = 'You will receive another email once our team reviews your request.',
} = {}) {
  return `
    <table role="presentation" align="center" width="320" cellpadding="0" cellspacing="0" class="hiklass-email-cta" style="border-collapse:separate;width:320px;margin:2px auto 0">
      <tr>
        <td align="center" bgcolor="#D30D1A" style="background:#D30D1A;border-radius:8px;padding:14px 18px;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:22px;font-weight:700;text-transform:uppercase">
          ${icon}&nbsp;&nbsp;${escapeHtml(label)}
        </td>
      </tr>
    </table>
    <p style="margin:14px 0 0;text-align:center;color:#4B5563;font-size:13px;line-height:20px">${escapeHtml(message)}</p>`;
}

function assistanceStrip() {
  const { whatsappPngPath } = emailLogoAssets();
  const whatsappIcon = whatsappPngPath
    ? `<img src="cid:${EMAIL_WHATSAPP_PNG_CID}" width="34" height="34" alt="WhatsApp" style="display:block;width:34px;height:34px;border-radius:50%;border:0;outline:none;text-decoration:none">`
    : '<span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:#1B5E20;color:#FFFFFF;font-size:20px;line-height:34px;text-align:center;font-weight:700">W</span>';
  const whatsappMessage = encodeURIComponent('Hi HIKLASS Academy, I need assistance.');
  const primaryWhatsAppLink = `https://wa.me/${WHATSAPP_PRIMARY}?text=${whatsappMessage}`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F3F7FF" style="border-collapse:separate;background:#F3F7FF;border-radius:8px;margin-top:34px">
      <tr>
        <td class="hiklass-contact-column" width="30%" valign="middle" style="padding:18px 14px;border-right:1px solid #CBD5E1">
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            <tr>
              <td width="46">${emailIconCircle('&#127911;', '#1E2F97', '#DCEBFF')}</td>
              <td style="padding-left:10px;color:#1E2F97;font-size:14px;line-height:18px;font-weight:700">NEED<br>ASSISTANCE?</td>
            </tr>
          </table>
        </td>
        <td class="hiklass-contact-column" width="32%" valign="top" style="padding:18px 14px;border-right:1px solid #CBD5E1">
          <a href="${primaryWhatsAppLink}" style="color:#1B5E20;font-size:14px;line-height:18px;font-weight:700;text-decoration:none">WhatsApp</a>
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:5px">
            <tr>
              <td width="34" valign="top"><a href="${primaryWhatsAppLink}" style="text-decoration:none">${whatsappIcon}</a></td>
              <td style="padding-left:8px;white-space:nowrap;color:#111827;font-size:13px;line-height:18px;font-weight:700">
                <a href="${primaryWhatsAppLink}" style="color:#111827;text-decoration:none;white-space:nowrap">+237 651 251 941</a>
              </td>
            </tr>
          </table>
        </td>
        <td class="hiklass-contact-column" width="38%" valign="top" style="padding:18px 14px">
          <div style="color:#1E2F97;font-size:14px;line-height:18px;font-weight:700">&#9716;&nbsp;&nbsp;Office Hours</div>
          <div style="margin-top:8px;color:#111827;font-size:13px;line-height:18px">Mon - Sat: 8:00 AM - 6:00 PM<br>Sunday: Closed</div>
        </td>
      </tr>
    </table>`;
}

function footerBlock() {
  const socialIcons = `<span style="display:inline-block;color:#1E2F97;font-size:13px;line-height:18px;font-weight:700">Facebook &nbsp; Instagram &nbsp; LinkedIn &nbsp; YouTube &nbsp; WhatsApp</span>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:22px;border-top:1px solid #E5E7EB">
      <tr>
        <td align="center" style="padding-top:18px">
          <div style="color:#1E2F97;font-size:20px;line-height:24px;font-weight:700">HIKLASS Academy</div>
          <div style="color:#374151;font-size:14px;line-height:20px">Experience <span style="color:#D30D1A">Brighter</span> Success</div>
          <div style="margin-top:10px"><a href="https://hiklassacademy.com" style="color:#0149CA;font-size:13px;line-height:18px;font-weight:700;text-decoration:none">www.hiklassacademy.com</a></div>
          <div style="margin-top:14px">${socialIcons}</div>
          <div style="margin-top:14px;color:#6B7280;font-size:12px;line-height:18px">&copy; 2026 HIKLASS Digital Agency. All Rights Reserved.</div>
        </td>
      </tr>
    </table>`;
}

function getClientBaseUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
}

async function findStudentAccountByEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  if (!normalized) return null;
  const accounts = await readJsonFile('student-accounts');
  return accounts.find((account) => String(account.email || '').trim().toLowerCase() === normalized) || null;
}

function dashboardCtaBlock({ hasAccount, clientUrl = getClientBaseUrl() } = {}) {
  const dashboardUrl = `${clientUrl}/student/dashboard`;
  const signupUrl = `${clientUrl}/student/register`;
  const loginUrl = `${clientUrl}/student/login`;

  const primaryUrl = hasAccount ? dashboardUrl : signupUrl;
  const primaryLabel = hasAccount ? 'Go to My Dashboard' : 'Create Your Student Account';

  return `
    <table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:26px 0 0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate">
            <tr>
              <td align="center" bgcolor="#1E2F97" style="background:#1E2F97;border-radius:9px">
                <a href="${primaryUrl}" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:700;text-decoration:none">${escapeHtml(primaryLabel)} &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 0;text-align:center;color:#6B7280;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px">
      ${hasAccount
        ? 'Track your courses, join video calls, and message your instructors &mdash; all in one place.'
        : `Already have a student account? <a href="${loginUrl}" style="color:#0149CA;font-weight:700;text-decoration:none">Log in here</a>.`}
    </p>`;
}

function emailShell({ heroTitle, heroSubtitle, greeting, intro, contentHtml, ctaIcon, ctaLabel, ctaMessage, extraHtml = '' }) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${emailResponsiveStyles()}
      </head>
      <body style="margin:0;padding:0;background:#F4F7FB;color:#2B2B2B">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(heroSubtitle)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F4F7FB" style="border-collapse:collapse;background:#F4F7FB">
          <tr>
            <td align="center" style="padding:28px 12px">
              <table role="presentation" width="700" cellpadding="0" cellspacing="0" style="border-collapse:separate;width:700px;max-width:100%;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(17,24,39,0.10)">
                <tr>
                  <td>
                    ${emailLogoHeader()}
                    <div class="hiklass-email-body" style="padding:28px">
                      ${emailHero(heroTitle, heroSubtitle)}
                      <h2 style="margin:22px 0 0;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:26px;font-weight:700">${greeting}</h2>
                      <p style="margin:14px 0 20px;color:#4B5563;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;font-weight:400">${intro}</p>
                      ${contentHtml}
                      ${ctaBlock({ icon: ctaIcon, label: ctaLabel, message: ctaMessage })}
                      ${extraHtml}
                      ${assistanceStrip()}
                      ${footerBlock()}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
}

function enrichOrder(order) {
  const enrichedCourses = (order.courses || []).map((course) => ({
    title: courseTitle(course),
    price: coursePrice(course),
  }));
  const enrichedPackages = (order.packages || []).map((item) => ({
    name: packageName(item),
    price: packagePrice(item),
    duration: packageDuration(item),
    courses: packageCourses(item),
  }));

  return {
    ...order,
    courses: enrichedCourses,
    packages: enrichedPackages,
    totalAmount: Number(
      order.totalAmount ||
        enrichedCourses.reduce((sum, course) => sum + course.price, 0) +
          enrichedPackages.reduce((sum, item) => sum + item.price, 0),
    ),
  };
}

function studentTemplate(order, { hasAccount = false } = {}) {
  return emailShell({
    heroTitle: 'Enrollment Request Received',
    heroSubtitle: 'Thank you for choosing HIKLASS Academy.',
    greeting: `Hello <span style="color:#1E2F97">${safeEmailText(order.name)}</span>,`,
    intro: ORDER_EMAIL_INTRO,
    contentHtml: `
      ${twoColumnRow(selectedCoursesCard(order), selectedPackageCard(order))}
      ${twoColumnRow(studentInformationCard(order), totalAmountCard(order))}`,
    extraHtml: dashboardCtaBlock({ hasAccount }),
  });
}

function adminTemplate(order) {
  return emailShell({
    heroTitle: 'New Course Enrollment Request',
    heroSubtitle: 'A new HIKLASS Academy enrollment request has been submitted.',
    greeting: `Hello <span style="color:#1E2F97">HIKLASS Admin</span>,`,
    intro: 'Review the student details, selected learning options, notes, and payment total below.',
    contentHtml: `
      ${twoColumnRow(selectedCoursesCard(order), selectedPackageCard(order))}
      ${twoColumnRow(studentInformationCard(order), adminDetailsCard(order))}
      ${twoColumnRow(totalAmountCard(order), emailCard({
        titleHtml: cardTitleHtml({ icon: '&#128221;', title: 'Admin Summary', color: '#D30D1A', background: '#FFE5EC' }),
        bodyHtml: fieldRowsHtml([
          ['Courses Total', formatXaf(orderCoursesTotal(order))],
          ['Packages Total', formatXaf(orderPackagesTotal(order))],
          ['Subtotal', formatXaf(orderSubtotal(order))],
          ['Discount Code', order.discountCode || 'None'],
          ['Discount', `-${formatXaf(orderDiscountAmount(order))}`],
          ['Grand Total', formatXaf(orderGrandTotal(order))],
          ['Payment Method', order.paymentMethod || 'Not provided'],
        ]),
      }))}`,
  });
}

function enrollmentStatusTemplate(order) {
  const status = order.status || 'Pending';
  return emailShell({
    heroTitle: 'Enrollment Status Updated',
    heroSubtitle: `Your HIKLASS Academy enrollment is now ${status}.`,
    greeting: `Hello <span style="color:#1E2F97">${safeEmailText(order.name)}</span>,`,
    intro:
      'This is a quick update from HIKLASS Academy about your course enrollment request. Please review the latest status below.',
    ctaIcon: '&#128276;',
    ctaLabel: `STATUS: ${status}`,
    ctaMessage: `Your enrollment status has been updated to ${status}. HIKLASS Academy will contact you if any further action is required.`,
    contentHtml: `
      ${twoColumnRow(emailCard({
        titleHtml: cardTitleHtml({ icon: '&#128276;', title: 'Latest Status', color: '#1E2F97', background: '#E8EEFF' }),
        bodyHtml: fieldRowsHtml([
          ['Enrollment ID', order.id || 'Not provided'],
          ['Current Status', status],
          ['Updated At', formatSubmissionDate(order.statusUpdatedAt || new Date().toISOString())],
          ['Payment Method', order.paymentMethod || 'Not provided'],
        ]),
      }), totalAmountCard(order))}
      ${twoColumnRow(selectedCoursesCard(order), selectedPackageCard(order))}`,
  });
}

function orderPlainText(order, heading = 'Enrollment Request Received', hasAccount = null) {
  const courseLines = (order.courses || []).map((course) => `- ${courseTitle(course)}: ${formatXaf(coursePrice(course))}`);
  const packageLines = (order.packages || []).map((item) => `- ${packageName(item)} (${packageDuration(item)}): ${formatXaf(packagePrice(item))}`);
  const clientUrl = getClientBaseUrl();
  const dashboardLines =
    hasAccount === null
      ? []
      : hasAccount
        ? ['', `Go to your dashboard: ${clientUrl}/student/dashboard`]
        : ['', `Create your student account: ${clientUrl}/student/register`, `Already have an account? Log in: ${clientUrl}/student/login`];

  return [
    `HIKLASS Academy - ${heading}`,
    '',
    ORDER_EMAIL_INTRO,
    '',
    `Student: ${order.name || 'Not provided'}`,
    `Email: ${order.email || 'Not provided'}`,
    `Phone: ${order.phone || 'Not provided'}`,
    `Learning mode: ${order.mode || 'Not provided'}`,
    `Payment method: ${order.paymentMethod || 'Not provided'}`,
    '',
    'Selected courses:',
    courseLines.length ? courseLines.join('\n') : '- No individual course selected.',
    '',
    'Selected packages:',
    packageLines.length ? packageLines.join('\n') : '- No package selected.',
    '',
    `Subtotal: ${formatXaf(orderSubtotal(order))}`,
    `Discount code: ${order.discountCode || 'None'}`,
    `Discount: -${formatXaf(orderDiscountAmount(order))}`,
    `Grand total: ${formatXaf(orderGrandTotal(order))}`,
    ...dashboardLines,
    '',
    'Need assistance? WhatsApp +237 651 251 941 or email info@hiklassacademy.com.',
  ].join('\n');
}

function enrollmentStatusPlainText(order) {
  const status = order.status || 'Pending';
  return [
    `HIKLASS Academy - Enrollment Status Updated`,
    '',
    `Hello ${order.name || 'Student'},`,
    `Your enrollment status is now ${status}.`,
    `Enrollment ID: ${order.id || 'Not provided'}`,
    `Updated at: ${formatSubmissionDate(order.statusUpdatedAt || new Date().toISOString())}`,
    '',
    orderPlainText(order, 'Enrollment Details'),
  ].join('\n');
}

async function sendOrderEmails(order) {
  const logoAttachments = emailLogoAttachments();
  const studentSubject = '🎉 Welcome to HIKLASS Academy';
  const existingAccount = await findStudentAccountByEmail(order.email);
  const hasAccount = Boolean(existingAccount);
  const studentResult = await sendEnrollmentConfirmation({
    to: order.email,
    subject: studentSubject,
    text: orderPlainText(order, 'Enrollment Request Received', hasAccount),
    html: studentTemplate(order, { hasAccount }),
    attachments: logoAttachments,
  });

  if (!studentResult.success) {
    await recordEmailDelivery({
      id: `${order.id}-student`,
      recipient: order.email,
      subject: studentSubject,
      status: 'Failed',
      errorMessage: explainSmtpError(studentResult.error, studentResult.error?.smtpLastConfig),
    });
    throw studentResult.error;
  }

  await recordEmailDelivery({
    id: `${order.id}-student`,
    recipient: order.email,
    subject: studentSubject,
    status: 'Sent',
  });

  let adminEmailSent = false;
  const warnings = [];
  const adminSubject = `📥 New Enrollment Received - ${order.name}`;

  const adminResult = await sendAdminNotification({
    to: ADMIN_EMAIL,
    replyTo: order.email,
    subject: adminSubject,
    text: orderPlainText(order, 'New Course Enrollment Request'),
    html: adminTemplate(order),
    attachments: logoAttachments,
  });

  if (adminResult.success) {
    adminEmailSent = true;
    await recordEmailDelivery({
      id: `${order.id}-admin`,
      recipient: ADMIN_EMAIL,
      subject: adminSubject,
      status: 'Sent',
    });
  } else {
    const warning = `admin: ${explainSmtpError(adminResult.error, adminResult.error?.smtpLastConfig)}`;
    warnings.push(warning);
    console.warn('Partial email delivery failure:', warning);
    await recordEmailDelivery({
      id: `${order.id}-admin`,
      recipient: ADMIN_EMAIL,
      subject: adminSubject,
      status: 'Failed',
      errorMessage: explainSmtpError(adminResult.error, adminResult.error?.smtpLastConfig),
    });
  }

  return {
    studentEmailSent: Boolean(studentResult.info),
    adminEmailSent,
    warnings,
  };
}

async function sendEnrollmentStatusEmail(order) {
  const smtp = await createVerifiedTransporter();
  if (!smtp?.transporter) {
    throw new Error('SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to server/.env.');
  }

  const { transporter, config } = smtp;
  const from = config.from;
  try {
    const info = await withTimeout(
      transporter.sendMail({
        from,
        to: order.email,
        subject: `HIKLASS Enrollment Status Updated: ${order.status}`,
        text: enrollmentStatusPlainText(order),
        html: enrollmentStatusTemplate(order),
        attachments: emailLogoAttachments(),
      }),
      smtpTimeoutMs(),
      'SMTP timed out before status email delivery completed.',
    );

    return {
      statusEmailSent: true,
      messageId: info.messageId,
    };
  } finally {
    transporter.close();
  }
}

app.get('/api/health', async (_req, res) => {
  let databaseStatus = 'Connected';
  try {
    await fsp.access(DATA_DIR);
  } catch {
    databaseStatus = 'Disconnected';
  }

  const smtpConfigured = hasSmtpConfig();
  let smtpStatus = 'Not Configured';
  if (smtpConfigured) {
    try {
      const { transporter } = await createVerifiedTransporter();
      transporter?.close();
      smtpStatus = 'Connected';
    } catch {
      smtpStatus = 'Disconnected';
    }
  }

  res.json({
    success: true,
    smtp: smtpStatus,
    database: databaseStatus,
    server: 'Running',
  });
});

app.get('/api/test-email', testEmailLimiter, async (req, res) => {
  const recipient = cleanText(req.query.to, 180) || smtpConfig().user;
  if (!isEmail(recipient)) {
    res.status(400).json({ success: false, message: 'Provide a valid recipient via ?to=you@example.com or configure SMTP_USER.' });
    return;
  }

  const sentAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const result = await sendEmail(
    {
      to: recipient,
      subject: '✅ HIKLASS Academy SMTP Test',
      html: testEmailTemplate({ recipient, sentAt }),
      text: `SMTP Working Successfully. Sent to ${recipient} at ${sentAt}.`,
    },
    'test email',
  );

  if (!result.success) {
    res.status(502).json({ success: false, message: explainSmtpError(result.error, result.error?.smtpLastConfig) });
    return;
  }

  res.json({ success: true, message: 'SMTP Working Successfully' });
});

app.get('/api/email/status', emailStatusLimiter, async (_req, res) => {
  if (!hasSmtpConfig()) {
    res.status(503).json({
      configured: false,
      reachable: false,
      message: 'SMTP is not configured.',
    });
    return;
  }

  try {
    const { transporter, config } = await createVerifiedTransporter();
    try {
      // createVerifiedTransporter already verified the connection.
    } finally {
      transporter?.close();
    }
    res.json({
      configured: true,
      reachable: true,
      authenticated: true,
      host: config.host,
      port: config.port,
      secure: config.secure,
      message: 'SMTP is reachable and authentication succeeded.',
    });
  } catch (error) {
    const config = error.smtpLastConfig || smtpConfig();
    res.status(503).json({
      configured: true,
      reachable: false,
      authenticated: false,
      host: config.host,
      port: config.port,
      secure: config.secure,
      attemptedHosts: error.smtpAttempts || [],
      message: explainSmtpError(error, config),
      code: error.code || 'SMTP_UNREACHABLE',
    });
  }
});

app.post('/api/admin/auth/login', adminAuthLimiter, async (req, res) => {
  const email = cleanText(req.body?.email, 180).toLowerCase();
  const password = String(req.body?.password || '');
  const rememberMe = Boolean(req.body?.rememberMe);
  const configuredPassword = ADMIN_PASSWORD || ADMIN_TOKEN;
  const acceptedEmails = new Set([
    ADMIN_LOGIN_EMAIL.toLowerCase(),
    ADMIN_EMAIL.toLowerCase(),
    'admin@hiklassacademy.com',
  ]);

  if (!ADMIN_TOKEN) {
    res.status(503).json({ message: 'Admin access is not configured. Set ADMIN_TOKEN in server/.env.' });
    return;
  }

  if (!configuredPassword) {
    res.status(503).json({ message: 'Admin login is not configured. Set ADMIN_PASSWORD or ADMIN_TOKEN in server/.env.' });
    return;
  }

  if (!acceptedEmails.has(email) || password !== configuredPassword) {
    res.status(401).json({ message: 'Invalid admin email or password.' });
    return;
  }

  await recordActivity('Admin login', email, rememberMe ? 'Remembered session' : 'Browser session');
  res.json({
    token: ADMIN_TOKEN,
    tokenType: 'AdminToken',
    user: {
      name: 'Admin',
      email: ADMIN_LOGIN_EMAIL,
      role: 'Super Admin',
    },
  });
});

app.post('/api/admin/auth/change-password', requireAdmin, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  const confirmPassword = String(req.body?.confirmPassword || '');
  const configuredPassword = ADMIN_PASSWORD || ADMIN_TOKEN;

  if (!configuredPassword) {
    res.status(503).json({ message: 'Admin password is not configured.' });
    return;
  }

  if (!currentPassword) {
    res.status(400).json({ message: 'Current password is required.' });
    return;
  }

  if (currentPassword !== configuredPassword) {
    res.status(401).json({ message: 'Current password is incorrect.' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ message: 'New password must be at least 8 characters.' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ message: 'Passwords do not match.' });
    return;
  }

  if (newPassword === currentPassword) {
    res.status(400).json({ message: 'New password must be different from the current password.' });
    return;
  }

  try {
    await updateEnvValue('ADMIN_PASSWORD', newPassword);
    ADMIN_PASSWORD = newPassword;
    await recordActivity('Changed admin password', ADMIN_LOGIN_EMAIL, 'Password updated');
    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Admin password update failed:', error);
    res.status(500).json({ message: 'Password change failed.' });
  }
});

app.post('/api/discounts/validate', async (req, res) => {
  const selectedCourses = normalizeCourses(req.body?.selectedCourses || req.body?.courses);
  const selectedPackages = normalizePackages(req.body?.selectedPackages || req.body?.packages);
  const unknownCourses = Array.isArray(req.body?.selectedCourses || req.body?.courses)
    ? (req.body?.selectedCourses || req.body?.courses).map((course) => normalizeCourseTitle(course)).filter((title) => title && !COURSE_PRICES.has(title))
    : [];
  const unknownPackages = Array.isArray(req.body?.selectedPackages || req.body?.packages)
    ? (req.body?.selectedPackages || req.body?.packages).map((item) => normalizePackageKey(item)).filter((item) => item && !PACKAGE_CATALOG.has(item))
    : [];

  if (unknownCourses.length || unknownPackages.length) {
    res.status(400).json({ success: false, message: 'Invalid course or package selection.' });
    return;
  }

  try {
    const result = await calculateDiscount(req.body?.code, selectedCourses, selectedPackages);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message || 'Invalid or expired discount code',
        subtotal: result.subtotal,
        discountAmount: 0,
        grandTotal: result.subtotal,
      });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Discount validation failed:', error);
    res.status(500).json({ success: false, message: 'Could not validate discount code.' });
  }
});

function buildOrderStats(orders) {
  const courseCounts = new Map();
  const packageCounts = new Map();
  const modeCounts = new Map();
  const statusCounts = new Map([
    ['Pending', 0],
    ['Confirmed', 0],
    ['Paid', 0],
    ['Completed', 0],
    ['Cancelled', 0],
    ['Refunded', 0],
  ]);
  const enrichedOrders = orders.map(enrichOrder);

  for (const order of enrichedOrders) {
    modeCounts.set(order.mode, (modeCounts.get(order.mode) || 0) + 1);
    const status = allowedEnrollmentStatuses.has(order.status) ? order.status : 'Pending';
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    for (const course of order.courses || []) {
      courseCounts.set(course.title, (courseCounts.get(course.title) || 0) + 1);
    }
    for (const item of order.packages || []) {
      packageCounts.set(item.name, (packageCounts.get(item.name) || 0) + 1);
    }
  }

  const newestOrder = enrichedOrders.reduce((latest, order) => {
    if (!latest) return order;
    return new Date(order.createdAt) > new Date(latest.createdAt) ? order : latest;
  }, null);

  return {
    totalOrders: enrichedOrders.length,
    totalCourseSelections: enrichedOrders.reduce((sum, order) => sum + (order.courses?.length || 0), 0),
    totalPackageSelections: enrichedOrders.reduce((sum, order) => sum + (order.packages?.length || 0), 0),
    totalAmount: enrichedOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    newestOrderAt: newestOrder?.createdAt || null,
    courseCounts: Object.fromEntries([...courseCounts.entries()].sort((a, b) => b[1] - a[1])),
    packageCounts: Object.fromEntries([...packageCounts.entries()].sort((a, b) => b[1] - a[1])),
    modeCounts: Object.fromEntries([...modeCounts.entries()].sort((a, b) => b[1] - a[1])),
    statusCounts: Object.fromEntries(statusCounts.entries()),
  };
}

async function readAdminOrdersPayload() {
  const orders = await readOrders();
  const sortedOrders = orders.map(enrichOrder).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return {
    orders: sortedOrders,
    stats: buildOrderStats(orders),
    adminAuthConfigured: Boolean(ADMIN_TOKEN),
  };
}

app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  try {
    res.json(await readAdminOrdersPayload());
  } catch (error) {
    console.error('Admin order read failed:', error);
    res.status(500).json({ message: 'Could not load admin orders.' });
  }
});

app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  try {
    const orders = await readOrders();
    res.json(buildOrderStats(orders));
  } catch (error) {
    console.error('Admin stats read failed:', error);
    res.status(500).json({ message: 'Could not load admin stats.' });
  }
});

app.get('/api/admin/enrollments', requireAdmin, async (_req, res) => {
  try {
    res.json(await readAdminOrdersPayload());
  } catch (error) {
    console.error('Admin enrollment read failed:', error);
    res.status(500).json({ message: 'Could not load enrollments.' });
  }
});

app.patch('/api/admin/enrollments/:id/status', requireAdmin, async (req, res) => {
  const status = cleanText(req.body?.status, 30);
  if (!allowedEnrollmentStatuses.has(status)) {
    res.status(400).json({ message: 'Status must be Pending, Confirmed, Paid, Completed, Cancelled, or Refunded.' });
    return;
  }

  try {
    const orders = await readOrders();
    const index = orders.findIndex((order) => order.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Enrollment was not found.' });
      return;
    }

    orders[index] = {
      ...orders[index],
      status,
      statusUpdatedAt: new Date().toISOString(),
    };
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const tempFile = `${ORDERS_FILE}.tmp`;
    await fsp.writeFile(tempFile, `${JSON.stringify(orders, null, 2)}\n`, 'utf8');
    await fsp.rename(tempFile, ORDERS_FILE);
    const payments = await readJsonFile('payments');
    const paymentIndex = payments.findIndex((payment) => payment.enrollmentId === req.params.id || payment.id === `payment-${req.params.id}`);
    if (paymentIndex !== -1) {
      payments[paymentIndex] = {
        ...payments[paymentIndex],
        status: status === 'Paid' ? 'Paid' : status === 'Cancelled' ? 'Cancelled' : payments[paymentIndex].status,
        updatedAt: new Date().toISOString(),
      };
      await writeJsonFile('payments', payments);
    }
    const updatedOrder = enrichOrder(orders[index]);
    let statusEmail = { sent: false, error: '' };
    try {
      await sendEnrollmentStatusEmail(updatedOrder);
      statusEmail = { sent: true, error: '' };
      await recordActivity('Sent enrollment status email', req.params.id, `${updatedOrder.email} notified: ${status}`);
    } catch (emailError) {
      statusEmail = { sent: false, error: explainSmtpError(emailError) };
      console.error('Enrollment status email failed:', statusEmail.error);
      await recordActivity('Enrollment status email failed', req.params.id, statusEmail.error);
    }

    await recordActivity('Updated enrollment status', req.params.id, `Status changed to ${status}`);
    res.json({
      enrollment: updatedOrder,
      stats: buildOrderStats(orders),
      statusEmailSent: statusEmail.sent,
      statusEmailError: statusEmail.error,
    });
  } catch (error) {
    console.error('Admin enrollment status update failed:', error);
    res.status(500).json({ message: 'Could not update enrollment status.' });
  }
});

app.get('/api/courses', async (_req, res) => {
  try {
    const stored = await readJsonFile('courses');
    const list = (stored.length ? stored : defaultAdminCourses())
      .filter((course) => course.status !== 'Inactive')
      .map((course) => ({
        title: course.title,
        price: Number(course.price) || 0,
        duration: course.duration || '',
        category: course.category || '',
        image: course.image || '',
      }));
    res.json({ courses: list });
  } catch (error) {
    console.error('Public courses read failed:', error);
    res.status(500).json({ message: 'Could not load courses.' });
  }
});

function courseInstructorName(instructors, targetCourseTitle) {
  const match = instructors.find((inst) => (Array.isArray(inst.courses) ? inst.courses : []).includes(targetCourseTitle));
  return match?.name || '';
}

async function syncInstructorCourseLink(targetCourseTitle, instructorName) {
  const instructors = await readJsonFile('instructors');
  let changed = false;
  for (const inst of instructors) {
    const courses = Array.isArray(inst.courses) ? inst.courses : [];
    const has = courses.includes(targetCourseTitle);
    const shouldHave = Boolean(instructorName) && inst.name === instructorName;
    if (shouldHave && !has) { inst.courses = [...courses, targetCourseTitle]; changed = true; }
    else if (!shouldHave && has) { inst.courses = courses.filter((c) => c !== targetCourseTitle); changed = true; }
  }
  if (changed) await writeJsonFile('instructors', instructors);
}

app.get('/api/admin/courses', requireAdmin, async (_req, res) => {
  try {
    const stored = await readJsonFile('courses');
    const courses = stored.length ? stored : defaultAdminCourses();
    const instructors = await readJsonFile('instructors');
    const withInstructor = courses.map((c) => ({ ...c, instructorName: courseInstructorName(instructors, c.title) }));
    res.json({ courses: withInstructor });
  } catch (error) {
    console.error('Admin courses read failed:', error);
    res.status(500).json({ message: 'Could not load courses.' });
  }
});

app.post('/api/admin/courses', requireAdmin, async (req, res) => {
  try {
    const { instructorName, ...rest } = req.body || {};
    const courses = await readCoursesForAdminWrite();
    const course = {
      id: `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...rest,
    };
    courses.push(course);
    await writeJsonFile('courses', courses);
    await refreshCoursePriceCache();
    if (instructorName !== undefined) await syncInstructorCourseLink(course.title, instructorName);
    res.status(201).json({ course: { ...course, instructorName: instructorName || '' } });
  } catch (error) {
    console.error('Admin course create failed:', error);
    res.status(500).json({ message: 'Could not create course.' });
  }
});

app.put('/api/admin/courses/:id', requireAdmin, async (req, res) => {
  try {
    const { instructorName, ...rest } = req.body || {};
    const courses = await readCoursesForAdminWrite();
    const index = courses.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Course not found.' });
      return;
    }
    courses[index] = { ...courses[index], ...rest, id: req.params.id, updatedAt: new Date().toISOString() };
    await writeJsonFile('courses', courses);
    await refreshCoursePriceCache();
    if (instructorName !== undefined) await syncInstructorCourseLink(courses[index].title, instructorName);
    const instructors = await readJsonFile('instructors');
    res.json({ course: { ...courses[index], instructorName: courseInstructorName(instructors, courses[index].title) } });
  } catch (error) {
    console.error('Admin course update failed:', error);
    res.status(500).json({ message: 'Could not update course.' });
  }
});

app.delete('/api/admin/courses/:id', requireAdmin, async (req, res) => {
  try {
    const courses = await readCoursesForAdminWrite();
    const index = courses.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Course not found.' });
      return;
    }
    const deleted = courses.splice(index, 1)[0];
    await writeJsonFile('courses', courses);
    await refreshCoursePriceCache();
    if (deleted.image) {
      const oldPath = path.join(COURSE_IMAGE_DIR, path.basename(deleted.image));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    res.json({ course: deleted });
  } catch (error) {
    console.error('Admin course delete failed:', error);
    res.status(500).json({ message: 'Could not delete course.' });
  }
});

app.post('/api/admin/courses/:id/image', requireAdmin, (req, res) => {
  uploadCourseImage.single('image')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File is too large. Maximum size is 4MB.' });
      return res.status(400).json({ message: err.message || 'File upload failed.' });
    }
    if (!req.file) { res.status(400).json({ message: 'No file provided.' }); return; }
    try {
      const courses = await readCoursesForAdminWrite();
      const index = courses.findIndex((c) => c.id === req.params.id);
      if (index === -1) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ message: 'Course not found.' });
        return;
      }
      if (courses[index].image) {
        const oldPath = path.join(COURSE_IMAGE_DIR, path.basename(courses[index].image));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      courses[index] = { ...courses[index], image: `/uploads/course-images/${req.file.filename}`, updatedAt: new Date().toISOString() };
      await writeJsonFile('courses', courses);
      res.json({ course: courses[index] });
    } catch (error) {
      console.error('Course image upload failed:', error);
      res.status(500).json({ message: 'Could not save the image.' });
    }
  });
});

app.delete('/api/admin/courses/:id/image', requireAdmin, async (req, res) => {
  try {
    const courses = await readCoursesForAdminWrite();
    const index = courses.findIndex((c) => c.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Course not found.' }); return; }
    if (courses[index].image) {
      const oldPath = path.join(COURSE_IMAGE_DIR, path.basename(courses[index].image));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    courses[index] = { ...courses[index], image: '' };
    await writeJsonFile('courses', courses);
    res.json({ course: courses[index] });
  } catch (error) {
    console.error('Course image remove failed:', error);
    res.status(500).json({ message: 'Could not remove the image.' });
  }
});

app.get('/api/admin/packages', requireAdmin, async (_req, res) => {
  try {
    const stored = await readJsonFile('packages');
    res.json({ packages: stored.length ? stored : defaultAdminPackages() });
  } catch (error) {
    console.error('Admin packages read failed:', error);
    res.status(500).json({ message: 'Could not load packages.' });
  }
});

app.post('/api/admin/packages', requireAdmin, async (req, res) => {
  try {
    const packages = await readPackagesForAdminWrite();
    const pkg = {
      id: `package-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...req.body,
    };
    packages.push(pkg);
    await writeJsonFile('packages', packages);
    res.status(201).json({ package: pkg });
  } catch (error) {
    console.error('Admin package create failed:', error);
    res.status(500).json({ message: 'Could not create package.' });
  }
});

app.put('/api/admin/packages/:id', requireAdmin, async (req, res) => {
  try {
    const packages = await readPackagesForAdminWrite();
    const index = packages.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Package not found.' });
      return;
    }
    packages[index] = { ...packages[index], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await writeJsonFile('packages', packages);
    res.json({ package: packages[index] });
  } catch (error) {
    console.error('Admin package update failed:', error);
    res.status(500).json({ message: 'Could not update package.' });
  }
});

app.delete('/api/admin/packages/:id', requireAdmin, async (req, res) => {
  try {
    const packages = await readPackagesForAdminWrite();
    const index = packages.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Package not found.' });
      return;
    }
    const deleted = packages.splice(index, 1)[0];
    await writeJsonFile('packages', packages);
    if (deleted.image) {
      const oldPath = path.join(PACKAGE_IMAGE_DIR, path.basename(deleted.image));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    res.json({ package: deleted });
  } catch (error) {
    console.error('Admin package delete failed:', error);
    res.status(500).json({ message: 'Could not delete package.' });
  }
});

app.post('/api/admin/packages/:id/image', requireAdmin, (req, res) => {
  uploadPackageImage.single('image')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File is too large. Maximum size is 4MB.' });
      return res.status(400).json({ message: err.message || 'File upload failed.' });
    }
    if (!req.file) { res.status(400).json({ message: 'No file provided.' }); return; }
    try {
      const packages = await readPackagesForAdminWrite();
      const index = packages.findIndex((p) => p.id === req.params.id);
      if (index === -1) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ message: 'Package not found.' });
        return;
      }
      if (packages[index].image) {
        const oldPath = path.join(PACKAGE_IMAGE_DIR, path.basename(packages[index].image));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      packages[index] = { ...packages[index], image: `/uploads/package-images/${req.file.filename}`, updatedAt: new Date().toISOString() };
      await writeJsonFile('packages', packages);
      res.json({ package: packages[index] });
    } catch (error) {
      console.error('Package image upload failed:', error);
      res.status(500).json({ message: 'Could not save the image.' });
    }
  });
});

app.delete('/api/admin/packages/:id/image', requireAdmin, async (req, res) => {
  try {
    const packages = await readPackagesForAdminWrite();
    const index = packages.findIndex((p) => p.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Package not found.' }); return; }
    if (packages[index].image) {
      const oldPath = path.join(PACKAGE_IMAGE_DIR, path.basename(packages[index].image));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    packages[index] = { ...packages[index], image: '' };
    await writeJsonFile('packages', packages);
    res.json({ package: packages[index] });
  } catch (error) {
    console.error('Package image remove failed:', error);
    res.status(500).json({ message: 'Could not remove the image.' });
  }
});

app.get('/api/packages', async (_req, res) => {
  try {
    const stored = await readJsonFile('packages');
    const list = (stored.length ? stored : defaultAdminPackages())
      .filter((item) => item.status !== 'Inactive')
      .map((item) => ({
        name: item.name,
        image: item.image || '',
      }));
    res.json({ packages: list });
  } catch (error) {
    console.error('Public packages read failed:', error);
    res.status(500).json({ message: 'Could not load packages.' });
  }
});

app.get('/api/admin/messages', requireAdmin, async (_req, res) => {
  const [orders, storedMessages] = await Promise.all([readOrders(), readJsonFile('messages')]);
  const orderMessages = orders
    .filter((order) => order.notes)
    .slice(-8)
    .reverse()
    .map((order) => ({
      id: order.id,
      name: order.name,
      email: order.email,
      message: order.notes,
      isRead: false,
      createdAt: order.createdAt,
    }));
  res.json({
    messages: [...storedMessages, ...orderMessages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  });
});

app.get('/api/admin/email-logs', requireAdmin, async (_req, res) => {
  const [orders, storedLogs] = await Promise.all([readOrders(), readJsonFile('email-logs')]);
  const storedIds = new Set(storedLogs.map((log) => log.id));
  res.json({
    logs: [
      ...storedLogs,
      ...orders
      .slice(-20)
      .reverse()
      .flatMap((order) => [
        {
          id: `${order.id}-student`,
          recipient: order.email,
          subject: 'Enrollment Request Received',
          status: 'Sent or attempted',
          date: order.createdAt,
          errorMessage: order.emailError || '',
        },
        {
          id: `${order.id}-admin`,
          recipient: ADMIN_EMAIL,
          subject: `New Course Enrollment Request from ${order.name}`,
          status: 'Sent or attempted',
          date: order.createdAt,
          errorMessage: order.emailError || '',
        },
      ])
      .filter((log) => !storedIds.has(log.id)),
    ],
  });
});

// ---- Admin CRUD routes for storage-backed entities ----

app.get('/api/admin/students', requireAdmin, async (_req, res) => {
  try {
    const students = await readJsonFile('students');
    const orders = await readOrders();
    const derived = deriveStudentsFromOrders(orders);
    res.json({
      students: mergeByKey(derived, students, (student) => student.email || student.phone || student.id),
    });
  } catch (error) {
    console.error('Admin students read failed:', error);
    res.status(500).json({ message: 'Could not load students.' });
  }
});

app.post('/api/admin/students', requireAdmin, async (req, res) => {
  try {
    const students = await readJsonFile('students');
    const student = {
      id: createAdminId('student'),
      createdAt: new Date().toISOString(),
      ...sanitizePayload(req.body, {
        name: { max: 120 },
        email: { max: 180 },
        phone: { max: 40 },
        mode: { max: 40 },
        courses: { type: 'array', max: 120 },
      }),
    };
    students.push(student);
    await writeJsonFile('students', students);
    await recordActivity('Created student', student.id, student.name);
    res.status(201).json({ student });
  } catch (error) {
    console.error('Admin student create failed:', error);
    res.status(500).json({ message: 'Could not create student.' });
  }
});

app.put('/api/admin/students/:id', requireAdmin, async (req, res) => {
  try {
    const students = await readJsonFile('students');
    const index = students.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      const student = {
        id: req.params.id,
        createdAt: new Date().toISOString(),
        ...req.body,
        updatedAt: new Date().toISOString(),
      };
      students.push(student);
      await writeJsonFile('students', students);
      await recordActivity('Created student from enrollment', req.params.id, student.name);
      res.json({ student });
      return;
    }
    students[index] = { ...students[index], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await writeJsonFile('students', students);
    await recordActivity('Updated student', req.params.id, students[index].name);
    res.json({ student: students[index] });
  } catch (error) {
    console.error('Admin student update failed:', error);
    res.status(500).json({ message: 'Could not update student.' });
  }
});

app.delete('/api/admin/students/:id', requireAdmin, async (req, res) => {
  try {
    const students = await readJsonFile('students');
    const index = students.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      await recordActivity('Dismissed derived student', req.params.id, '');
      res.json({ student: { id: req.params.id } });
      return;
    }
    const deleted = students.splice(index, 1)[0];
    await writeJsonFile('students', students);
    await recordActivity('Deleted student', req.params.id, deleted.name);
    res.json({ student: deleted });
  } catch (error) {
    console.error('Admin student delete failed:', error);
    res.status(500).json({ message: 'Could not delete student.' });
  }
});

// ---- Admin: student portal accounts (login accounts, not the enrollment CRM above) ----

app.get('/api/admin/student-accounts', requireAdmin, async (_req, res) => {
  try {
    const accounts = await readJsonFile('student-accounts');
    res.json({
      studentAccounts: accounts
        .map((account) => ({
          id: account.id,
          name: account.name,
          email: account.email,
          phone: account.phone || '',
          avatarUrl: account.avatarUrl || '',
          authProvider: account.googleId ? 'Google' : 'Password',
          createdAt: account.createdAt,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    });
  } catch (error) {
    console.error('Admin student accounts read failed:', error);
    res.status(500).json({ message: 'Could not load student accounts.' });
  }
});

app.delete('/api/admin/student-accounts/:id', requireAdmin, async (req, res) => {
  try {
    const accounts = await readJsonFile('student-accounts');
    const index = accounts.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Student account not found.' }); return; }
    const deleted = accounts.splice(index, 1)[0];
    await writeJsonFile('student-accounts', accounts);
    await recordActivity('Deleted student portal account', req.params.id, deleted.name);
    res.json({ studentAccount: { id: deleted.id, name: deleted.name, email: deleted.email } });
  } catch (error) {
    console.error('Admin student account delete failed:', error);
    res.status(500).json({ message: 'Could not delete student account.' });
  }
});

app.post('/api/admin/student-accounts/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const accounts = await readJsonFile('student-accounts');
    const index = accounts.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Student account not found.' }); return; }

    const tempPassword = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
    accounts[index] = { ...accounts[index], passwordHash: await bcrypt.hash(tempPassword, 10) };
    await writeJsonFile('student-accounts', accounts);
    await recordActivity('Reset student portal password', req.params.id, accounts[index].name);
    res.json({ message: 'Password reset. Share the temporary password with the student.', temporaryPassword: tempPassword });
  } catch (error) {
    console.error('Admin student account password reset failed:', error);
    res.status(500).json({ message: 'Could not reset password.' });
  }
});

app.get('/api/admin/payments', requireAdmin, async (_req, res) => {
  try {
    const payments = await readJsonFile('payments');
    const orders = await readOrders();
    res.json({
      payments: mergeByKey(derivePaymentsFromOrders(orders), payments, (payment) => payment.enrollmentId || payment.id),
    });
  } catch (error) {
    console.error('Admin payments read failed:', error);
    res.status(500).json({ message: 'Could not load payments.' });
  }
});

app.post('/api/admin/payments', requireAdmin, async (req, res) => {
  try {
    const payments = await readJsonFile('payments');
    const payment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...req.body,
    };
    payments.push(payment);
    await writeJsonFile('payments', payments);
    await recordActivity('Created payment', payment.id, `${payment.amount || 0} FCFA`);
    res.status(201).json({ payment });
  } catch (error) {
    console.error('Admin payment create failed:', error);
    res.status(500).json({ message: 'Could not create payment.' });
  }
});

app.put('/api/admin/payments/:id', requireAdmin, async (req, res) => {
  try {
    const payments = await readJsonFile('payments');
    const index = payments.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      const payment = {
        id: req.params.id,
        createdAt: new Date().toISOString(),
        ...req.body,
        updatedAt: new Date().toISOString(),
      };
      payments.push(payment);
      await writeJsonFile('payments', payments);
      await recordActivity('Created payment from enrollment', req.params.id, payment.status);
      res.json({ payment });
      return;
    }
    payments[index] = { ...payments[index], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await writeJsonFile('payments', payments);
    await recordActivity('Updated payment', req.params.id, payments[index].status);
    res.json({ payment: payments[index] });
  } catch (error) {
    console.error('Admin payment update failed:', error);
    res.status(500).json({ message: 'Could not update payment.' });
  }
});

app.delete('/api/admin/payments/:id', requireAdmin, async (req, res) => {
  try {
    const payments = await readJsonFile('payments');
    const index = payments.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      await recordActivity('Dismissed derived payment', req.params.id, '');
      res.json({ payment: { id: req.params.id } });
      return;
    }
    const deleted = payments.splice(index, 1)[0];
    await writeJsonFile('payments', payments);
    await recordActivity('Deleted payment', req.params.id, `${deleted.amount || 0} FCFA`);
    res.json({ payment: deleted });
  } catch (error) {
    console.error('Admin payment delete failed:', error);
    res.status(500).json({ message: 'Could not delete payment.' });
  }
});

app.get('/api/admin/discounts', requireAdmin, async (_req, res) => {
  try {
    const discounts = (await readJsonFile('discounts')).map(normalizeDiscount);
    res.json({ discounts });
  } catch (error) {
    console.error('Admin discounts read failed:', error);
    res.status(500).json({ message: 'Could not load discounts.' });
  }
});

app.post('/api/admin/discounts', requireAdmin, async (req, res) => {
  try {
    const discounts = await readJsonFile('discounts');
    const discount = {
      id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...normalizeDiscount(req.body),
    };
    if (!discount.code) {
      res.status(400).json({ message: 'Discount code is required.' });
      return;
    }
    if (!discount.value || discount.value <= 0) {
      res.status(400).json({ message: 'Discount value must be greater than zero.' });
      return;
    }
    discounts.push(discount);
    await writeJsonFile('discounts', discounts);
    await recordActivity('Created discount', discount.code, `${discount.type} ${discount.value}`);
    res.status(201).json({ discount });
  } catch (error) {
    console.error('Admin discount create failed:', error);
    res.status(500).json({ message: 'Could not create discount.' });
  }
});

app.put('/api/admin/discounts/:id', requireAdmin, async (req, res) => {
  try {
    const discounts = await readJsonFile('discounts');
    const index = discounts.findIndex((d) => d.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Discount not found.' });
      return;
    }
    discounts[index] = { ...discounts[index], ...normalizeDiscount(req.body), id: req.params.id, updatedAt: new Date().toISOString() };
    await writeJsonFile('discounts', discounts);
    await recordActivity('Updated discount', discounts[index].code, `${discounts[index].type} ${discounts[index].value}`);
    res.json({ discount: discounts[index] });
  } catch (error) {
    console.error('Admin discount update failed:', error);
    res.status(500).json({ message: 'Could not update discount.' });
  }
});

app.delete('/api/admin/discounts/:id', requireAdmin, async (req, res) => {
  try {
    const discounts = await readJsonFile('discounts');
    const index = discounts.findIndex((d) => d.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Discount not found.' });
      return;
    }
    const deleted = discounts.splice(index, 1)[0];
    await writeJsonFile('discounts', discounts);
    await recordActivity('Deleted discount', deleted.code || req.params.id, '');
    res.json({ discount: deleted });
  } catch (error) {
    console.error('Admin discount delete failed:', error);
    res.status(500).json({ message: 'Could not delete discount.' });
  }
});

function publicInstructor(item) {
  return {
    id: item.id,
    name: item.name,
    role: cleanText(item.role, 80),
    position: item.position || '',
    professionalTitle: item.professionalTitle || '',
    bio: item.bio || '',
    image: item.image || '',
    courses: Array.isArray(item.courses) ? item.courses : [],
    expertise: Array.isArray(item.expertise) ? item.expertise : [],
    experienceYears: item.experienceYears || '',
    certifications: Array.isArray(item.certifications) ? item.certifications : [],
    teachingPhilosophy: item.teachingPhilosophy || '',
    mission: item.mission || '',
    motto: item.motto || '',
  };
}

app.get('/api/instructors', async (_req, res) => {
  try {
    const instructors = await readJsonFile('instructors');
    const list = instructors.filter((item) => item.name).map(publicInstructor);
    res.json({ instructors: list });
  } catch (error) {
    console.error('Public instructors read failed:', error);
    res.status(500).json({ message: 'Could not load instructors.' });
  }
});

app.get('/api/instructors/:id', async (req, res) => {
  try {
    const instructors = await readJsonFile('instructors');
    const instructor = instructors.find((item) => item.id === req.params.id && item.name);
    if (!instructor) { res.status(404).json({ message: 'Instructor not found.' }); return; }
    res.json({ instructor: publicInstructor(instructor) });
  } catch (error) {
    console.error('Public instructor read failed:', error);
    res.status(500).json({ message: 'Could not load this instructor.' });
  }
});

app.get('/api/admin/instructors', requireAdmin, async (_req, res) => {
  try {
    const instructors = await readJsonFile('instructors');
    res.json({ instructors });
  } catch (error) {
    console.error('Admin instructors read failed:', error);
    res.status(500).json({ message: 'Could not load instructors.' });
  }
});

app.post('/api/admin/instructors', requireAdmin, async (req, res) => {
  try {
    const instructors = await readJsonFile('instructors');
    const instructor = {
      id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...req.body,
    };
    instructors.push(instructor);
    await writeJsonFile('instructors', instructors);
    res.status(201).json({ instructor });
  } catch (error) {
    console.error('Admin instructor create failed:', error);
    res.status(500).json({ message: 'Could not create instructor.' });
  }
});

app.put('/api/admin/instructors/:id', requireAdmin, async (req, res) => {
  try {
    const instructors = await readJsonFile('instructors');
    const index = instructors.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Instructor not found.' });
      return;
    }
    instructors[index] = { ...instructors[index], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await writeJsonFile('instructors', instructors);
    res.json({ instructor: instructors[index] });
  } catch (error) {
    console.error('Admin instructor update failed:', error);
    res.status(500).json({ message: 'Could not update instructor.' });
  }
});

app.delete('/api/admin/instructors/:id', requireAdmin, async (req, res) => {
  try {
    const instructors = await readJsonFile('instructors');
    const index = instructors.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Instructor not found.' });
      return;
    }
    const deleted = instructors.splice(index, 1)[0];
    await writeJsonFile('instructors', instructors);
    if (deleted.image) {
      const oldPath = path.join(INSTRUCTOR_AVATAR_DIR, path.basename(deleted.image));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    res.json({ instructor: deleted });
  } catch (error) {
    console.error('Admin instructor delete failed:', error);
    res.status(500).json({ message: 'Could not delete instructor.' });
  }
});

app.post('/api/admin/instructors/:id/avatar', requireAdmin, (req, res) => {
  uploadInstructorAvatar.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File is too large. Maximum size is 2MB.' });
      return res.status(400).json({ message: err.message || 'File upload failed.' });
    }
    if (!req.file) { res.status(400).json({ message: 'No file provided.' }); return; }
    try {
      const instructors = await readJsonFile('instructors');
      const index = instructors.findIndex((i) => i.id === req.params.id);
      if (index === -1) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ message: 'Instructor not found.' });
        return;
      }
      if (instructors[index].image) {
        const oldPath = path.join(INSTRUCTOR_AVATAR_DIR, path.basename(instructors[index].image));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      instructors[index] = { ...instructors[index], image: `/uploads/instructor-avatars/${req.file.filename}`, updatedAt: new Date().toISOString() };
      await writeJsonFile('instructors', instructors);
      res.json({ instructor: instructors[index] });
    } catch (error) {
      console.error('Instructor avatar upload failed:', error);
      res.status(500).json({ message: 'Could not save the photo.' });
    }
  });
});

app.delete('/api/admin/instructors/:id/avatar', requireAdmin, async (req, res) => {
  try {
    const instructors = await readJsonFile('instructors');
    const index = instructors.findIndex((i) => i.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Instructor not found.' }); return; }
    if (instructors[index].image) {
      const oldPath = path.join(INSTRUCTOR_AVATAR_DIR, path.basename(instructors[index].image));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    instructors[index] = { ...instructors[index], image: '' };
    await writeJsonFile('instructors', instructors);
    res.json({ instructor: instructors[index] });
  } catch (error) {
    console.error('Instructor avatar remove failed:', error);
    res.status(500).json({ message: 'Could not remove the photo.' });
  }
});

app.get('/api/testimonials', async (_req, res) => {
  try {
    const testimonials = await readJsonFile('testimonials');
    const approved = testimonials
      .filter((item) => item.status === 'Approved')
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((item) => ({ id: item.id, name: item.name, role: item.role, text: item.text }));
    res.json({ testimonials: approved });
  } catch (error) {
    console.error('Public testimonials read failed:', error);
    res.status(500).json({ message: 'Could not load testimonials.' });
  }
});

app.post('/api/testimonials', testimonialLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 90);
    const role = cleanText(req.body?.role, 60);
    const text = cleanMultilineText(req.body?.text, 600);

    const errors = [];
    if (name.length < 2) errors.push('Please enter your name.');
    if (role.length < 2) errors.push('Please tell us who you are (e.g. Student, Parent).');
    if (text.length < 10) errors.push('Please share a few more words about your experience.');
    if (errors.length) { res.status(400).json({ message: errors.join(' ') }); return; }

    const testimonials = await readJsonFile('testimonials');
    const testimonial = {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      role,
      text,
      status: 'Pending',
      source: 'public',
      createdAt: new Date().toISOString(),
    };
    testimonials.push(testimonial);
    await writeJsonFile('testimonials', testimonials);
    await recordActivity('New testimonial submitted', name, role);
    res.status(201).json({ message: 'Thank you! Your testimonial has been submitted and will appear on the site after review.' });
  } catch (error) {
    console.error('Public testimonial submit failed:', error);
    res.status(500).json({ message: 'Could not submit your testimonial. Please try again later.' });
  }
});

app.get('/api/admin/testimonials', requireAdmin, async (_req, res) => {
  try {
    const testimonials = await readJsonFile('testimonials');
    res.json({ testimonials });
  } catch (error) {
    console.error('Admin testimonials read failed:', error);
    res.status(500).json({ message: 'Could not load testimonials.' });
  }
});

app.post('/api/admin/testimonials', requireAdmin, async (req, res) => {
  try {
    const testimonials = await readJsonFile('testimonials');
    const testimonial = {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'Approved',
      createdAt: new Date().toISOString(),
      ...req.body,
    };
    testimonials.push(testimonial);
    await writeJsonFile('testimonials', testimonials);
    res.status(201).json({ testimonial });
  } catch (error) {
    console.error('Admin testimonial create failed:', error);
    res.status(500).json({ message: 'Could not create testimonial.' });
  }
});

app.put('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
  try {
    const testimonials = await readJsonFile('testimonials');
    const index = testimonials.findIndex((t) => t.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Testimonial not found.' });
      return;
    }
    testimonials[index] = { ...testimonials[index], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await writeJsonFile('testimonials', testimonials);
    res.json({ testimonial: testimonials[index] });
  } catch (error) {
    console.error('Admin testimonial update failed:', error);
    res.status(500).json({ message: 'Could not update testimonial.' });
  }
});

app.delete('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
  try {
    const testimonials = await readJsonFile('testimonials');
    const index = testimonials.findIndex((t) => t.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Testimonial not found.' });
      return;
    }
    const deleted = testimonials.splice(index, 1)[0];
    await writeJsonFile('testimonials', testimonials);
    res.json({ testimonial: deleted });
  } catch (error) {
    console.error('Admin testimonial delete failed:', error);
    res.status(500).json({ message: 'Could not delete testimonial.' });
  }
});

// ---- Message routes (storage-backed) ----

app.patch('/api/admin/messages/:id/read', requireAdmin, async (req, res) => {
  try {
    const messages = await readJsonFile('messages');
    const index = messages.findIndex((m) => m.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Message not found.' });
      return;
    }
    messages[index] = { ...messages[index], readAt: new Date().toISOString(), isRead: true };
    await writeJsonFile('messages', messages);
    res.json({ message: messages[index] });
  } catch (error) {
    console.error('Admin message read update failed:', error);
    res.status(500).json({ message: 'Could not update message.' });
  }
});

app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    const messages = await readJsonFile('messages');
    const index = messages.findIndex((m) => m.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Message not found.' });
      return;
    }
    const deleted = messages.splice(index, 1)[0];
    await writeJsonFile('messages', messages);
    await recordActivity('Deleted message', req.params.id, deleted.name || deleted.email || '');
    res.json({ message: deleted });
  } catch (error) {
    console.error('Admin message delete failed:', error);
    res.status(500).json({ message: 'Could not delete message.' });
  }
});

function publicSettings(stored) {
  const config = smtpConfig();
  const base = stored || {
    academyName: BUSINESS_NAME,
    supportEmail: ADMIN_EMAIL,
    primaryWhatsApp: WHATSAPP_PRIMARY,
    currency: 'FCFA',
    timezone: 'Africa/Lagos',
    emailNotifications: true,
  };
  const { smtpPass: _omit, ...rest } = base;
  return {
    ...rest,
    smtpHost: config.host,
    smtpPort: config.port,
    smtpSecure: config.secure,
    smtpUser: config.user,
    smtpFrom: config.from,
    smtpPassSet: Boolean(config.pass),
  };
}

app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  try {
    const stored = await readJsonFile('settings');
    res.json({ settings: publicSettings(stored[0]) });
  } catch (error) {
    console.error('Admin settings read failed:', error);
    res.status(500).json({ message: 'Could not load settings.' });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const stored = await readJsonFile('settings');
    const existing = stored[0] || {};

    const sanitized = sanitizePayload(req.body, {
      academyName: { max: 120 },
      supportEmail: { max: 180 },
      primaryWhatsApp: { max: 40 },
      currency: { max: 12 },
      timezone: { max: 80 },
      emailNotifications: { type: 'boolean' },
      smtpHost: { max: 120 },
      smtpPort: { type: 'number' },
      smtpUser: { max: 180 },
      smtpFrom: { max: 200 },
    });

    const smtpSecureRaw = req.body?.smtpSecure;
    const smtpSecure = smtpSecureRaw === undefined ? (existing.smtpSecure ?? true) : (smtpSecureRaw === true || smtpSecureRaw === 'true');
    const newPass = cleanText(req.body?.smtpPass, 200);

    const settings = {
      ...existing,
      ...sanitized,
      smtpSecure,
      smtpPass: newPass || existing.smtpPass || '',
      updatedAt: new Date().toISOString(),
    };
    if (!settings.smtpPort) settings.smtpPort = existing.smtpPort || 465;

    await writeJsonFile('settings', [settings]);
    setSmtpOverride(settings);
    await recordActivity('Updated settings', 'settings', settings.academyName);
    res.json({ settings: publicSettings(settings) });
  } catch (error) {
    console.error('Admin settings update failed:', error);
    res.status(500).json({ message: 'Could not update settings.' });
  }
});

app.post('/api/admin/settings/test-email', requireAdmin, async (req, res) => {
  try {
    const recipient = cleanText(req.body?.recipient, 180) || smtpConfig().user;
    if (!isEmail(recipient)) { res.status(400).json({ message: 'Enter a valid recipient email address.' }); return; }

    const { transporter, config } = await createVerifiedTransporter() || {};
    if (!transporter) {
      res.status(503).json({ message: 'SMTP is not configured. Fill in the email settings first.' });
      return;
    }
    await transporter.sendMail({
      from: config.from,
      to: recipient,
      subject: `${BUSINESS_NAME} SMTP test email`,
      text: `This is a test email from the ${BUSINESS_NAME} admin panel. If you received this, your email settings are working.`,
    });
    transporter.close();
    res.json({ message: `Test email sent to ${recipient}.` });
  } catch (error) {
    console.error('SMTP test email failed:', error);
    res.status(502).json({ message: explainSmtpError(error, error.smtpLastConfig) });
  }
});

app.get('/api/admin/reports', requireAdmin, async (_req, res) => {
  try {
    const [orders, payments, storedReports] = await Promise.all([
      readOrders(),
      readJsonFile('payments'),
      readJsonFile('reports'),
    ]);
    const stats = buildOrderStats(orders);
    res.json({
      reports: [
        {
          id: 'summary',
          name: 'Enrollment Summary',
          totalEnrollments: stats.totalOrders,
          totalRevenue: stats.totalAmount,
          totalPayments: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
          generatedAt: new Date().toISOString(),
        },
        ...storedReports,
      ],
    });
  } catch (error) {
    console.error('Admin reports read failed:', error);
    res.status(500).json({ message: 'Could not load reports.' });
  }
});

app.get('/api/admin/admins', requireAdmin, async (_req, res) => {
  try {
    const admins = await readJsonFile('admins');
    if (admins.length) {
      res.json({ admins });
      return;
    }
    const defaultAdmins = [{
      id: 'admin-owner',
      name: 'Admin',
      email: ADMIN_EMAIL,
      role: 'Super Admin',
      status: 'Active',
      createdAt: new Date().toISOString(),
    }];
    await writeJsonFile('admins', defaultAdmins);
    res.json({
      admins: defaultAdmins,
    });
  } catch (error) {
    console.error('Admin users read failed:', error);
    res.status(500).json({ message: 'Could not load admins.' });
  }
});

app.post('/api/admin/admins', requireAdmin, async (req, res) => {
  try {
    const admins = await readJsonFile('admins');
    const admin = {
      id: createAdminId('admin'),
      createdAt: new Date().toISOString(),
      ...sanitizePayload(req.body, {
        name: { max: 120 },
        email: { max: 180 },
        role: { max: 80 },
        status: { max: 40 },
      }),
    };
    admins.push(admin);
    await writeJsonFile('admins', admins);
    await recordActivity('Created admin', admin.id, admin.email);
    res.status(201).json({ admin });
  } catch (error) {
    console.error('Admin user create failed:', error);
    res.status(500).json({ message: 'Could not create admin.' });
  }
});

app.put('/api/admin/admins/:id', requireAdmin, async (req, res) => {
  try {
    const admins = await readJsonFile('admins');
    const index = admins.findIndex((admin) => admin.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Admin not found.' });
      return;
    }
    admins[index] = { ...admins[index], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await writeJsonFile('admins', admins);
    await recordActivity('Updated admin', req.params.id, admins[index].email);
    res.json({ admin: admins[index] });
  } catch (error) {
    console.error('Admin user update failed:', error);
    res.status(500).json({ message: 'Could not update admin.' });
  }
});

app.delete('/api/admin/admins/:id', requireAdmin, async (req, res) => {
  try {
    const admins = await readJsonFile('admins');
    const index = admins.findIndex((admin) => admin.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Admin not found.' });
      return;
    }
    const deleted = admins.splice(index, 1)[0];
    await writeJsonFile('admins', admins);
    await recordActivity('Deleted admin', req.params.id, deleted.email);
    res.json({ admin: deleted });
  } catch (error) {
    console.error('Admin user delete failed:', error);
    res.status(500).json({ message: 'Could not delete admin.' });
  }
});

app.get('/api/admin/roles', requireAdmin, async (_req, res) => {
  try {
    const roles = await readJsonFile('roles');
    if (roles.length) {
      res.json({ roles });
      return;
    }
    const defaultRoles = [
      { id: 'role-super-admin', name: 'Super Admin', permissions: ['all'], users: 1, status: 'Active' },
      { id: 'role-manager', name: 'Manager', permissions: ['enrollments', 'courses', 'payments', 'messages'], users: 0, status: 'Active' },
      { id: 'role-support', name: 'Support', permissions: ['enrollments', 'messages', 'email-logs'], users: 0, status: 'Active' },
    ];
    await writeJsonFile('roles', defaultRoles);
    res.json({
      roles: defaultRoles,
    });
  } catch (error) {
    console.error('Admin roles read failed:', error);
    res.status(500).json({ message: 'Could not load roles.' });
  }
});

app.post('/api/admin/roles', requireAdmin, async (req, res) => {
  try {
    const roles = await readJsonFile('roles');
    const role = {
      id: createAdminId('role'),
      createdAt: new Date().toISOString(),
      ...sanitizePayload(req.body, {
        name: { max: 120 },
        permissions: { type: 'array', max: 80 },
        users: { type: 'number' },
        status: { max: 40 },
      }),
    };
    roles.push(role);
    await writeJsonFile('roles', roles);
    await recordActivity('Created role', role.id, role.name);
    res.status(201).json({ role });
  } catch (error) {
    console.error('Admin role create failed:', error);
    res.status(500).json({ message: 'Could not create role.' });
  }
});

app.put('/api/admin/roles/:id', requireAdmin, async (req, res) => {
  try {
    const roles = await readJsonFile('roles');
    const index = roles.findIndex((role) => role.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Role not found.' });
      return;
    }
    roles[index] = { ...roles[index], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await writeJsonFile('roles', roles);
    await recordActivity('Updated role', req.params.id, roles[index].name);
    res.json({ role: roles[index] });
  } catch (error) {
    console.error('Admin role update failed:', error);
    res.status(500).json({ message: 'Could not update role.' });
  }
});

app.delete('/api/admin/roles/:id', requireAdmin, async (req, res) => {
  try {
    const roles = await readJsonFile('roles');
    const index = roles.findIndex((role) => role.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Role not found.' });
      return;
    }
    const deleted = roles.splice(index, 1)[0];
    await writeJsonFile('roles', roles);
    await recordActivity('Deleted role', req.params.id, deleted.name);
    res.json({ role: deleted });
  } catch (error) {
    console.error('Admin role delete failed:', error);
    res.status(500).json({ message: 'Could not delete role.' });
  }
});

app.get('/api/admin/activity-logs', requireAdmin, async (_req, res) => {
  try {
    const logs = await readJsonFile('activity-logs');
    res.json({ logs });
  } catch (error) {
    console.error('Admin activity logs read failed:', error);
    res.status(500).json({ message: 'Could not load activity logs.' });
  }
});

async function handleOrder(req, res) {
  const { order, errors } = await validateOrder(req.body || {});
  if (errors.length) {
    res.status(400).json({ message: errors.join(' '), errors });
    return;
  }

  let savedOrder;
  try {
    savedOrder = await saveOrder(order);
    await createPendingPaymentForOrder(savedOrder);
    await incrementDiscountUsage(savedOrder.discountCode);
  } catch (error) {
    console.error('Order storage failed:', error);
    res.status(500).json({ message: 'Could not save your order. Please try again or use WhatsApp.' });
    return;
  }

  try {
    const emailResult = await sendOrderEmails(savedOrder);
    res.status(201).json({
      message: ORDER_EMAIL_SENT_MESSAGE,
      orderId: savedOrder.id,
      totalAmount: savedOrder.totalAmount,
      subtotal: savedOrder.subtotal,
      discountCode: savedOrder.discountCode,
      discountAmount: savedOrder.discountAmount,
      grandTotal: savedOrder.grandTotal,
      emailSent: emailResult.studentEmailSent,
      studentEmailSent: emailResult.studentEmailSent,
      adminEmailSent: emailResult.adminEmailSent,
      emailWarnings: emailResult.warnings,
    });
  } catch (error) {
    const emailError = explainSmtpError(error, error.smtpLastConfig);
    console.error('Email delivery failed:', emailError, error.smtpAttempts || []);
    res.status(202).json({
      message: publicEmailFailureMessage(error),
      orderId: savedOrder.id,
      totalAmount: savedOrder.totalAmount,
      subtotal: savedOrder.subtotal,
      discountCode: savedOrder.discountCode,
      discountAmount: savedOrder.discountAmount,
      grandTotal: savedOrder.grandTotal,
      emailSent: false,
      emailErrorCode: error?.code || 'SMTP_ERROR',
    });
  }
}

app.post('/api/enrollments', orderLimiter, handleOrder);
app.post('/api/orders', orderLimiter, handleOrder);
app.post('/api/course-orders', orderLimiter, handleOrder);
app.post('/api/api/enrollments', orderLimiter, handleOrder);
app.post('/enrollments', orderLimiter, handleOrder);
app.post('/api/enquiries', orderLimiter, handleOrder);

app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 90);
    const email = cleanText(req.body?.email, 120).toLowerCase();
    const phone = cleanText(req.body?.phone, 40);
    const subject = cleanText(req.body?.subject, 150);
    const message = cleanText(req.body?.message, 2000);

    if (name.length < 2) { res.status(400).json({ message: 'Your name is required.' }); return; }
    if (!isEmail(email)) { res.status(400).json({ message: 'A valid email address is required.' }); return; }
    if (message.length < 10) { res.status(400).json({ message: 'Please include a short message (at least 10 characters).' }); return; }

    const result = await sendContactEmail({ name, email, phone, subject, message, adminEmail: ADMIN_EMAIL });

    await recordEmailDelivery({
      id: `contact-${Date.now()}`,
      recipient: ADMIN_EMAIL,
      subject: `New Contact Form Message from ${name}`,
      status: result.success ? 'Sent' : 'Failed',
      errorMessage: result.success ? '' : explainSmtpError(result.error, result.error?.smtpLastConfig),
    });

    await recordEmailDelivery({
      id: `contact-autoreply-${Date.now()}`,
      recipient: email,
      subject: 'We Received Your Message - HIKLASS Academy',
      status: result.autoReplySent ? 'Sent' : 'Failed',
      errorMessage: result.autoReplySent ? '' : explainSmtpError(result.autoReplyError, result.autoReplyError?.smtpLastConfig),
    });

    if (!result.success) {
      res.status(202).json({
        message: "Your message was received, but we couldn't send the notification email right now. We'll still follow up shortly.",
      });
      return;
    }

    res.status(201).json({ message: "Thanks for reaching out! We've received your message and will get back to you shortly." });
  } catch (error) {
    console.error('Contact form submission failed:', error);
    res.status(500).json({ message: 'Could not send your message. Please try again or use WhatsApp.' });
  }
});

// ---- Blog routes ----

app.get('/api/blog/categories', async (_req, res) => {
  try {
    const posts = (await blogPostsWithDefaults()).filter((post) => post.status === 'Published');
    const categories = (await blogCategoriesWithDefaults()).map((category) => ({
      ...category,
      articleCount: posts.filter((post) => post.categorySlug === category.slug || post.category === category.name).length,
    }));
    res.json({ categories });
  } catch (error) {
    console.error('Blog categories read failed:', error);
    res.status(500).json({ message: 'Could not load blog categories.' });
  }
});

app.get('/api/blog/posts', async (req, res) => {
  try {
    const query = cleanText(req.query.q, 120).toLowerCase();
    const category = cleanText(req.query.category, 120).toLowerCase();
    const tag = cleanText(req.query.tag, 80).toLowerCase();
    const comments = await readJsonFile('blog-comments');
    let posts = (await blogPostsWithDefaults()).filter((post) => post.status === 'Published');
    if (query) {
      posts = posts.filter((post) => [
        post.title,
        post.subtitle,
        post.excerpt,
        post.category,
        post.relatedCourse,
        ...(post.tags || []),
      ].join(' ').toLowerCase().includes(query));
    }
    if (category) posts = posts.filter((post) => post.categorySlug === category || post.category.toLowerCase() === category);
    if (tag) posts = posts.filter((post) => (post.tags || []).some((item) => item.toLowerCase() === tag));
    posts = posts
      .map((post) => publicBlogPost(post, comments))
      .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
    res.json({ posts, total: posts.length });
  } catch (error) {
    console.error('Blog posts read failed:', error);
    res.status(500).json({ message: 'Could not load blog posts.' });
  }
});

app.get('/api/blog/posts/:slug', async (req, res) => {
  try {
    const posts = await blogPostsWithDefaults();
    const index = posts.findIndex((post) => post.slug === req.params.slug && post.status === 'Published');
    if (index === -1) { res.status(404).json({ message: 'Article not found.' }); return; }
    posts[index] = { ...posts[index], views: Number(posts[index].views || 0) + 1 };
    await writeJsonFile('blog-posts', posts);
    const comments = await readJsonFile('blog-comments');
    const post = publicBlogPost(posts[index], comments);
    const related = posts
      .filter((item) => item.id !== post.id && item.status === 'Published' && (item.categorySlug === post.categorySlug || (item.tags || []).some((tag) => (post.tags || []).includes(tag))))
      .slice(0, 4)
      .map((item) => publicBlogPost(item, comments));
    res.json({
      post,
      related,
      comments: comments.filter((comment) => comment.postId === post.id && comment.status === 'Approved'),
    });
  } catch (error) {
    console.error('Blog post read failed:', error);
    res.status(500).json({ message: 'Could not load article.' });
  }
});

app.post('/api/blog/comments', testimonialLimiter, async (req, res) => {
  try {
    const postId = cleanText(req.body?.postId, 120);
    const name = cleanText(req.body?.name, 100);
    const email = cleanText(req.body?.email, 180).toLowerCase();
    const body = cleanMultilineText(req.body?.comment || req.body?.body, 1200);
    if (!postId || !name || !isEmail(email) || !body) {
      res.status(400).json({ message: 'Name, valid email, article, and comment are required.' });
      return;
    }
    const posts = await blogPostsWithDefaults();
    if (!posts.some((post) => post.id === postId && post.commentsEnabled !== false)) {
      res.status(404).json({ message: 'Article comments are not available.' });
      return;
    }
    const comments = await readJsonFile('blog-comments');
    const comment = {
      id: createAdminId('comment'),
      postId,
      name,
      email,
      body,
      status: 'Pending',
      likes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    comments.unshift(comment);
    await writeJsonFile('blog-comments', comments);
    res.status(201).json({ message: 'Comment submitted for approval.', comment });
  } catch (error) {
    console.error('Blog comment create failed:', error);
    res.status(500).json({ message: 'Could not submit comment.' });
  }
});

app.post('/api/blog/newsletter/subscribe', orderLimiter, async (req, res) => {
  try {
    const firstName = cleanText(req.body?.firstName || req.body?.name, 80);
    const email = cleanText(req.body?.email, 180).toLowerCase();
    if (!isEmail(email)) { res.status(400).json({ message: 'Enter a valid email address.' }); return; }
    const subscribers = await readJsonFile('blog-subscribers');
    const existingIndex = subscribers.findIndex((item) => item.email === email);
    const subscriber = {
      id: existingIndex >= 0 ? subscribers[existingIndex].id : createAdminId('sub'),
      firstName,
      email,
      status: 'Active',
      source: 'Blog',
      tags: ['blog'],
      createdAt: existingIndex >= 0 ? subscribers[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) subscribers[existingIndex] = subscriber;
    else subscribers.unshift(subscriber);
    await writeJsonFile('blog-subscribers', subscribers);
    res.status(existingIndex >= 0 ? 200 : 201).json({ message: 'Subscription saved.', subscriber });
  } catch (error) {
    console.error('Blog subscriber create failed:', error);
    res.status(500).json({ message: 'Could not subscribe right now.' });
  }
});

app.post('/api/blog/posts/:id/like', async (req, res) => {
  try {
    const posts = await blogPostsWithDefaults();
    const index = posts.findIndex((post) => post.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Article not found.' }); return; }
    posts[index] = { ...posts[index], likes: Number(posts[index].likes || 0) + 1, updatedAt: new Date().toISOString() };
    await writeJsonFile('blog-posts', posts);
    res.json({ likes: posts[index].likes });
  } catch (error) {
    console.error('Blog like failed:', error);
    res.status(500).json({ message: 'Could not like article.' });
  }
});

app.get('/api/admin/blog/posts', requireAdmin, async (_req, res) => {
  try {
    const comments = await readJsonFile('blog-comments');
    const posts = (await blogPostsWithDefaults()).map((post) => publicBlogPost(post, comments));
    res.json({ posts });
  } catch (error) {
    console.error('Admin blog posts read failed:', error);
    res.status(500).json({ message: 'Could not load blog posts.' });
  }
});

app.post('/api/admin/blog/posts', requireAdmin, async (req, res) => {
  try {
    const posts = await blogPostsWithDefaults();
    const post = normalizeBlogPost(req.body);
    posts.unshift(post);
    await writeJsonFile('blog-posts', posts);
    res.status(201).json({ post });
  } catch (error) {
    console.error('Admin blog post create failed:', error);
    res.status(500).json({ message: 'Could not create blog post.' });
  }
});

app.put('/api/admin/blog/posts/:id', requireAdmin, async (req, res) => {
  try {
    const posts = await blogPostsWithDefaults();
    const index = posts.findIndex((post) => post.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Blog post not found.' }); return; }
    posts[index] = normalizeBlogPost(req.body, posts[index]);
    await writeJsonFile('blog-posts', posts);
    res.json({ post: posts[index] });
  } catch (error) {
    console.error('Admin blog post update failed:', error);
    res.status(500).json({ message: 'Could not update blog post.' });
  }
});

app.delete('/api/admin/blog/posts/:id', requireAdmin, async (req, res) => {
  try {
    const posts = await blogPostsWithDefaults();
    const index = posts.findIndex((post) => post.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Blog post not found.' }); return; }
    const [post] = posts.splice(index, 1);
    await writeJsonFile('blog-posts', posts);
    res.json({ post });
  } catch (error) {
    console.error('Admin blog post delete failed:', error);
    res.status(500).json({ message: 'Could not delete blog post.' });
  }
});

app.patch('/api/admin/blog/posts/:id/status', requireAdmin, async (req, res) => {
  try {
    const posts = await blogPostsWithDefaults();
    const index = posts.findIndex((post) => post.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Blog post not found.' }); return; }
    const status = cleanText(req.body?.status, 40) || posts[index].status;
    posts[index] = {
      ...posts[index],
      status,
      publishedAt: status === 'Published' && !posts[index].publishedAt ? new Date().toISOString() : posts[index].publishedAt,
      updatedAt: new Date().toISOString(),
    };
    await writeJsonFile('blog-posts', posts);
    res.json({ post: posts[index] });
  } catch (error) {
    console.error('Admin blog status update failed:', error);
    res.status(500).json({ message: 'Could not update status.' });
  }
});

app.post('/api/admin/blog/posts/:id/duplicate', requireAdmin, async (req, res) => {
  try {
    const posts = await blogPostsWithDefaults();
    const original = posts.find((post) => post.id === req.params.id);
    if (!original) { res.status(404).json({ message: 'Blog post not found.' }); return; }
    const copy = normalizeBlogPost({ ...original, id: '', title: `${original.title} Copy`, slug: `${original.slug}-copy-${Date.now()}`, status: 'Draft', featured: false, publishedAt: '', views: 0, likes: 0, shares: 0 });
    posts.unshift(copy);
    await writeJsonFile('blog-posts', posts);
    res.status(201).json({ post: copy });
  } catch (error) {
    console.error('Admin blog duplicate failed:', error);
    res.status(500).json({ message: 'Could not duplicate post.' });
  }
});

app.get('/api/admin/blog/categories', requireAdmin, async (_req, res) => {
  try {
    res.json({ categories: await blogCategoriesWithDefaults() });
  } catch (error) {
    console.error('Admin blog categories read failed:', error);
    res.status(500).json({ message: 'Could not load categories.' });
  }
});

app.post('/api/admin/blog/categories', requireAdmin, async (req, res) => {
  try {
    const categories = await blogCategoriesWithDefaults();
    const category = normalizeBlogCategory(req.body);
    categories.push(category);
    await writeJsonFile('blog-categories', categories);
    res.status(201).json({ category });
  } catch (error) {
    console.error('Admin blog category create failed:', error);
    res.status(500).json({ message: 'Could not create category.' });
  }
});

app.put('/api/admin/blog/categories/:id', requireAdmin, async (req, res) => {
  try {
    const categories = await blogCategoriesWithDefaults();
    const index = categories.findIndex((category) => category.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Category not found.' }); return; }
    categories[index] = normalizeBlogCategory(req.body, categories[index]);
    await writeJsonFile('blog-categories', categories);
    res.json({ category: categories[index] });
  } catch (error) {
    console.error('Admin blog category update failed:', error);
    res.status(500).json({ message: 'Could not update category.' });
  }
});

app.delete('/api/admin/blog/categories/:id', requireAdmin, async (req, res) => {
  try {
    const categories = await blogCategoriesWithDefaults();
    const index = categories.findIndex((category) => category.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Category not found.' }); return; }
    const [category] = categories.splice(index, 1);
    await writeJsonFile('blog-categories', categories);
    res.json({ category });
  } catch (error) {
    console.error('Admin blog category delete failed:', error);
    res.status(500).json({ message: 'Could not delete category.' });
  }
});

app.get('/api/admin/blog/comments', requireAdmin, async (_req, res) => {
  try {
    const posts = await blogPostsWithDefaults();
    const titleById = new Map(posts.map((post) => [post.id, post.title]));
    const comments = (await readJsonFile('blog-comments')).map((comment) => ({ ...comment, postTitle: titleById.get(comment.postId) || 'Unknown post' }));
    res.json({ comments });
  } catch (error) {
    console.error('Admin blog comments read failed:', error);
    res.status(500).json({ message: 'Could not load comments.' });
  }
});

app.patch('/api/admin/blog/comments/:id/status', requireAdmin, async (req, res) => {
  try {
    const comments = await readJsonFile('blog-comments');
    const index = comments.findIndex((comment) => comment.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Comment not found.' }); return; }
    comments[index] = { ...comments[index], status: cleanText(req.body?.status, 30) || comments[index].status, updatedAt: new Date().toISOString() };
    await writeJsonFile('blog-comments', comments);
    res.json({ comment: comments[index] });
  } catch (error) {
    console.error('Admin blog comment update failed:', error);
    res.status(500).json({ message: 'Could not update comment.' });
  }
});

app.delete('/api/admin/blog/comments/:id', requireAdmin, async (req, res) => {
  try {
    const comments = await readJsonFile('blog-comments');
    const index = comments.findIndex((comment) => comment.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Comment not found.' }); return; }
    const [comment] = comments.splice(index, 1);
    await writeJsonFile('blog-comments', comments);
    res.json({ comment });
  } catch (error) {
    console.error('Admin blog comment delete failed:', error);
    res.status(500).json({ message: 'Could not delete comment.' });
  }
});

app.get('/api/admin/blog/newsletter-subscribers', requireAdmin, async (_req, res) => {
  try {
    res.json({ subscribers: await readJsonFile('blog-subscribers') });
  } catch (error) {
    console.error('Admin blog subscribers read failed:', error);
    res.status(500).json({ message: 'Could not load subscribers.' });
  }
});

app.get('/api/admin/blog/analytics', requireAdmin, async (_req, res) => {
  try {
    const posts = await blogPostsWithDefaults();
    const comments = await readJsonFile('blog-comments');
    const subscribers = await readJsonFile('blog-subscribers');
    res.json({
      analytics: {
        totalPosts: posts.length,
        publishedPosts: posts.filter((post) => post.status === 'Published').length,
        draftPosts: posts.filter((post) => post.status === 'Draft').length,
        scheduledPosts: posts.filter((post) => post.status === 'Scheduled').length,
        totalViews: posts.reduce((sum, post) => sum + Number(post.views || 0), 0),
        totalComments: comments.length,
        newsletterSubscribers: subscribers.length,
        totalAuthors: new Set(posts.map((post) => post.author?.name).filter(Boolean)).size,
        topPosts: [...posts].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Admin blog analytics read failed:', error);
    res.status(500).json({ message: 'Could not load blog analytics.' });
  }
});

// ---- Student portal routes ----

function signStudentToken(account) {
  return jwt.sign({ id: account.id, email: account.email, name: account.name }, JWT_SECRET, { expiresIn: STUDENT_TOKEN_EXPIRY });
}

function publicStudentAccount(account) {
  return { id: account.id, name: account.name, email: account.email, phone: account.phone || '', avatarUrl: account.avatarUrl || '' };
}

app.post('/api/student/auth/register', studentAuthLimiter, async (req, res) => {
  try {
    if (!JWT_SECRET) {
      res.status(503).json({ message: 'Student login is not configured. Set JWT_SECRET in server/.env.' });
      return;
    }

    const name = cleanText(req.body?.name, 90);
    const email = cleanText(req.body?.email, 120).toLowerCase();
    const phone = cleanText(req.body?.phone, 40);
    const password = String(req.body?.password || '');

    if (name.length < 2) { res.status(400).json({ message: 'Your name is required.' }); return; }
    if (!isEmail(email)) { res.status(400).json({ message: 'A valid email address is required.' }); return; }
    if (password.length < 6) { res.status(400).json({ message: 'Password must be at least 6 characters.' }); return; }

    const accounts = await readJsonFile('student-accounts');
    if (accounts.some((account) => account.email === email)) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const account = {
      id: `STU-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      name,
      email,
      phone,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    accounts.push(account);
    await writeJsonFile('student-accounts', accounts);

    res.status(201).json({ token: signStudentToken(account), student: publicStudentAccount(account) });
  } catch (error) {
    console.error('Student registration failed:', error);
    res.status(500).json({ message: 'Could not create your account. Please try again.' });
  }
});

app.post('/api/student/auth/login', studentAuthLimiter, async (req, res) => {
  try {
    if (!JWT_SECRET) {
      res.status(503).json({ message: 'Student login is not configured. Set JWT_SECRET in server/.env.' });
      return;
    }

    const email = cleanText(req.body?.email, 120).toLowerCase();
    const password = String(req.body?.password || '');
    const accounts = await readJsonFile('student-accounts');
    const account = accounts.find((item) => item.email === email);
    const passwordMatches = account && account.passwordHash && (await bcrypt.compare(password, account.passwordHash));

    if (!passwordMatches) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    res.json({ token: signStudentToken(account), student: publicStudentAccount(account) });
  } catch (error) {
    console.error('Student login failed:', error);
    res.status(500).json({ message: 'Could not sign you in. Please try again.' });
  }
});

const PASSWORD_RESET_EXPIRY_MINUTES = 60;

app.post('/api/student/auth/forgot-password', studentAuthLimiter, async (req, res) => {
  try {
    const email = cleanText(req.body?.email, 120).toLowerCase();
    if (!isEmail(email)) { res.status(400).json({ message: 'A valid email address is required.' }); return; }

    const accounts = await readJsonFile('student-accounts');
    const account = accounts.find((item) => item.email === email);

    if (!account) {
      res.status(404).json({ message: 'No account found with that email address.' });
      return;
    }

    const token = generateSecureToken();
    const resets = await readJsonFile('password-resets');
    const filtered = resets.filter((item) => item.accountId !== account.id);
    filtered.push({
      token,
      accountId: account.id,
      email: account.email,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    await writeJsonFile('password-resets', filtered);

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
    const resetUrl = `${clientUrl}/student/reset-password?token=${token}`;

    const result = await sendPasswordReset({
      to: account.email,
      name: account.name,
      resetUrl,
      expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
    });

    await recordEmailDelivery({
      id: `password-reset-${account.id}-${Date.now()}`,
      recipient: account.email,
      subject: '🔒 Reset Your HIKLASS Academy Password',
      status: result.success ? 'Sent' : 'Failed',
      errorMessage: result.success ? '' : explainSmtpError(result.error, result.error?.smtpLastConfig),
    });

    res.json({ message: 'A password reset link has been sent to your email.' });
  } catch (error) {
    console.error('Student forgot-password failed:', error);
    res.status(500).json({ message: 'Could not process your request. Please try again.' });
  }
});

app.post('/api/student/auth/reset-password', studentAuthLimiter, async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    if (!token) { res.status(400).json({ message: 'Missing reset token.' }); return; }
    if (password.length < 6) { res.status(400).json({ message: 'Password must be at least 6 characters.' }); return; }

    const resets = await readJsonFile('password-resets');
    const entry = resets.find((item) => item.token === token);
    if (!entry || new Date(entry.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });
      return;
    }

    const accounts = await readJsonFile('student-accounts');
    const index = accounts.findIndex((item) => item.id === entry.accountId);
    if (index === -1) { res.status(404).json({ message: 'Account not found.' }); return; }

    accounts[index] = { ...accounts[index], passwordHash: await bcrypt.hash(password, 10) };
    await writeJsonFile('student-accounts', accounts);
    await writeJsonFile('password-resets', resets.filter((item) => item.token !== token));

    res.json({ message: 'Your password has been reset. You can now sign in with your new password.' });
  } catch (error) {
    console.error('Student reset-password failed:', error);
    res.status(500).json({ message: 'Could not reset your password. Please try again.' });
  }
});

app.post('/api/student/auth/google', studentAuthLimiter, async (req, res) => {
  try {
    if (!JWT_SECRET) {
      res.status(503).json({ message: 'Student login is not configured. Set JWT_SECRET in server/.env.' });
      return;
    }
    if (!googleAuthClient) {
      res.status(503).json({ message: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID in server/.env.' });
      return;
    }

    const credential = String(req.body?.credential || '');
    if (!credential) { res.status(400).json({ message: 'Missing Google credential.' }); return; }

    let payload;
    try {
      const ticket = await googleAuthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      res.status(401).json({ message: 'Could not verify your Google sign-in. Please try again.' });
      return;
    }

    const email = String(payload?.email || '').toLowerCase();
    if (!payload?.email_verified || !isEmail(email)) {
      res.status(401).json({ message: 'Your Google account email could not be verified.' });
      return;
    }
    const name = cleanText(payload?.name || email.split('@')[0], 90);
    const googleId = String(payload?.sub || '');

    const accounts = await readJsonFile('student-accounts');
    let account = accounts.find((item) => item.email === email);

    if (!account) {
      account = {
        id: `STU-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        name,
        email,
        phone: '',
        passwordHash: null,
        googleId,
        createdAt: new Date().toISOString(),
      };
      accounts.push(account);
      await writeJsonFile('student-accounts', accounts);
    } else if (account.googleId !== googleId) {
      account.googleId = googleId;
      await writeJsonFile('student-accounts', accounts);
    }

    res.json({ token: signStudentToken(account), student: publicStudentAccount(account) });
  } catch (error) {
    console.error('Student Google sign-in failed:', error);
    res.status(500).json({ message: 'Could not sign you in with Google. Please try again.' });
  }
});

app.get('/api/student/me', requireStudent, async (req, res) => {
  try {
    const accounts = await readJsonFile('student-accounts');
    const account = accounts.find((item) => item.id === req.student.id);
    if (!account) { res.status(404).json({ message: 'Account not found.' }); return; }
    res.json({ student: publicStudentAccount(account) });
  } catch (error) {
    console.error('Student profile read failed:', error);
    res.status(500).json({ message: 'Could not load your profile.' });
  }
});

app.get('/api/student/enrollments', requireStudent, async (req, res) => {
  try {
    const orders = await readOrders();
    const myOrders = orders
      .filter((order) => (order.email || '').toLowerCase() === req.student.email)
      .map(enrichOrder);
    res.json({ orders: myOrders });
  } catch (error) {
    console.error('Student enrollments read failed:', error);
    res.status(500).json({ message: 'Could not load your enrollments.' });
  }
});

app.get('/api/student/payments', requireStudent, async (req, res) => {
  try {
    const orders = await readOrders();
    const myOrders = orders.filter((order) => (order.email || '').toLowerCase() === req.student.email);
    const payments = await readJsonFile('payments');
    const myPayments = mergeByKey(derivePaymentsFromOrders(myOrders), payments, (payment) => payment.enrollmentId || payment.id)
      .filter((payment) => myOrders.some((order) => order.id === payment.enrollmentId));
    res.json({ payments: myPayments });
  } catch (error) {
    console.error('Student payments read failed:', error);
    res.status(500).json({ message: 'Could not load your payments.' });
  }
});

app.patch('/api/student/profile', requireStudent, async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 90);
    const phone = cleanText(req.body?.phone, 40);
    if (name.length < 2) { res.status(400).json({ message: 'Your name is required.' }); return; }

    const accounts = await readJsonFile('student-accounts');
    const index = accounts.findIndex((item) => item.id === req.student.id);
    if (index === -1) { res.status(404).json({ message: 'Account not found.' }); return; }

    accounts[index] = { ...accounts[index], name, phone };
    await writeJsonFile('student-accounts', accounts);
    res.json({ student: publicStudentAccount(accounts[index]) });
  } catch (error) {
    console.error('Student profile update failed:', error);
    res.status(500).json({ message: 'Could not update your profile.' });
  }
});

app.post('/api/student/profile/avatar', requireStudent, (req, res) => {
  uploadStudentAvatar.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File is too large. Maximum size is 2MB.' });
      return res.status(400).json({ message: err.message || 'File upload failed.' });
    }
    if (!req.file) return res.status(400).json({ message: 'No file provided.' });
    try {
      const accounts = await readJsonFile('student-accounts');
      const index = accounts.findIndex((item) => item.id === req.student.id);
      if (index === -1) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ message: 'Account not found.' });
        return;
      }
      if (accounts[index].avatarUrl) {
        const oldPath = path.join(STUDENT_AVATAR_DIR, path.basename(accounts[index].avatarUrl));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const avatarUrl = `/uploads/student-avatars/${req.file.filename}`;
      accounts[index] = { ...accounts[index], avatarUrl };
      await writeJsonFile('student-accounts', accounts);
      res.json({ student: publicStudentAccount(accounts[index]) });
    } catch (error) {
      console.error('Student avatar upload failed:', error);
      res.status(500).json({ message: 'Could not save your photo.' });
    }
  });
});

app.delete('/api/student/profile/avatar', requireStudent, async (req, res) => {
  try {
    const accounts = await readJsonFile('student-accounts');
    const index = accounts.findIndex((item) => item.id === req.student.id);
    if (index === -1) { res.status(404).json({ message: 'Account not found.' }); return; }

    if (accounts[index].avatarUrl) {
      const oldPath = path.join(STUDENT_AVATAR_DIR, path.basename(accounts[index].avatarUrl));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    accounts[index] = { ...accounts[index], avatarUrl: '' };
    await writeJsonFile('student-accounts', accounts);
    res.json({ student: publicStudentAccount(accounts[index]) });
  } catch (error) {
    console.error('Student avatar remove failed:', error);
    res.status(500).json({ message: 'Could not remove your photo.' });
  }
});

app.patch('/api/student/password', requireStudent, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 6) { res.status(400).json({ message: 'New password must be at least 6 characters.' }); return; }

    const accounts = await readJsonFile('student-accounts');
    const index = accounts.findIndex((item) => item.id === req.student.id);
    if (index === -1) { res.status(404).json({ message: 'Account not found.' }); return; }

    const account = accounts[index];
    if (!account.passwordHash) {
      res.status(400).json({ message: 'This account signs in with Google and has no password to change.' });
      return;
    }
    const currentMatches = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!currentMatches) { res.status(401).json({ message: 'Current password is incorrect.' }); return; }

    accounts[index] = { ...account, passwordHash: await bcrypt.hash(newPassword, 10) };
    await writeJsonFile('student-accounts', accounts);
    res.json({ message: 'Password updated.' });
  } catch (error) {
    console.error('Student password update failed:', error);
    res.status(500).json({ message: 'Could not update your password.' });
  }
});

function courseStageFromOrderStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return { status: 'Completed', progress: 100 };
  if (normalized === 'cancelled' || normalized === 'refunded') return { status: normalized === 'refunded' ? 'Refunded' : 'Cancelled', progress: 0 };
  if (normalized === 'paid' || normalized === 'confirmed') return { status: 'In Progress', progress: 55 };
  return { status: 'Pending Payment', progress: 10 };
}

const ORDER_STAGE_RANK = { 'Pending Payment': 0, Cancelled: 0, Refunded: 0, 'In Progress': 1, Completed: 2 };
const CURRICULUM_UNLOCKED_STATUSES = new Set(['In Progress', 'Completed']);

// A package purchase unlocks course access the same way buying the course directly would:
// the package's own name (so a package that is really a single curriculum, e.g. "Professional
// Secretary & Office Administration", behaves exactly like a course) plus every course title
// bundled inside it.
function orderUnlockedTitles(order) {
  const titles = new Set((order.courses || []).map((course) => courseTitle(course)));
  for (const item of order.packages || []) {
    titles.add(packageName(item));
    for (const bundled of item.courses || []) titles.add(String(bundled));
  }
  return titles;
}

async function studentCourseAccess(studentEmail, targetCourseTitle) {
  const orders = await readOrders();
  const myOrders = orders.filter((order) => (order.email || '').toLowerCase() === studentEmail);

  let best = null;
  for (const order of myOrders) {
    if (!orderUnlockedTitles(order).has(targetCourseTitle)) continue;
    const stage = courseStageFromOrderStatus(order.status);
    if (!best || ORDER_STAGE_RANK[stage.status] > ORDER_STAGE_RANK[best.status]) best = stage;
  }
  if (!best) return { enrolled: false, status: null, progress: 0, unlocked: false };
  return { enrolled: true, status: best.status, progress: best.progress, unlocked: CURRICULUM_UNLOCKED_STATUSES.has(best.status) };
}

function curriculumModules(curriculum) {
  return Array.isArray(curriculum?.modules) ? curriculum.modules : [];
}

function moduleLessons(module) {
  return Array.isArray(module?.lessons) ? module.lessons : [];
}

function flattenLessons(curriculum) {
  const lessons = [];
  for (const module of curriculumModules(curriculum)) {
    for (const lesson of moduleLessons(module)) {
      lessons.push({ ...lesson, moduleId: module.id, moduleTitle: module.title });
    }
  }
  return lessons;
}

function lessonProgressKey(studentId, courseTitle) {
  return `${studentId}::${courseTitle}`;
}

function deriveCurriculumProgress(curriculum, completedLessonIds) {
  const completed = new Set(completedLessonIds || []);
  const flatLessons = flattenLessons(curriculum);
  let currentAssigned = false;
  const lessonStates = {};

  for (const lesson of flatLessons) {
    if (completed.has(lesson.id)) {
      lessonStates[lesson.id] = 'completed';
    } else if (!currentAssigned) {
      lessonStates[lesson.id] = 'in-progress';
      currentAssigned = true;
    } else {
      lessonStates[lesson.id] = 'locked';
    }
  }

  const moduleStates = curriculumModules(curriculum).map((module) => {
    const ids = moduleLessons(module).map((lesson) => lesson.id);
    const completedCount = ids.filter((id) => lessonStates[id] === 'completed').length;
    let status = 'Not Started';
    if (completedCount === ids.length && ids.length > 0) status = 'Completed';
    else if (ids.some((id) => lessonStates[id] === 'completed' || lessonStates[id] === 'in-progress')) status = 'In Progress';
    return {
      id: module.id,
      completedCount,
      totalCount: ids.length,
      percent: ids.length ? Math.round((completedCount / ids.length) * 100) : 0,
      status,
    };
  });

  const totalCount = flatLessons.length;
  const completedCount = flatLessons.filter((lesson) => lessonStates[lesson.id] === 'completed').length;
  const inProgressCount = flatLessons.filter((lesson) => lessonStates[lesson.id] === 'in-progress').length;
  const notStartedCount = totalCount - completedCount - inProgressCount;

  return {
    lessonStates,
    moduleStates,
    stats: {
      totalLessons: totalCount,
      completedLessons: completedCount,
      inProgressLessons: inProgressCount,
      notStartedLessons: notStartedCount,
      percent: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
    },
  };
}

app.get('/api/course-curricula/:courseTitle', async (req, res) => {
  try {
    const curricula = await readJsonFile('course-curricula');
    const curriculum = curricula.find((item) => item.courseTitle === req.params.courseTitle);
    if (!curriculum) { res.status(404).json({ message: 'No curriculum found for this course yet.' }); return; }
    res.json({ curriculum });
  } catch (error) {
    console.error('Curriculum read failed:', error);
    res.status(500).json({ message: 'Could not load curriculum.' });
  }
});

app.get('/api/admin/course-curricula', requireAdmin, async (_req, res) => {
  try {
    const curricula = await readJsonFile('course-curricula');
    res.json({ curricula });
  } catch (error) {
    console.error('Admin curricula read failed:', error);
    res.status(500).json({ message: 'Could not load curricula.' });
  }
});

function validateCurriculumShape(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Curriculum body must be a JSON object.';
  if (body.modules !== undefined && !Array.isArray(body.modules)) return '"modules" must be an array.';
  for (const module of body.modules || []) {
    if (!module || typeof module !== 'object') return 'Each module must be an object.';
    if (!module.id) return 'Each module needs an "id".';
    if (module.lessons !== undefined && !Array.isArray(module.lessons)) return `Module "${module.id}" has a "lessons" field that must be an array.`;
    for (const lesson of module.lessons || []) {
      if (!lesson || typeof lesson !== 'object') return `Module "${module.id}" has a lesson that is not an object.`;
      if (!lesson.id) return `Every lesson in module "${module.id}" needs an "id".`;
      if (lesson.topics !== undefined && !Array.isArray(lesson.topics)) return `Lesson "${lesson.id}" has a "topics" field that must be an array.`;
    }
  }
  return '';
}

app.put('/api/admin/course-curricula/:courseTitle', requireAdmin, async (req, res) => {
  try {
    const validationError = validateCurriculumShape(req.body);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }
    const curricula = await readJsonFile('course-curricula');
    const index = curricula.findIndex((item) => item.courseTitle === req.params.courseTitle);
    const now = new Date().toISOString();
    const saved = {
      ...req.body,
      courseTitle: req.params.courseTitle,
      createdAt: index === -1 ? now : curricula[index].createdAt,
      updatedAt: now,
    };
    if (index === -1) curricula.push(saved);
    else curricula[index] = saved;
    await writeJsonFile('course-curricula', curricula);
    await recordActivity('Saved course curriculum', req.params.courseTitle, `${saved.modules?.length || 0} modules`);
    res.json({ curriculum: saved });
  } catch (error) {
    console.error('Admin curriculum save failed:', error);
    res.status(500).json({ message: 'Could not save curriculum.' });
  }
});

app.delete('/api/admin/course-curricula/:courseTitle', requireAdmin, async (req, res) => {
  try {
    const curricula = await readJsonFile('course-curricula');
    const index = curricula.findIndex((item) => item.courseTitle === req.params.courseTitle);
    if (index === -1) { res.status(404).json({ message: 'Curriculum not found.' }); return; }
    const deleted = curricula.splice(index, 1)[0];
    await writeJsonFile('course-curricula', curricula);
    await recordActivity('Deleted course curriculum', req.params.courseTitle, '');
    res.json({ curriculum: deleted });
  } catch (error) {
    console.error('Admin curriculum delete failed:', error);
    res.status(500).json({ message: 'Could not delete curriculum.' });
  }
});

app.get('/api/student/courses/:courseTitle/curriculum', requireStudent, async (req, res) => {
  try {
    const access = await studentCourseAccess(req.student.email, req.params.courseTitle);
    if (!access.enrolled) {
      res.status(403).json({ message: 'You are not enrolled in this course.', locked: true, reason: 'not_enrolled' });
      return;
    }
    if (!access.unlocked) {
      const reason = access.status === 'Cancelled' || access.status === 'Refunded' ? 'cancelled' : 'pending_payment';
      const message = reason === 'cancelled'
        ? 'This enrollment was cancelled, so the course content is not available.'
        : "Your payment for this course hasn't been confirmed yet. You'll get full access as soon as it's validated.";
      res.status(402).json({ message, locked: true, reason, courseTitle: req.params.courseTitle, status: access.status });
      return;
    }

    const curricula = await readJsonFile('course-curricula');
    const curriculum = curricula.find((item) => item.courseTitle === req.params.courseTitle);
    if (!curriculum) { res.status(404).json({ message: 'No curriculum found for this course yet.' }); return; }

    const progressList = await readJsonFile('lesson-progress');
    const key = lessonProgressKey(req.student.id, req.params.courseTitle);
    const record = progressList.find((item) => item.key === key);
    const completedLessonIds = record?.completedLessonIds || [];

    const derived = deriveCurriculumProgress(curriculum, completedLessonIds);
    res.json({ curriculum, completedLessonIds, ...derived });
  } catch (error) {
    console.error('Student curriculum read failed:', error);
    res.status(500).json({ message: 'Could not load this course.' });
  }
});

app.get('/api/admin/lesson-progress/:studentId/:courseTitle', requireAdmin, async (req, res) => {
  try {
    const progressList = await readJsonFile('lesson-progress');
    const key = lessonProgressKey(req.params.studentId, req.params.courseTitle);
    const record = progressList.find((item) => item.key === key);
    res.json({ completedLessonIds: record?.completedLessonIds || [] });
  } catch (error) {
    console.error('Admin lesson progress read failed:', error);
    res.status(500).json({ message: 'Could not load lesson progress.' });
  }
});

app.put('/api/admin/lesson-progress/:studentId/:courseTitle', requireAdmin, async (req, res) => {
  try {
    const completedLessonIds = Array.isArray(req.body?.completedLessonIds)
      ? req.body.completedLessonIds.map((id) => String(id))
      : [];

    const progressList = await readJsonFile('lesson-progress');
    const key = lessonProgressKey(req.params.studentId, req.params.courseTitle);
    const index = progressList.findIndex((item) => item.key === key);
    const record = {
      key,
      studentId: req.params.studentId,
      courseTitle: req.params.courseTitle,
      completedLessonIds,
      updatedAt: new Date().toISOString(),
    };
    if (index === -1) progressList.push(record);
    else progressList[index] = record;
    await writeJsonFile('lesson-progress', progressList);
    await recordActivity('Updated lesson progress', req.params.studentId, `${req.params.courseTitle}: ${completedLessonIds.length} completed`);
    res.json({ progress: record });
  } catch (error) {
    console.error('Admin lesson progress save failed:', error);
    res.status(500).json({ message: 'Could not save lesson progress.' });
  }
});

// ---- Assignments ----

function publicAssignmentSubmission(sub) {
  if (!sub) return null;
  return {
    id: sub.id,
    assignmentId: sub.assignmentId,
    studentId: sub.studentId,
    studentName: sub.studentName,
    studentEmail: sub.studentEmail,
    fileUrl: sub.fileUrl,
    fileName: sub.fileName,
    notes: sub.notes || '',
    status: sub.status,
    grade: sub.grade ?? null,
    feedback: sub.feedback || '',
    submittedAt: sub.submittedAt,
    gradedAt: sub.gradedAt || null,
  };
}

app.get('/api/admin/assignments', requireAdmin, async (req, res) => {
  try {
    const assignments = await readJsonFile('course-assignments');
    const submissions = await readJsonFile('assignment-submissions');
    const filtered = req.query.courseTitle
      ? assignments.filter((item) => item.courseTitle === req.query.courseTitle)
      : assignments;
    const withCounts = filtered.map((item) => {
      const subs = submissions.filter((sub) => sub.assignmentId === item.id);
      return {
        ...item,
        submissionCount: subs.length,
        gradedCount: subs.filter((sub) => sub.status === 'graded').length,
      };
    });
    res.json({ assignments: withCounts });
  } catch (error) {
    console.error('Admin assignments read failed:', error);
    res.status(500).json({ message: 'Could not load assignments.' });
  }
});

app.post('/api/admin/assignments', requireAdmin, async (req, res) => {
  try {
    const courseTitle = cleanText(req.body?.courseTitle, 120);
    const title = cleanText(req.body?.title, 160);
    if (!courseTitle || !title) {
      res.status(400).json({ message: 'Course and title are required.' });
      return;
    }
    const assignment = {
      id: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      courseTitle,
      title,
      instructions: cleanMultilineText(req.body?.instructions, 4000),
      dueDate: cleanText(req.body?.dueDate, 40),
      maxScore: Number(req.body?.maxScore) || 100,
      createdAt: new Date().toISOString(),
    };
    const assignments = await readJsonFile('course-assignments');
    assignments.push(assignment);
    await writeJsonFile('course-assignments', assignments);
    res.status(201).json({ assignment });
  } catch (error) {
    console.error('Admin assignment create failed:', error);
    res.status(500).json({ message: 'Could not create assignment.' });
  }
});

app.put('/api/admin/assignments/:id', requireAdmin, async (req, res) => {
  try {
    const assignments = await readJsonFile('course-assignments');
    const index = assignments.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Assignment not found.' }); return; }
    const courseTitle = cleanText(req.body?.courseTitle, 120) || assignments[index].courseTitle;
    const title = cleanText(req.body?.title, 160) || assignments[index].title;
    assignments[index] = {
      ...assignments[index],
      courseTitle,
      title,
      instructions: req.body?.instructions !== undefined ? cleanMultilineText(req.body.instructions, 4000) : assignments[index].instructions,
      dueDate: req.body?.dueDate !== undefined ? cleanText(req.body.dueDate, 40) : assignments[index].dueDate,
      maxScore: req.body?.maxScore !== undefined ? (Number(req.body.maxScore) || 100) : assignments[index].maxScore,
      updatedAt: new Date().toISOString(),
    };
    await writeJsonFile('course-assignments', assignments);
    res.json({ assignment: assignments[index] });
  } catch (error) {
    console.error('Admin assignment update failed:', error);
    res.status(500).json({ message: 'Could not update assignment.' });
  }
});

app.delete('/api/admin/assignments/:id', requireAdmin, async (req, res) => {
  try {
    const assignments = await readJsonFile('course-assignments');
    const index = assignments.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Assignment not found.' }); return; }
    const [deleted] = assignments.splice(index, 1);
    await writeJsonFile('course-assignments', assignments);

    const submissions = await readJsonFile('assignment-submissions');
    const remaining = [];
    for (const sub of submissions) {
      if (sub.assignmentId !== deleted.id) { remaining.push(sub); continue; }
      if (sub.fileUrl) {
        const filePath = path.join(ASSIGNMENT_UPLOAD_DIR, path.basename(sub.fileUrl));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    await writeJsonFile('assignment-submissions', remaining);
    res.json({ assignment: deleted });
  } catch (error) {
    console.error('Admin assignment delete failed:', error);
    res.status(500).json({ message: 'Could not delete assignment.' });
  }
});

app.get('/api/admin/assignments/:id/submissions', requireAdmin, async (req, res) => {
  try {
    const submissions = await readJsonFile('assignment-submissions');
    const thread = submissions.filter((sub) => sub.assignmentId === req.params.id);
    res.json({ submissions: thread.map(publicAssignmentSubmission) });
  } catch (error) {
    console.error('Admin assignment submissions read failed:', error);
    res.status(500).json({ message: 'Could not load submissions.' });
  }
});

app.put('/api/admin/assignment-submissions/:id', requireAdmin, async (req, res) => {
  try {
    const submissions = await readJsonFile('assignment-submissions');
    const index = submissions.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Submission not found.' }); return; }
    const grade = req.body?.grade === '' || req.body?.grade === null || req.body?.grade === undefined
      ? null
      : Number(req.body.grade);
    submissions[index] = {
      ...submissions[index],
      grade,
      feedback: cleanText(req.body?.feedback, 2000),
      status: 'graded',
      gradedAt: new Date().toISOString(),
    };
    await writeJsonFile('assignment-submissions', submissions);
    await recordActivity('Graded assignment', submissions[index].studentName, `${submissions[index].studentEmail}: ${grade ?? '—'} points`);
    res.json({ submission: publicAssignmentSubmission(submissions[index]) });
  } catch (error) {
    console.error('Admin assignment grading failed:', error);
    res.status(500).json({ message: 'Could not save the grade.' });
  }
});

app.get('/api/admin/student-assignments/:studentId/:courseTitle', requireAdmin, async (req, res) => {
  try {
    const assignments = await readJsonFile('course-assignments');
    const courseAssignments = assignments.filter((item) => item.courseTitle === req.params.courseTitle);
    const submissions = await readJsonFile('assignment-submissions');
    const mine = submissions.filter((sub) => sub.studentId === req.params.studentId);

    const list = courseAssignments.map((item) => ({
      ...item,
      submission: publicAssignmentSubmission(mine.find((sub) => sub.assignmentId === item.id) || null),
    }));
    res.json({ assignments: list });
  } catch (error) {
    console.error('Admin student-assignment lookup failed:', error);
    res.status(500).json({ message: 'Could not load this student\'s assignments.' });
  }
});

app.get('/api/student/assignments', requireStudent, async (req, res) => {
  try {
    const orders = await readOrders();
    const studentEmail = (req.student.email || '').toLowerCase();
    const myOrders = orders.filter((order) => (order.email || '').toLowerCase() === studentEmail);

    const unlockedTitles = new Set();
    for (const order of myOrders) {
      const stage = courseStageFromOrderStatus(order.status);
      if (!CURRICULUM_UNLOCKED_STATUSES.has(stage.status)) continue;
      for (const title of orderUnlockedTitles(order)) unlockedTitles.add(title);
    }

    const assignments = await readJsonFile('course-assignments');
    const relevant = assignments.filter((item) => unlockedTitles.has(item.courseTitle));
    const submissions = await readJsonFile('assignment-submissions');
    const mine = submissions.filter((sub) => sub.studentId === req.student.id);

    const list = relevant
      .map((item) => ({
        ...item,
        submission: publicAssignmentSubmission(mine.find((sub) => sub.assignmentId === item.id) || null),
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ assignments: list });
  } catch (error) {
    console.error('Student assignments (all courses) read failed:', error);
    res.status(500).json({ message: 'Could not load your assignments.' });
  }
});

app.get('/api/student/courses/:courseTitle/assignments', requireStudent, async (req, res) => {
  try {
    const access = await studentCourseAccess(req.student.email, req.params.courseTitle);
    if (!access.enrolled) {
      res.status(403).json({ message: 'You are not enrolled in this course.', locked: true, reason: 'not_enrolled' });
      return;
    }
    if (!access.unlocked) {
      const reason = access.status === 'Cancelled' || access.status === 'Refunded' ? 'cancelled' : 'pending_payment';
      const message = reason === 'cancelled'
        ? 'This enrollment was cancelled, so assignments are not available.'
        : "Your payment for this course hasn't been confirmed yet. You'll get access to assignments as soon as it's validated.";
      res.status(402).json({ message, locked: true, reason, courseTitle: req.params.courseTitle, status: access.status });
      return;
    }

    const assignments = await readJsonFile('course-assignments');
    const courseAssignments = assignments.filter((item) => item.courseTitle === req.params.courseTitle);
    const submissions = await readJsonFile('assignment-submissions');
    const mine = submissions.filter((sub) => sub.studentId === req.student.id);

    const list = courseAssignments.map((item) => ({
      ...item,
      submission: publicAssignmentSubmission(mine.find((sub) => sub.assignmentId === item.id) || null),
    }));
    res.json({ assignments: list });
  } catch (error) {
    console.error('Student assignments read failed:', error);
    res.status(500).json({ message: 'Could not load assignments.' });
  }
});

app.post('/api/student/assignments/:id/submit', requireStudent, (req, res) => {
  uploadAssignmentFile.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File is too large. Maximum size is 15MB.' });
      return res.status(400).json({ message: err.message || 'File upload failed.' });
    }
    try {
      const assignments = await readJsonFile('course-assignments');
      const assignment = assignments.find((item) => item.id === req.params.id);
      if (!assignment) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(404).json({ message: 'Assignment not found.' });
        return;
      }

      const access = await studentCourseAccess(req.student.email, assignment.courseTitle);
      if (!access.enrolled || !access.unlocked) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(403).json({ message: 'You do not have access to this assignment.' });
        return;
      }
      if (!req.file && !cleanText(req.body?.notes, 2000)) {
        res.status(400).json({ message: 'Attach a file or add notes before submitting.' });
        return;
      }

      const submissions = await readJsonFile('assignment-submissions');
      const index = submissions.findIndex((sub) => sub.assignmentId === assignment.id && sub.studentId === req.student.id);

      if (index !== -1 && req.file && submissions[index].fileUrl) {
        const oldPath = path.join(ASSIGNMENT_UPLOAD_DIR, path.basename(submissions[index].fileUrl));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const record = {
        id: index !== -1 ? submissions[index].id : `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        assignmentId: assignment.id,
        courseTitle: assignment.courseTitle,
        studentId: req.student.id,
        studentName: req.student.name,
        studentEmail: req.student.email,
        fileUrl: req.file ? `/uploads/assignment-submissions/${req.file.filename}` : (index !== -1 ? submissions[index].fileUrl : ''),
        fileName: req.file ? req.file.originalname : (index !== -1 ? submissions[index].fileName : ''),
        notes: cleanText(req.body?.notes, 2000),
        status: 'submitted',
        grade: null,
        feedback: '',
        submittedAt: new Date().toISOString(),
        gradedAt: null,
      };
      if (index === -1) submissions.push(record);
      else submissions[index] = record;
      await writeJsonFile('assignment-submissions', submissions);
      res.json({ submission: publicAssignmentSubmission(record) });
    } catch (error) {
      console.error('Student assignment submit failed:', error);
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
      res.status(500).json({ message: 'Could not submit your assignment.' });
    }
  });
});

// ---- Quizzes ----

const DEFAULT_QUIZ_GRADING_SCALE = [
  { min: 90, max: 100, label: 'Excellent (A)' },
  { min: 80, max: 89, label: 'Very Good (B+)' },
  { min: 70, max: 79, label: 'Good (B)' },
  { min: 60, max: 69, label: 'Fair (C)' },
  { min: 0, max: 59, label: 'Needs Improvement' },
];

function quizGradeLabel(percent) {
  const match = DEFAULT_QUIZ_GRADING_SCALE.find((row) => percent >= row.min && percent <= row.max);
  return match?.label || '';
}

function quizQuestions(quiz) {
  return Array.isArray(quiz?.questions) ? quiz.questions : [];
}

function quizTotalMarks(quiz) {
  return Number(quiz?.totalMarks) || quizQuestions(quiz).reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
}

function publicQuizSummary(quiz) {
  return {
    id: quiz.id,
    courseTitle: quiz.courseTitle,
    courseCode: quiz.courseCode || '',
    title: quiz.title,
    duration: quiz.duration || '',
    totalMarks: quizTotalMarks(quiz),
    passingScore: Number(quiz.passingScore) || 0,
    questionCount: quizQuestions(quiz).length,
    assignedStudentId: quiz.assignedStudentId || '',
    assignedStudentName: quiz.assignedStudentName || '',
    createdAt: quiz.createdAt,
  };
}

function publicQuizForTaking(quiz) {
  return {
    ...publicQuizSummary(quiz),
    learningOutcomes: Array.isArray(quiz.learningOutcomes) ? quiz.learningOutcomes : [],
    questions: quizQuestions(quiz).map((q) => ({ id: q.id, text: q.text, options: q.options || [], marks: Number(q.marks) || 0 })),
  };
}

function publicQuizAttempt(attempt) {
  if (!attempt) return null;
  return {
    id: attempt.id,
    quizId: attempt.quizId,
    studentId: attempt.studentId,
    studentName: attempt.studentName,
    studentEmail: attempt.studentEmail,
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    percent: attempt.percent,
    passed: attempt.passed,
    grade: attempt.grade,
    answers: attempt.answers,
    breakdown: attempt.breakdown,
    submittedAt: attempt.submittedAt,
  };
}

function gradeQuiz(quiz, answers) {
  const questions = quizQuestions(quiz);
  const totalMarks = quizTotalMarks(quiz);
  let score = 0;
  const breakdown = questions.map((q) => {
    const marks = Number(q.marks) || 0;
    const hasAnswer = answers && Object.prototype.hasOwnProperty.call(answers, q.id);
    const selectedIndex = hasAnswer ? Number(answers[q.id]) : null;
    const correct = selectedIndex === Number(q.correctIndex);
    if (correct) score += marks;
    return {
      id: q.id,
      text: q.text,
      options: q.options || [],
      correctIndex: Number(q.correctIndex),
      selectedIndex,
      correct,
      marks,
    };
  });
  const percent = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const passed = percent >= (Number(quiz.passingScore) || 0);
  return { score, totalMarks, percent, passed, grade: quizGradeLabel(percent), breakdown };
}

function validateQuizQuestions(questions) {
  if (!Array.isArray(questions) || !questions.length) return 'Add at least one question.';
  for (const q of questions) {
    if (!q?.text || !Array.isArray(q.options) || q.options.filter(Boolean).length < 2) {
      return 'Every question needs text and at least 2 options.';
    }
    const correctIndex = Number(q.correctIndex);
    if (Number.isNaN(correctIndex) || correctIndex < 0 || correctIndex >= q.options.length) {
      return `Question "${q.text}" needs a valid correct answer.`;
    }
  }
  return '';
}

function cleanQuizQuestions(questions) {
  return questions.map((q, i) => ({
    id: q.id || `q${i + 1}`,
    text: cleanText(q.text, 500),
    options: q.options.map((opt) => cleanText(opt, 200)),
    correctIndex: Number(q.correctIndex),
    marks: Number(q.marks) || 2,
  }));
}

app.get('/api/admin/quizzes', requireAdmin, async (req, res) => {
  try {
    const quizzes = await readJsonFile('course-quizzes');
    const attempts = await readJsonFile('quiz-attempts');
    const filtered = req.query.courseTitle ? quizzes.filter((item) => item.courseTitle === req.query.courseTitle) : quizzes;
    const withCounts = filtered.map((item) => {
      const mine = attempts.filter((a) => a.quizId === item.id);
      return { ...item, attemptCount: mine.length, passCount: mine.filter((a) => a.passed).length };
    });
    res.json({ quizzes: withCounts });
  } catch (error) {
    console.error('Admin quizzes read failed:', error);
    res.status(500).json({ message: 'Could not load quizzes.' });
  }
});

app.post('/api/admin/quizzes', requireAdmin, async (req, res) => {
  try {
    const courseTitle = cleanText(req.body?.courseTitle, 120);
    const title = cleanText(req.body?.title, 160);
    if (!courseTitle || !title) { res.status(400).json({ message: 'Course and title are required.' }); return; }
    const questionError = validateQuizQuestions(req.body?.questions);
    if (questionError) { res.status(400).json({ message: questionError }); return; }

    const cleanQuestions = cleanQuizQuestions(req.body.questions);
    const quiz = {
      id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      courseTitle,
      courseCode: cleanText(req.body?.courseCode, 40),
      title,
      duration: cleanText(req.body?.duration, 40),
      passingScore: Number(req.body?.passingScore) || 70,
      totalMarks: Number(req.body?.totalMarks) || cleanQuestions.reduce((sum, q) => sum + q.marks, 0),
      learningOutcomes: Array.isArray(req.body?.learningOutcomes) ? req.body.learningOutcomes.map((item) => cleanText(item, 300)) : [],
      assignedStudentId: cleanText(req.body?.assignedStudentId, 80),
      assignedStudentName: cleanText(req.body?.assignedStudentName, 120),
      questions: cleanQuestions,
      createdAt: new Date().toISOString(),
    };
    const quizzes = await readJsonFile('course-quizzes');
    quizzes.push(quiz);
    await writeJsonFile('course-quizzes', quizzes);
    res.status(201).json({ quiz });
  } catch (error) {
    console.error('Admin quiz create failed:', error);
    res.status(500).json({ message: 'Could not create quiz.' });
  }
});

app.put('/api/admin/quizzes/:id', requireAdmin, async (req, res) => {
  try {
    const quizzes = await readJsonFile('course-quizzes');
    const index = quizzes.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Quiz not found.' }); return; }

    const questions = req.body?.questions !== undefined ? req.body.questions : quizzes[index].questions;
    const questionError = validateQuizQuestions(questions);
    if (questionError) { res.status(400).json({ message: questionError }); return; }
    const cleanQuestions = cleanQuizQuestions(questions);

    quizzes[index] = {
      ...quizzes[index],
      courseTitle: cleanText(req.body?.courseTitle, 120) || quizzes[index].courseTitle,
      courseCode: req.body?.courseCode !== undefined ? cleanText(req.body.courseCode, 40) : quizzes[index].courseCode,
      title: cleanText(req.body?.title, 160) || quizzes[index].title,
      duration: req.body?.duration !== undefined ? cleanText(req.body.duration, 40) : quizzes[index].duration,
      passingScore: req.body?.passingScore !== undefined ? (Number(req.body.passingScore) || 70) : quizzes[index].passingScore,
      totalMarks: req.body?.totalMarks !== undefined ? (Number(req.body.totalMarks) || 0) : quizzes[index].totalMarks,
      learningOutcomes: Array.isArray(req.body?.learningOutcomes)
        ? req.body.learningOutcomes.map((item) => cleanText(item, 300))
        : quizzes[index].learningOutcomes,
      assignedStudentId: req.body?.assignedStudentId !== undefined ? cleanText(req.body.assignedStudentId, 80) : quizzes[index].assignedStudentId,
      assignedStudentName: req.body?.assignedStudentName !== undefined ? cleanText(req.body.assignedStudentName, 120) : quizzes[index].assignedStudentName,
      questions: cleanQuestions,
      updatedAt: new Date().toISOString(),
    };
    await writeJsonFile('course-quizzes', quizzes);
    res.json({ quiz: quizzes[index] });
  } catch (error) {
    console.error('Admin quiz update failed:', error);
    res.status(500).json({ message: 'Could not update quiz.' });
  }
});

app.delete('/api/admin/quizzes/:id', requireAdmin, async (req, res) => {
  try {
    const quizzes = await readJsonFile('course-quizzes');
    const index = quizzes.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Quiz not found.' }); return; }
    const [deleted] = quizzes.splice(index, 1);
    await writeJsonFile('course-quizzes', quizzes);

    const attempts = await readJsonFile('quiz-attempts');
    const remaining = attempts.filter((a) => a.quizId !== deleted.id);
    await writeJsonFile('quiz-attempts', remaining);
    res.json({ quiz: deleted });
  } catch (error) {
    console.error('Admin quiz delete failed:', error);
    res.status(500).json({ message: 'Could not delete quiz.' });
  }
});

app.get('/api/admin/quizzes/:id/attempts', requireAdmin, async (req, res) => {
  try {
    const attempts = await readJsonFile('quiz-attempts');
    const thread = attempts.filter((a) => a.quizId === req.params.id);
    res.json({ attempts: thread.map(publicQuizAttempt) });
  } catch (error) {
    console.error('Admin quiz attempts read failed:', error);
    res.status(500).json({ message: 'Could not load attempts.' });
  }
});

app.get('/api/student/quizzes', requireStudent, async (req, res) => {
  try {
    const orders = await readOrders();
    const studentEmail = (req.student.email || '').toLowerCase();
    const myOrders = orders.filter((order) => (order.email || '').toLowerCase() === studentEmail);

    const unlockedTitles = new Set();
    for (const order of myOrders) {
      const stage = courseStageFromOrderStatus(order.status);
      if (!CURRICULUM_UNLOCKED_STATUSES.has(stage.status)) continue;
      for (const title of orderUnlockedTitles(order)) unlockedTitles.add(title);
    }

    const quizzes = await readJsonFile('course-quizzes');
    const relevant = quizzes.filter((item) => {
      if (!unlockedTitles.has(item.courseTitle)) return false;
      if (item.assignedStudentId && item.assignedStudentId !== req.student.id) return false;
      return true;
    });
    const attempts = await readJsonFile('quiz-attempts');
    const mine = attempts.filter((a) => a.studentId === req.student.id);

    const list = relevant
      .map((item) => ({
        ...publicQuizSummary(item),
        attempt: publicQuizAttempt(mine.find((a) => a.quizId === item.id) || null),
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ quizzes: list });
  } catch (error) {
    console.error('Student quizzes read failed:', error);
    res.status(500).json({ message: 'Could not load your quizzes.' });
  }
});

app.get('/api/student/quizzes/:id', requireStudent, async (req, res) => {
  try {
    const quizzes = await readJsonFile('course-quizzes');
    const quiz = quizzes.find((item) => item.id === req.params.id);
    if (!quiz) { res.status(404).json({ message: 'Quiz not found.' }); return; }
    if (quiz.assignedStudentId && quiz.assignedStudentId !== req.student.id) {
      res.status(403).json({ message: 'This quiz was assigned to a different student.' });
      return;
    }

    const access = await studentCourseAccess(req.student.email, quiz.courseTitle);
    if (!access.enrolled) {
      res.status(403).json({ message: 'You are not enrolled in this course.', locked: true, reason: 'not_enrolled' });
      return;
    }
    if (!access.unlocked) {
      const reason = access.status === 'Cancelled' || access.status === 'Refunded' ? 'cancelled' : 'pending_payment';
      const message = reason === 'cancelled'
        ? 'This enrollment was cancelled, so this quiz is not available.'
        : "Your payment for this course hasn't been confirmed yet. You'll get access to this quiz as soon as it's validated.";
      res.status(402).json({ message, locked: true, reason, courseTitle: quiz.courseTitle, status: access.status });
      return;
    }

    const attempts = await readJsonFile('quiz-attempts');
    const mine = attempts.find((a) => a.quizId === quiz.id && a.studentId === req.student.id);
    res.json({ quiz: publicQuizForTaking(quiz), attempt: publicQuizAttempt(mine || null) });
  } catch (error) {
    console.error('Student quiz read failed:', error);
    res.status(500).json({ message: 'Could not load this quiz.' });
  }
});

app.post('/api/student/quizzes/:id/submit', requireStudent, async (req, res) => {
  try {
    const quizzes = await readJsonFile('course-quizzes');
    const quiz = quizzes.find((item) => item.id === req.params.id);
    if (!quiz) { res.status(404).json({ message: 'Quiz not found.' }); return; }
    if (quiz.assignedStudentId && quiz.assignedStudentId !== req.student.id) {
      res.status(403).json({ message: 'This quiz was assigned to a different student.' });
      return;
    }

    const access = await studentCourseAccess(req.student.email, quiz.courseTitle);
    if (!access.enrolled || !access.unlocked) {
      res.status(403).json({ message: 'You do not have access to this quiz.' });
      return;
    }

    const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const result = gradeQuiz(quiz, answers);

    const attempts = await readJsonFile('quiz-attempts');
    const index = attempts.findIndex((a) => a.quizId === quiz.id && a.studentId === req.student.id);
    const record = {
      id: index !== -1 ? attempts[index].id : `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      quizId: quiz.id,
      courseTitle: quiz.courseTitle,
      studentId: req.student.id,
      studentName: req.student.name,
      studentEmail: req.student.email,
      answers,
      ...result,
      submittedAt: new Date().toISOString(),
    };
    if (index === -1) attempts.push(record);
    else attempts[index] = record;
    await writeJsonFile('quiz-attempts', attempts);
    res.json({ attempt: publicQuizAttempt(record) });
  } catch (error) {
    console.error('Student quiz submit failed:', error);
    res.status(500).json({ message: 'Could not submit your quiz.' });
  }
});

// ---- Student <-> Admin direct messaging ----

app.get('/api/student/messages', requireStudent, async (req, res) => {
  try {
    const all = await readJsonFile('student-messages');
    const thread = all.filter((item) => item.studentId === req.student.id);

    let changed = false;
    for (const item of thread) {
      if (item.sender === 'admin' && !item.readByStudent) {
        item.readByStudent = true;
        changed = true;
      }
    }
    if (changed) await writeJsonFile('student-messages', all);

    thread.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ messages: thread });
  } catch (error) {
    console.error('Student messages read failed:', error);
    res.status(500).json({ message: 'Could not load your messages.' });
  }
});

app.get('/api/student/messages/unread-count', requireStudent, async (req, res) => {
  try {
    const all = await readJsonFile('student-messages');
    const count = all.filter((item) => item.studentId === req.student.id && item.sender === 'admin' && !item.readByStudent).length;
    res.json({ count });
  } catch (error) {
    console.error('Student unread message count failed:', error);
    res.status(500).json({ message: 'Could not load your messages.' });
  }
});

app.post('/api/student/messages', requireStudent, messageLimiter, async (req, res) => {
  try {
    const all = await readJsonFile('student-messages');

    if (req.body?.type === 'call') {
      const callType = req.body?.callType === 'audio' ? 'audio' : 'video';
      const roomName = `hiklass-${req.student.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        studentId: req.student.id,
        studentEmail: req.student.email,
        studentName: req.student.name,
        sender: 'student',
        type: 'call',
        callType,
        roomName,
        body: `Started a ${callType} call`,
        createdAt: new Date().toISOString(),
        readByStudent: true,
        readByAdmin: false,
      };
      all.push(record);
      await writeJsonFile('student-messages', all);
      res.status(201).json({ message: record });
      return;
    }

    const body = cleanText(req.body?.body, 2000);
    if (!body) { res.status(400).json({ message: 'Message cannot be empty.' }); return; }

    const record = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId: req.student.id,
      studentEmail: req.student.email,
      studentName: req.student.name,
      sender: 'student',
      type: 'text',
      body,
      createdAt: new Date().toISOString(),
      readByStudent: true,
      readByAdmin: false,
    };
    all.push(record);
    await writeJsonFile('student-messages', all);
    res.status(201).json({ message: record });
  } catch (error) {
    console.error('Student message send failed:', error);
    res.status(500).json({ message: 'Could not send your message.' });
  }
});

app.post('/api/student/messages/voice', requireStudent, messageLimiter, uploadVoiceNote.single('audio'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ message: 'No audio recorded.' }); return; }

    const all = await readJsonFile('student-messages');
    const record = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId: req.student.id,
      studentEmail: req.student.email,
      studentName: req.student.name,
      sender: 'student',
      type: 'voice',
      audioUrl: `/uploads/voice-notes/${req.file.filename}`,
      body: 'Voice note',
      createdAt: new Date().toISOString(),
      readByStudent: true,
      readByAdmin: false,
    };
    all.push(record);
    await writeJsonFile('student-messages', all);
    res.status(201).json({ message: record });
  } catch (error) {
    console.error('Student voice note send failed:', error);
    res.status(500).json({ message: 'Could not send your voice note.' });
  }
});

app.get('/api/admin/messages/conversations', requireAdmin, async (_req, res) => {
  try {
    const all = await readJsonFile('student-messages');
    const byStudent = new Map();
    for (const item of all) {
      const existing = byStudent.get(item.studentId);
      if (!existing || new Date(item.createdAt) > new Date(existing.lastMessageAt)) {
        byStudent.set(item.studentId, {
          studentId: item.studentId,
          studentName: item.studentName,
          studentEmail: item.studentEmail,
          lastMessage: item.body,
          lastMessageSender: item.sender,
          lastMessageAt: item.createdAt,
        });
      }
    }
    const conversations = [...byStudent.values()].map((conv) => ({
      ...conv,
      unreadCount: all.filter((item) => item.studentId === conv.studentId && item.sender === 'student' && !item.readByAdmin).length,
    })).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    res.json({ conversations });
  } catch (error) {
    console.error('Admin conversations read failed:', error);
    res.status(500).json({ message: 'Could not load conversations.' });
  }
});

app.get('/api/admin/messages/:studentId', requireAdmin, async (req, res) => {
  try {
    const all = await readJsonFile('student-messages');
    const thread = all.filter((item) => item.studentId === req.params.studentId);

    let changed = false;
    for (const item of thread) {
      if (item.sender === 'student' && !item.readByAdmin) {
        item.readByAdmin = true;
        changed = true;
      }
    }
    if (changed) await writeJsonFile('student-messages', all);

    thread.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ messages: thread });
  } catch (error) {
    console.error('Admin message thread read failed:', error);
    res.status(500).json({ message: 'Could not load this conversation.' });
  }
});

app.post('/api/admin/messages/:studentId', requireAdmin, messageLimiter, async (req, res) => {
  try {
    const accounts = await readJsonFile('student-accounts');
    const account = accounts.find((item) => item.id === req.params.studentId);
    if (!account) { res.status(404).json({ message: 'Student account not found.' }); return; }

    const all = await readJsonFile('student-messages');

    if (req.body?.type === 'call') {
      const callType = req.body?.callType === 'audio' ? 'audio' : 'video';
      const roomName = `hiklass-${account.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        studentId: account.id,
        studentEmail: account.email,
        studentName: account.name,
        sender: 'admin',
        type: 'call',
        callType,
        roomName,
        body: `Started a ${callType} call`,
        createdAt: new Date().toISOString(),
        readByStudent: false,
        readByAdmin: true,
      };
      all.push(record);
      await writeJsonFile('student-messages', all);
      await recordActivity(`Started a ${callType} call`, account.id, account.name);
      res.status(201).json({ message: record });
      return;
    }

    const body = cleanText(req.body?.body, 2000);
    if (!body) { res.status(400).json({ message: 'Message cannot be empty.' }); return; }

    const record = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId: account.id,
      studentEmail: account.email,
      studentName: account.name,
      sender: 'admin',
      type: 'text',
      body,
      createdAt: new Date().toISOString(),
      readByStudent: false,
      readByAdmin: true,
    };
    all.push(record);
    await writeJsonFile('student-messages', all);
    await recordActivity('Replied to student', account.id, account.name);
    res.status(201).json({ message: record });
  } catch (error) {
    console.error('Admin message send failed:', error);
    res.status(500).json({ message: 'Could not send your reply.' });
  }
});

app.post('/api/admin/messages/:studentId/voice', requireAdmin, messageLimiter, uploadVoiceNote.single('audio'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ message: 'No audio recorded.' }); return; }

    const accounts = await readJsonFile('student-accounts');
    const account = accounts.find((item) => item.id === req.params.studentId);
    if (!account) { res.status(404).json({ message: 'Student account not found.' }); return; }

    const all = await readJsonFile('student-messages');
    const record = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId: account.id,
      studentEmail: account.email,
      studentName: account.name,
      sender: 'admin',
      type: 'voice',
      audioUrl: `/uploads/voice-notes/${req.file.filename}`,
      body: 'Voice note',
      createdAt: new Date().toISOString(),
      readByStudent: false,
      readByAdmin: true,
    };
    all.push(record);
    await writeJsonFile('student-messages', all);
    await recordActivity('Sent a voice note', account.id, account.name);
    res.status(201).json({ message: record });
  } catch (error) {
    console.error('Admin voice note send failed:', error);
    res.status(500).json({ message: 'Could not send your voice note.' });
  }
});

app.get('/api/student/dashboard', requireStudent, async (req, res) => {
  try {
    const orders = await readOrders();
    const myOrders = orders
      .filter((order) => (order.email || '').toLowerCase() === req.student.email)
      .map(enrichOrder)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const paymentsRaw = await readJsonFile('payments');
    const myPayments = mergeByKey(derivePaymentsFromOrders(myOrders), paymentsRaw, (payment) => payment.enrollmentId || payment.id)
      .filter((payment) => myOrders.some((order) => order.id === payment.enrollmentId));

    const courseMap = new Map();
    for (const order of myOrders) {
      const stage = courseStageFromOrderStatus(order.status);
      for (const course of order.courses || []) {
        const key = course.title;
        const existing = courseMap.get(key);
        if (!existing || ORDER_STAGE_RANK[stage.status] > ORDER_STAGE_RANK[existing.status]) {
          courseMap.set(key, { title: key, ...stage });
        }
      }
    }
    const packageMap = new Map();
    for (const order of myOrders) {
      const stage = courseStageFromOrderStatus(order.status);
      for (const item of order.packages || []) {
        const key = item.name;
        const existing = packageMap.get(key);
        if (!existing || ORDER_STAGE_RANK[stage.status] > ORDER_STAGE_RANK[existing.status]) {
          packageMap.set(key, { name: key, duration: item.duration || '', courses: item.courses || [], ...stage });
        }
      }
    }

    const totalOrders = myOrders.length;
    const completedOrders = myOrders.filter((order) => String(order.status).toLowerCase() === 'completed').length;
    const pendingOrders = myOrders.filter((order) => ['pending', 'confirmed'].includes(String(order.status).toLowerCase())).length;
    const paidPayments = myPayments.filter((payment) => payment.status === 'Paid').length;
    const totalPaid = myPayments.filter((payment) => payment.status === 'Paid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const enrollmentProgress = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0;

    const activityByDay = new Map();
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      activityByDay.set(day.toISOString().slice(0, 10), { date: day.toISOString().slice(0, 10), label: day.toLocaleDateString('en-US', { weekday: 'short' }), orders: 0 });
    }
    for (const order of myOrders) {
      const key = String(order.createdAt || '').slice(0, 10);
      if (activityByDay.has(key)) activityByDay.get(key).orders += 1;
    }

    const [announcements, upcomingItems] = await Promise.all([
      readJsonFile('announcements'),
      readJsonFile('upcoming-items'),
    ]);
    const latestAnnouncements = [...announcements]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);
    const nextUpcomingItems = [...upcomingItems]
      .filter((item) => new Date(item.date) >= new Date(now.toDateString()))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 6);

    res.json({
      student: req.student,
      orders: myOrders.slice(0, 6),
      latestOrder: myOrders[0] || null,
      latestPayment: myOrders[0] ? myPayments.find((payment) => payment.enrollmentId === myOrders[0].id) || null : null,
      stats: {
        purchasedCourses: courseMap.size,
        purchasedPackages: packageMap.size,
        totalOrders,
        completedOrders,
        pendingOrders,
        paidPayments,
        totalPaid,
        enrollmentProgress,
      },
      courses: [...courseMap.values()],
      packages: [...packageMap.values()],
      activity: [...activityByDay.values()],
      announcements: latestAnnouncements,
      upcomingItems: nextUpcomingItems,
    });
  } catch (error) {
    console.error('Student dashboard read failed:', error);
    res.status(500).json({ message: 'Could not load your dashboard.' });
  }
});

// ---- Announcements ----

app.get('/api/announcements', async (_req, res) => {
  try {
    const announcements = await readJsonFile('announcements');
    res.json({ announcements: announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  } catch (error) {
    console.error('Announcements read failed:', error);
    res.status(500).json({ message: 'Could not load announcements.' });
  }
});

app.get('/api/admin/announcements', requireAdmin, async (_req, res) => {
  try {
    const announcements = await readJsonFile('announcements');
    res.json({ announcements });
  } catch (error) {
    console.error('Admin announcements read failed:', error);
    res.status(500).json({ message: 'Could not load announcements.' });
  }
});

app.post('/api/admin/announcements', requireAdmin, async (req, res) => {
  try {
    const title = cleanText(req.body?.title, 140);
    const body = cleanText(req.body?.body, 600);
    const icon = ['course', 'schedule', 'system'].includes(req.body?.icon) ? req.body.icon : 'system';
    if (!title || !body) { res.status(400).json({ message: 'Title and body are required.' }); return; }

    const announcements = await readJsonFile('announcements');
    const announcement = { id: createAdminId('ann'), title, body, icon, createdAt: new Date().toISOString() };
    announcements.push(announcement);
    await writeJsonFile('announcements', announcements);
    res.status(201).json({ announcement });
  } catch (error) {
    console.error('Admin announcement create failed:', error);
    res.status(500).json({ message: 'Could not create announcement.' });
  }
});

app.put('/api/admin/announcements/:id', requireAdmin, async (req, res) => {
  try {
    const announcements = await readJsonFile('announcements');
    const index = announcements.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Announcement not found.' }); return; }
    const title = cleanText(req.body?.title, 140) || announcements[index].title;
    const body = cleanText(req.body?.body, 600) || announcements[index].body;
    const icon = ['course', 'schedule', 'system'].includes(req.body?.icon) ? req.body.icon : announcements[index].icon;
    announcements[index] = { ...announcements[index], title, body, icon, updatedAt: new Date().toISOString() };
    await writeJsonFile('announcements', announcements);
    res.json({ announcement: announcements[index] });
  } catch (error) {
    console.error('Admin announcement update failed:', error);
    res.status(500).json({ message: 'Could not update announcement.' });
  }
});

app.delete('/api/admin/announcements/:id', requireAdmin, async (req, res) => {
  try {
    const announcements = await readJsonFile('announcements');
    const index = announcements.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Announcement not found.' }); return; }
    const deleted = announcements.splice(index, 1)[0];
    await writeJsonFile('announcements', announcements);
    res.json({ announcement: deleted });
  } catch (error) {
    console.error('Admin announcement delete failed:', error);
    res.status(500).json({ message: 'Could not delete announcement.' });
  }
});

// ---- Upcoming items (calendar) ----

app.get('/api/upcoming-items', async (_req, res) => {
  try {
    const items = await readJsonFile('upcoming-items');
    res.json({ upcomingItems: items.sort((a, b) => new Date(a.date) - new Date(b.date)) });
  } catch (error) {
    console.error('Upcoming items read failed:', error);
    res.status(500).json({ message: 'Could not load upcoming items.' });
  }
});

app.get('/api/admin/upcoming-items', requireAdmin, async (_req, res) => {
  try {
    const items = await readJsonFile('upcoming-items');
    res.json({ upcomingItems: items });
  } catch (error) {
    console.error('Admin upcoming items read failed:', error);
    res.status(500).json({ message: 'Could not load upcoming items.' });
  }
});

app.post('/api/admin/upcoming-items', requireAdmin, async (req, res) => {
  try {
    const title = cleanText(req.body?.title, 140);
    const type = ['class', 'assignment', 'quiz'].includes(req.body?.type) ? req.body.type : 'class';
    const date = new Date(req.body?.date || '');
    if (!title || Number.isNaN(date.getTime())) { res.status(400).json({ message: 'Title and a valid date are required.' }); return; }

    const items = await readJsonFile('upcoming-items');
    const item = { id: createAdminId('event'), title, type, date: date.toISOString(), createdAt: new Date().toISOString() };
    items.push(item);
    await writeJsonFile('upcoming-items', items);
    res.status(201).json({ upcomingItem: item });
  } catch (error) {
    console.error('Admin upcoming item create failed:', error);
    res.status(500).json({ message: 'Could not create upcoming item.' });
  }
});

app.put('/api/admin/upcoming-items/:id', requireAdmin, async (req, res) => {
  try {
    const items = await readJsonFile('upcoming-items');
    const index = items.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Upcoming item not found.' }); return; }
    const title = cleanText(req.body?.title, 140) || items[index].title;
    const type = ['class', 'assignment', 'quiz'].includes(req.body?.type) ? req.body.type : items[index].type;
    const parsedDate = req.body?.date ? new Date(req.body.date) : null;
    const date = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : items[index].date;
    items[index] = { ...items[index], title, type, date, updatedAt: new Date().toISOString() };
    await writeJsonFile('upcoming-items', items);
    res.json({ upcomingItem: items[index] });
  } catch (error) {
    console.error('Admin upcoming item update failed:', error);
    res.status(500).json({ message: 'Could not update upcoming item.' });
  }
});

app.delete('/api/admin/upcoming-items/:id', requireAdmin, async (req, res) => {
  try {
    const items = await readJsonFile('upcoming-items');
    const index = items.findIndex((item) => item.id === req.params.id);
    if (index === -1) { res.status(404).json({ message: 'Upcoming item not found.' }); return; }
    const deleted = items.splice(index, 1)[0];
    await writeJsonFile('upcoming-items', items);
    res.json({ upcomingItem: deleted });
  } catch (error) {
    console.error('Admin upcoming item delete failed:', error);
    res.status(500).json({ message: 'Could not delete upcoming item.' });
  }
});

// ---- Admin profile / avatar routes ----

app.get('/api/admin/profile', requireAdmin, async (_req, res) => {
  try {
    const profilePath = path.join(DATA_DIR, 'admin-profile.json');
    let user = { name: 'Admin', email: ADMIN_EMAIL || 'admin@hiklassacademy.com', role: 'Super Admin', avatarUrl: '' };
    if (fs.existsSync(profilePath)) {
      const existing = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
      user = { ...user, ...existing };
    }
    res.json({ user });
  } catch { res.status(500).json({ message: 'Could not load profile.' }); }
});

app.put('/api/admin/profile', requireAdmin, async (req, res) => {
  try {
    const profilePath = path.join(DATA_DIR, 'admin-profile.json');
    const existing = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : {};
    const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    const tmp = path.join(DATA_DIR, `admin-profile-tmp-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify(updated, null, 2));
    fs.renameSync(tmp, profilePath);
    res.json({ user: updated });
  } catch { res.status(500).json({ message: 'Could not update profile.' }); }
});

app.post('/api/admin/profile/avatar', requireAdmin, (req, res) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 2MB.' });
      return res.status(400).json({ success: false, message: err.message || 'File upload failed.' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided.' });
    try {
      const profilePath = path.join(DATA_DIR, 'admin-profile.json');
      const existing = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : {};
      if (existing.avatarUrl) {
        const oldPath = path.join(AVATAR_DIR, path.basename(existing.avatarUrl));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const avatarUrl = `/uploads/admin-avatars/${req.file.filename}`;
      const updated = { ...existing, avatarUrl, updatedAt: new Date().toISOString() };
      const tmp = path.join(DATA_DIR, `admin-profile-tmp-${Date.now()}.json`);
      fs.writeFileSync(tmp, JSON.stringify(updated, null, 2));
      fs.renameSync(tmp, profilePath);
      res.json({ success: true, message: 'Avatar uploaded successfully', data: { avatarUrl }, user: updated });
    } catch { res.status(500).json({ success: false, message: 'Could not save avatar.' }); }
  });
});

app.delete('/api/admin/profile/avatar', requireAdmin, async (_req, res) => {
  try {
    const profilePath = path.join(DATA_DIR, 'admin-profile.json');
    const existing = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : {};
    if (existing.avatarUrl) {
      const oldPath = path.join(AVATAR_DIR, path.basename(existing.avatarUrl));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const updated = { ...existing, avatarUrl: '', updatedAt: new Date().toISOString() };
    const tmp = path.join(DATA_DIR, `admin-profile-tmp-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify(updated, null, 2));
    fs.renameSync(tmp, profilePath);
    res.json({ success: true, message: 'Avatar removed', data: { avatarUrl: '' }, user: updated });
  } catch { res.status(500).json({ success: false, message: 'Could not remove avatar.' }); }
});

const clientDistCandidates = [
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(__dirname, '..', 'dist'),
];
const clientDist = clientDistCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')))
  || clientDistCandidates[0];
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'API route not found.' });
});

if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('*', (_req, res) => {
    res.status(404).json({ message: 'Frontend build not found. Run npm run build before production start.' });
  });
}

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    console.error('Upload rejected:', error);
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'That file is too large.' : error.message;
    res.status(400).json({ message });
    return;
  }
  if (error?.status === 400) {
    console.error('Upload rejected:', error);
    res.status(400).json({ message: error.message });
    return;
  }
  console.error('Unhandled server error:', error);
  res.status(500).json({ message: 'Internal server error.' });
});

async function startServer(port = PORT, options = {}) {
  await migrateLegacyDataFiles();
  await refreshCoursePriceCache();

  try {
    const storedSettings = await readJsonFile('settings');
    setSmtpOverride(storedSettings[0] || null);
  } catch (error) {
    console.error('Could not load stored settings for SMTP override:', error);
  }

  const numericPort = Number(port);
  const maxRetries = Number(options.maxRetries ?? (process.env.NODE_ENV !== 'production' ? 10 : 0));
  let attempts = 0;

  function listen(nextPort) {
    const server = app.listen(nextPort, () => {
      console.log(`Server running on http://localhost:${nextPort}`);
      verifySmtpOnStartup().catch((error) => {
        console.error('Unexpected error while verifying SMTP on startup (server kept running):', error);
      });
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE' && attempts < maxRetries) {
        attempts += 1;
        const retryPort = nextPort + 1;
        console.warn(`Port ${nextPort} is already in use. Trying ${retryPort}...`);
        listen(retryPort);
        return;
      }

      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${nextPort} is already in use. Set PORT to an available port.`);
      } else {
        console.error('Server failed to start:', error);
      }
      process.exitCode = 1;
    });

    return server;
  }

  if (!Number.isInteger(numericPort) || numericPort <= 0 || numericPort > 65535) {
    throw new Error(`Invalid PORT value: ${port}`);
  }

  return listen(numericPort);
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception (server kept running):', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (server kept running):', reason);
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}

export {
  app,
  enrichOrder,
  startServer,
  sendOrderEmails,
  studentTemplate,
  adminTemplate,
  enrollmentStatusTemplate,
};

