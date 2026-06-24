import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import nodemailer from 'nodemailer';
import multer from 'multer';
import fs from 'fs';
import fsp from 'fs/promises';
import net from 'net';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_FILE = path.join(__dirname, '.env');
const DATA_DIR = path.join(__dirname, '..', 'storage');
const ORDERS_FILE = path.join(DATA_DIR, 'course-orders.json');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@hiklassacademy.com';
const ADMIN_LOGIN_EMAIL = process.env.ADMIN_LOGIN_EMAIL || ADMIN_EMAIL || 'admin@hiklassacademy.com';
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'HIKLASS Academy';
const ORDER_EMAIL_SENT_MESSAGE = 'Your order was saved successfully. An automated confirmation email has been sent to your email address.';
const ORDER_PUBLIC_SUCCESS_MESSAGE = 'Your order was saved successfully. HIKLASS Academy will contact you shortly.';
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
const COURSE_PRICES = new Map([
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

app.use('/uploads', express.static(UPLOADS_DIR));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a few minutes and try again.' },
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

function cleanText(value, maxLength = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
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
};

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

function createAdminId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultAdminCourses() {
  return [...COURSE_PRICES.entries()].map(([title, price]) => ({
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
  return String(value).trim().replace(/^(['"])(.*)\1$/, '$2');
}

function smtpConfig(overrides = {}) {
  const host = envValue('SMTP_HOST', 'MAIL_HOST', 'EMAIL_HOST') || 'smtp.hostinger.com';
  const port = Number(envValue('SMTP_PORT', 'MAIL_PORT') || 465);
  const secureValue = envValue('SMTP_SECURE', 'MAIL_SECURE') || 'true';
  const user = envValue('SMTP_USER', 'SMTP_USERNAME', 'MAIL_USER', 'MAIL_USERNAME', 'EMAIL_USER');
  const pass = envValue('SMTP_PASS', 'SMTP_PASSWORD', 'MAIL_PASS', 'MAIL_PASSWORD', 'EMAIL_PASS', 'EMAIL_PASSWORD');
  return {
    host: overrides.host || host,
    port: overrides.port || port,
    secure: typeof overrides.secure === 'boolean' ? overrides.secure : String(secureValue).toLowerCase() === 'true',
    user,
    pass,
    from: envValue('SMTP_FROM') || `"${BUSINESS_NAME}" <${user}>`,
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
  const studentEmail = await sendMailWithSmtpCandidates({
    to: order.email,
    subject: 'Enrollment Request Received',
    text: orderPlainText(order),
    html: studentTemplate(order),
    attachments: logoAttachments,
  }, 'student confirmation email');

  let adminEmailSent = false;
  const warnings = [];

  try {
    await sendMailWithSmtpCandidates({
      to: ADMIN_EMAIL,
      replyTo: order.email,
      subject: `New Course Enrollment Request from ${order.name}`,
      text: orderPlainText(order, 'New Course Enrollment Request'),
      html: adminTemplate(order),
      attachments: logoAttachments,
    }, 'admin notification email');
    adminEmailSent = true;
  } catch (error) {
    const warning = `admin: ${explainSmtpError(error, error.smtpLastConfig)}`;
    warnings.push(warning);
    console.warn('Partial email delivery failure:', warning);
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

app.post('/api/admin/auth/login', async (req, res) => {
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

app.get('/api/admin/courses', requireAdmin, async (_req, res) => {
  try {
    const stored = await readJsonFile('courses');
    res.json({ courses: stored.length ? stored : defaultAdminCourses() });
  } catch (error) {
    console.error('Admin courses read failed:', error);
    res.status(500).json({ message: 'Could not load courses.' });
  }
});

app.post('/api/admin/courses', requireAdmin, async (req, res) => {
  try {
    const courses = await readCoursesForAdminWrite();
    const course = {
      id: `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...req.body,
    };
    courses.push(course);
    await writeJsonFile('courses', courses);
    res.status(201).json({ course });
  } catch (error) {
    console.error('Admin course create failed:', error);
    res.status(500).json({ message: 'Could not create course.' });
  }
});

app.put('/api/admin/courses/:id', requireAdmin, async (req, res) => {
  try {
    const courses = await readCoursesForAdminWrite();
    const index = courses.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ message: 'Course not found.' });
      return;
    }
    courses[index] = { ...courses[index], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await writeJsonFile('courses', courses);
    res.json({ course: courses[index] });
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
    res.json({ course: deleted });
  } catch (error) {
    console.error('Admin course delete failed:', error);
    res.status(500).json({ message: 'Could not delete course.' });
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
    res.json({ package: deleted });
  } catch (error) {
    console.error('Admin package delete failed:', error);
    res.status(500).json({ message: 'Could not delete package.' });
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
      ]),
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
    res.json({ instructor: deleted });
  } catch (error) {
    console.error('Admin instructor delete failed:', error);
    res.status(500).json({ message: 'Could not delete instructor.' });
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

app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  try {
    const stored = await readJsonFile('settings');
    res.json({
      settings: stored[0] || {
        academyName: BUSINESS_NAME,
        supportEmail: ADMIN_EMAIL,
        primaryWhatsApp: WHATSAPP_PRIMARY,
        currency: 'FCFA',
        timezone: 'Africa/Lagos',
        emailNotifications: true,
      },
    });
  } catch (error) {
    console.error('Admin settings read failed:', error);
    res.status(500).json({ message: 'Could not load settings.' });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const settings = {
      ...sanitizePayload(req.body, {
        academyName: { max: 120 },
        supportEmail: { max: 180 },
        primaryWhatsApp: { max: 40 },
        currency: { max: 12 },
        timezone: { max: 80 },
        emailNotifications: { type: 'boolean' },
      }),
      updatedAt: new Date().toISOString(),
    };
    await writeJsonFile('settings', [settings]);
    await recordActivity('Updated settings', 'settings', settings.academyName);
    res.json({ settings });
  } catch (error) {
    console.error('Admin settings update failed:', error);
    res.status(500).json({ message: 'Could not update settings.' });
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
      message: ORDER_PUBLIC_SUCCESS_MESSAGE,
      orderId: savedOrder.id,
      totalAmount: savedOrder.totalAmount,
      subtotal: savedOrder.subtotal,
      discountCode: savedOrder.discountCode,
      discountAmount: savedOrder.discountAmount,
      grandTotal: savedOrder.grandTotal,
      emailSent: false,
    });
  }
}

app.post('/api/enrollments', orderLimiter, handleOrder);
app.post('/api/orders', orderLimiter, handleOrder);
app.post('/api/course-orders', orderLimiter, handleOrder);
app.post('/api/api/enrollments', orderLimiter, handleOrder);
app.post('/enrollments', orderLimiter, handleOrder);
app.post('/api/enquiries', orderLimiter, handleOrder);

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

