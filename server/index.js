import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import nodemailer from 'nodemailer';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import fsp from 'fs/promises';
import net from 'net';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

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
let smtpOverride = null;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-insecure-student-jwt-secret');
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn('JWT_SECRET is not set; using an insecure development fallback. Set JWT_SECRET in server/.env before deploying.');
}
const STUDENT_TOKEN_EXPIRY = '30d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'HIKLASS Academy';
const ORDER_EMAIL_SENT_MESSAGE = '🎉 Your order has been received successfully! A confirmation email has been sent to your registered email address. Please check your inbox for your order details and further instructions.';
const ORDER_EMAIL_INTRO = 'This automated email confirms that your order was saved successfully. Please keep this message for your records.';
const EMAIL_LOGO_SVG_CID = 'hiklass-logo-horizontal-svg';
const EMAIL_LOGO_PNG_CID = 'hiklass-email-logo-png';
const EMAIL_WHATSAPP_SVG_CID = 'hiklass-whatsapp-svg';
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
const AVATAR_DIR = path.join(UPLOADS_DIR, 'admin-avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
const STUDENT_AVATAR_DIR = path.join(UPLOADS_DIR, 'student-avatars');
if (!fs.existsSync(STUDENT_AVATAR_DIR)) fs.mkdirSync(STUDENT_AVATAR_DIR, { recursive: true });

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
  else cb(new Error('Only JPG, PNG, and WEBP files are allowed.'));
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
if (!fs.existsSync(INSTRUCTOR_AVATAR_DIR)) fs.mkdirSync(INSTRUCTOR_AVATAR_DIR, { recursive: true });
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
if (!fs.existsSync(COURSE_IMAGE_DIR)) fs.mkdirSync(COURSE_IMAGE_DIR, { recursive: true });
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
if (!fs.existsSync(PACKAGE_IMAGE_DIR)) fs.mkdirSync(PACKAGE_IMAGE_DIR, { recursive: true });
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
if (!fs.existsSync(ASSIGNMENT_UPLOAD_DIR)) fs.mkdirSync(ASSIGNMENT_UPLOAD_DIR, { recursive: true });
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
  else cb(new Error('Only PDF, Word, Excel, PowerPoint, ZIP, JPG, PNG, and WEBP files are allowed.'));
}
const uploadAssignmentFile = multer({ storage: assignmentStorage, fileFilter: assignmentFileFilter, limits: { fileSize: ASSIGNMENT_MAX_SIZE } });

app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(UPLOADS_DIR));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
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
  max: 15,
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

await migrateLegacyDataFiles();
await refreshCoursePriceCache();

try {
  const storedSettings = await readJsonFile('settings');
  smtpOverride = storedSettings[0] || null;
} catch (error) {
  console.error('Could not load stored settings for SMTP override:', error);
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

function hasSmtpConfig() {
  const config = smtpConfig();
  return Boolean(config.host && config.port && config.user && config.pass);
}

function smtpTimeoutMs() {
  return Number(process.env.SMTP_TIMEOUT_MS || 30000);
}

function envValue(...keys) {
  const value = keys.map((key) => process.env[key]).find((item) => item);
  if (value === undefined || value === null) return '';
  return String(value).trim().replace(/^(['"])(.*)\1$/, '$2');
}

function smtpPassword() {
  const encodedPassword = envValue('SMTP_PASS_BASE64');
  const validBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(encodedPassword) && encodedPassword.length % 4 === 0;
  if (validBase64) {
    try {
      const decodedPassword = Buffer.from(encodedPassword, 'base64').toString('utf8');
      if (decodedPassword) return decodedPassword;
    } catch (error) {
      console.error('SMTP_PASS_BASE64 could not be decoded:', error?.message || error);
    }
  } else if (encodedPassword) {
    console.error('SMTP_PASS_BASE64 is not valid Base64. Falling back to SMTP_PASS.');
  }
  return envValue('SMTP_PASS', 'SMTP_PASSWORD', 'MAIL_PASS', 'MAIL_PASSWORD', 'EMAIL_PASS', 'EMAIL_PASSWORD');
}

function smtpConfig(overrides = {}) {
  const host = smtpOverride?.smtpHost || envValue('SMTP_HOST', 'MAIL_HOST', 'EMAIL_HOST') || 'smtp.hostinger.com';
  const port = Number(smtpOverride?.smtpPort || envValue('SMTP_PORT', 'MAIL_PORT') || 465);
  const secureValue = smtpOverride && typeof smtpOverride.smtpSecure === 'boolean'
    ? smtpOverride.smtpSecure
    : (envValue('SMTP_SECURE', 'MAIL_SECURE') || 'true');
  const user = smtpOverride?.smtpUser || envValue('SMTP_USER', 'SMTP_USERNAME', 'MAIL_USER', 'MAIL_USERNAME', 'EMAIL_USER');
  const pass = smtpOverride?.smtpPass || smtpPassword();
  return {
    host: overrides.host || host,
    port: overrides.port || port,
    secure: typeof overrides.secure === 'boolean' ? overrides.secure : String(secureValue).toLowerCase() === 'true',
    user,
    pass,
    from: smtpOverride?.smtpFrom || envValue('SMTP_FROM') || `"${BUSINESS_NAME}" <${user}>`,
  };
}

function smtpConfigCandidates() {
  const config = smtpConfig();
  const hosts = [
    'smtp.hostinger.com',
    config.host,
  ].filter(Boolean);
  const uniqueHosts = [...new Set(hosts.map((host) => host.trim()).filter(Boolean))];
  const candidates = [];
  for (const host of uniqueHosts) {
    candidates.push(smtpConfig({ host }));
    candidates.push(smtpConfig({ host, port: 587, secure: false }));
    candidates.push(smtpConfig({ host, port: 465, secure: true }));
  }
  return [...new Map(candidates.map((config) => [`${config.host}:${config.port}:${config.secure}`, config])).values()];
}

function createTransporter(config = smtpConfig()) {
  if (!hasSmtpConfig()) return null;
  const timeout = smtpTimeoutMs();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    family: 4,
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout,
    tls: {
      servername: config.host,
    },
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

async function createVerifiedTransporter() {
  if (!hasSmtpConfig()) return null;

  let lastError;
  let lastConfig;
  const attempts = [];
  for (const config of smtpConfigCandidates()) {
    let transporter;
    try {
      await checkSmtpPort(config);
      transporter = createTransporter(config);
      await withTimeout(
        transporter.verify(),
        smtpTimeoutMs(),
        'SMTP verification timed out before authentication completed.',
      );
      return { transporter, config };
    } catch (error) {
      transporter?.close();
      lastError = error;
      lastConfig = config;
      attempts.push({
        host: config.host,
        port: config.port,
        secure: config.secure,
        code: error?.code || 'SMTP_ERROR',
        message: explainSmtpError(error, config),
      });
      console.error(`SMTP verification failed for ${config.host}:${config.port}:`, explainSmtpError(error, config));
    }
  }

  const error = lastError || new Error('SMTP verification failed for every configured host.');
  error.smtpAttempts = attempts;
  error.smtpLastConfig = lastConfig;
  throw error;
}

async function sendMailWithSmtpCandidates(mailOptions, label = 'email') {
  if (!hasSmtpConfig()) {
    throw new Error('SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to server/.env.');
  }

  let lastError;
  let lastConfig;
  const attempts = [];

  for (const config of smtpConfigCandidates()) {
    const mailVariants = [
      mailOptions,
      mailOptions.attachments?.length ? { ...mailOptions, attachments: [] } : null,
    ].filter(Boolean);

    for (const variant of mailVariants) {
      let transporter;
      const variantLabel = variant.attachments?.length ? 'with attachments' : 'without attachments';
      try {
        await checkSmtpPort(config);
        transporter = createTransporter(config);
        await withTimeout(
          transporter.verify(),
          smtpTimeoutMs(),
          'SMTP verification timed out before authentication completed.',
        );

        const info = await withTimeout(
          transporter.sendMail({
            ...variant,
            from: config.from,
          }),
          smtpTimeoutMs(),
          'SMTP timed out before email delivery completed.',
        );

        return { info, config, attempts };
      } catch (error) {
        lastError = error;
        lastConfig = config;
        const message = explainSmtpError(error, config);
        attempts.push({
          host: config.host,
          port: config.port,
          secure: config.secure,
          attachments: Boolean(variant.attachments?.length),
          code: error?.code || 'SMTP_ERROR',
          message,
        });
        console.error(`SMTP ${label} failed for ${config.host}:${config.port} ${variantLabel}:`, message);
      } finally {
        transporter?.close();
      }
    }
  }

  const error = lastError || new Error(`${label} delivery failed for every configured SMTP host.`);
  error.smtpAttempts = attempts;
  error.smtpLastConfig = lastConfig;
  throw error;
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function explainSmtpError(error, config = smtpConfig()) {
  if (error?.code === 'EACCES') {
    return `Outbound SMTP is blocked by this machine or network for ${config.host}:${config.port}. Allow SMTP submission or deploy from a host that permits it.`;
  }

  if (error?.code === 'ENOTFOUND') {
    return `SMTP host ${config.host} does not resolve in DNS. Check SMTP_HOST in server/.env.`;
  }

  if (error?.code === 'ECONNREFUSED') {
    return `SMTP host ${config.host}:${config.port} refused the connection. Check the host, port, and secure setting.`;
  }

  if (error?.code === 'ETIMEDOUT' || /timed out/i.test(error?.message || '')) {
    return `SMTP connection to ${config.host}:${config.port} timed out. This is usually a firewall, ISP, or hosting outbound-port block.`;
  }

  if (error?.code === 'EAUTH') {
    return `SMTP authentication failed for ${config.user || 'the configured user'} on ${config.host}:${config.port}. Check SMTP_USER and SMTP_PASS in the production environment variables.`;
  }

  return error?.message || 'Email delivery failed for an unknown SMTP reason.';
}

function publicEmailFailureMessage(error) {
  const reason = error?.code === 'EAUTH'
    ? 'the email service login failed'
    : error?.code === 'ENOTFOUND'
      ? 'the email server could not be found'
      : error?.code === 'ECONNREFUSED'
        ? 'the email server refused the connection'
        : error?.code === 'ETIMEDOUT' || /timed out/i.test(error?.message || '')
          ? 'the email server connection timed out'
          : 'the email service is temporarily unavailable';

  return `Your order was saved successfully, but the confirmation email could not be sent because ${reason}. HIKLASS Academy will contact you shortly.`;
}

function checkSmtpPort(config = smtpConfig()) {
  if (!hasSmtpConfig()) {
    return Promise.reject(new Error('SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to server/.env.'));
  }

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: config.host,
      port: config.port,
      family: 4,
      timeout: Math.min(smtpTimeoutMs(), 6000),
    });

    socket.once('connect', () => {
      socket.destroy();
      resolve();
    });

    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error(`SMTP connection timed out for ${config.host}:${config.port}.`));
    });

    socket.once('error', (error) => {
      reject(error);
    });
  });
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
    socialIconsSvgPath: findLogoAsset('social-icons.svg'),
  };
}

function emailLogoAttachments() {
  const { pngPath } = emailLogoAssets();
  return [
    pngPath
      ? {
          filename: path.basename(pngPath),
          path: pngPath,
          cid: EMAIL_LOGO_PNG_CID,
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
  const whatsappIcon = '<span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:#1B5E20;color:#FFFFFF;font-size:20px;line-height:34px;text-align:center;font-weight:700">W</span>';
  const whatsappMessage = encodeURIComponent('Hi HIKLASS Academy, I need assistance.');
  const primaryWhatsAppLink = `https://wa.me/${WHATSAPP_PRIMARY}?text=${whatsappMessage}`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F3F7FF" style="border-collapse:separate;background:#F3F7FF;border-radius:8px;margin-top:34px">
      <tr>
        <td class="hiklass-contact-column" width="24%" valign="middle" style="padding:18px 14px;border-right:1px solid #CBD5E1">
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            <tr>
              <td width="46">${emailIconCircle('&#127911;', '#1E2F97', '#DCEBFF')}</td>
              <td style="padding-left:10px;color:#1E2F97;font-size:14px;line-height:18px;font-weight:700">NEED<br>ASSISTANCE?</td>
            </tr>
          </table>
        </td>
        <td class="hiklass-contact-column" width="25%" valign="top" style="padding:18px 14px;border-right:1px solid #CBD5E1">
          <a href="${primaryWhatsAppLink}" style="color:#1B5E20;font-size:14px;line-height:18px;font-weight:700;text-decoration:none">WhatsApp</a>
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:5px">
            <tr>
              <td width="34" valign="top"><a href="${primaryWhatsAppLink}" style="text-decoration:none">${whatsappIcon}</a></td>
              <td style="padding-left:8px;color:#111827;font-size:13px;line-height:18px;font-weight:700">
                <a href="${primaryWhatsAppLink}" style="color:#111827;text-decoration:none">+237 651 251 941</a>
              </td>
            </tr>
          </table>
        </td>
        <td class="hiklass-contact-column" width="22%" valign="top" style="padding:18px 14px;border-right:1px solid #CBD5E1">
          <div style="color:#1E2F97;font-size:14px;line-height:18px;font-weight:700">&#9993;&nbsp;&nbsp;Email</div>
          <div style="margin-top:8px;color:#111827;font-size:13px;line-height:18px">info@hiklassacademy.com</div>
        </td>
        <td class="hiklass-contact-column" width="29%" valign="top" style="padding:18px 14px">
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
          <div style="margin-top:14px">${socialIcons}</div>
          <div style="margin-top:14px;color:#6B7280;font-size:12px;line-height:18px">&copy; 2026 HIKLASS Digital Agency. All Rights Reserved.</div>
        </td>
      </tr>
    </table>`;
}

function emailShell({ heroTitle, heroSubtitle, greeting, intro, contentHtml, ctaIcon, ctaLabel, ctaMessage }) {
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

function studentTemplate(order) {
  return emailShell({
    heroTitle: 'Enrollment Request Received',
    heroSubtitle: 'Thank you for choosing HIKLASS Academy.',
    greeting: `Hello <span style="color:#1E2F97">${safeEmailText(order.name)}</span>,`,
    intro: ORDER_EMAIL_INTRO,
    contentHtml: `
      ${twoColumnRow(selectedCoursesCard(order), selectedPackageCard(order))}
      ${twoColumnRow(studentInformationCard(order), totalAmountCard(order))}`,
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

function orderPlainText(order, heading = 'Enrollment Request Received') {
  const courseLines = (order.courses || []).map((course) => `- ${courseTitle(course)}: ${formatXaf(coursePrice(course))}`);
  const packageLines = (order.packages || []).map((item) => `- ${packageName(item)} (${packageDuration(item)}): ${formatXaf(packagePrice(item))}`);

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
  const studentSubject = 'Enrollment Request Received';
  let studentEmail;
  try {
    studentEmail = await sendMailWithSmtpCandidates({
      to: order.email,
      subject: studentSubject,
      text: orderPlainText(order),
      html: studentTemplate(order),
      attachments: logoAttachments,
    }, 'student confirmation email');
    await recordEmailDelivery({
      id: `${order.id}-student`,
      recipient: order.email,
      subject: studentSubject,
      status: 'Sent',
    });
  } catch (error) {
    await recordEmailDelivery({
      id: `${order.id}-student`,
      recipient: order.email,
      subject: studentSubject,
      status: 'Failed',
      errorMessage: explainSmtpError(error, error.smtpLastConfig),
    });
    throw error;
  }

  let adminEmailSent = false;
  const warnings = [];
  const adminSubject = `New Course Enrollment Request from ${order.name}`;

  try {
    await sendMailWithSmtpCandidates({
      to: ADMIN_EMAIL,
      replyTo: order.email,
      subject: adminSubject,
      text: orderPlainText(order, 'New Course Enrollment Request'),
      html: adminTemplate(order),
      attachments: logoAttachments,
    }, 'admin notification email');
    adminEmailSent = true;
    await recordEmailDelivery({
      id: `${order.id}-admin`,
      recipient: ADMIN_EMAIL,
      subject: adminSubject,
      status: 'Sent',
    });
  } catch (error) {
    const warning = `admin: ${explainSmtpError(error, error.smtpLastConfig)}`;
    warnings.push(warning);
    console.warn('Partial email delivery failure:', warning);
    await recordEmailDelivery({
      id: `${order.id}-admin`,
      recipient: ADMIN_EMAIL,
      subject: adminSubject,
      status: 'Failed',
      errorMessage: explainSmtpError(error, error.smtpLastConfig),
    });
  }

  return {
    studentEmailSent: Boolean(studentEmail.info),
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

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'HIKLASS Academy backend is running',
  });
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
    smtpOverride = settings;
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

async function studentCourseAccess(studentEmail, targetCourseTitle) {
  const orders = await readOrders();
  const myOrders = orders.filter((order) => (order.email || '').toLowerCase() === studentEmail);

  let best = null;
  for (const order of myOrders) {
    const enrichedTitles = (order.courses || []).map((course) => courseTitle(course));
    if (!enrichedTitles.includes(targetCourseTitle)) continue;
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
      for (const course of order.courses || []) unlockedTitles.add(courseTitle(course));
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
      for (const course of order.courses || []) unlockedTitles.add(courseTitle(course));
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
    const body = cleanText(req.body?.body, 2000);
    if (!body) { res.status(400).json({ message: 'Message cannot be empty.' }); return; }

    const all = await readJsonFile('student-messages');
    const record = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId: req.student.id,
      studentEmail: req.student.email,
      studentName: req.student.name,
      sender: 'student',
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
    const body = cleanText(req.body?.body, 2000);
    if (!body) { res.status(400).json({ message: 'Message cannot be empty.' }); return; }

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
  console.error('Unhandled server error:', error);
  res.status(500).json({ message: 'Internal server error.' });
});

function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

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

