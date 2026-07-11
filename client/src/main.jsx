import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpenCheck,
  BookOpen,
  Box,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  CreditCard,
  Download,
  Gift,
  Grid2X2,
  GraduationCap,
  Heart,
  Inbox,
  Layers3,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  Mail,
  MessageSquare,
  Package,
  Phone,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
  Video,
  WalletCards,
  X,
} from 'lucide-react';
import { brandAssets, uiAssets } from './assets/index.js';
import { categories, courses } from './data/courses.js';
import { packages } from './data/packages.js';
import { defaultTestimonials } from './data/testimonials.js';
import Modal from './components/admin/Modal.jsx';
import ConfirmDialog from './components/admin/ConfirmDialog.jsx';
import Toast from './components/admin/Toast.jsx';
import AdminTopbar from './components/admin/AdminTopbar.jsx';
import ProfilePage from './components/admin/ProfilePage.jsx';
import PaymentDetailsPanel from './components/PaymentDetailsPanel.jsx';
import PaymentMethodSelector from './components/PaymentMethodSelector.jsx';
import SmartsuppChat from './components/SmartsuppChat.jsx';
import SiteHeader from './components/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminContentManager from './pages/admin/AdminContentManager.jsx';
import AdminBlogManager from './pages/admin/AdminBlogManager.jsx';
import BlogPage from './pages/BlogPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import StudentLogin from './pages/student/StudentLogin.jsx';
import StudentRegister from './pages/student/StudentRegister.jsx';
import StudentResetPassword from './pages/student/StudentResetPassword.jsx';
import StudentPortal from './pages/student/StudentPortal.jsx';
import { paymentMethodOptions } from './data/paymentMethods.js';
import { submitEnrollment, fetchTestimonials, submitTestimonial } from './services/api.js';
import { ADMIN_TOKEN_KEY, clearAdminSession, getStoredAdminToken } from './services/authService.js';
import { getStoredStudentToken } from './services/studentAuthService.js';
import API_URL from './utils/apiBaseUrl.js';
import getAssetUrl from './utils/getAssetUrl.js';
import './styles.css';

const WHATSAPP_NUMBER = '237651251941';
const DASHBOARD_POLL_MS = 30000;

const initialForm = {
  name: '',
  phone: '',
  email: '',
  mode: 'Online',
  notes: '',
  paymentMethod: '',
};

const PAYMENT_METHODS = paymentMethodOptions;

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('en-US')} FCFA`;
}

const faqs = [
  ['Who can enroll at HIKLASS Academy?', 'Anyone with a passion for learning can enroll. Our programs are designed for beginners, students, professionals, entrepreneurs, and anyone looking to acquire or improve digital skills.'],
  ['Do I need prior computer knowledge?', 'No. Many of our courses, such as Basic Computer Training and Microsoft Office Suite, are beginner-friendly. Advanced courses have recommended prerequisites, which are clearly indicated.'],
  ['Are the classes physical or online?', 'We offer flexible learning options:\n• Physical Classroom Training\n• Live Online Classes\n• Hybrid Learning (Physical + Online)\n\nYou can choose the mode that best suits your schedule.'],
  ['How long do the courses last?', 'Course durations vary depending on the program. They range from 2 weeks for short courses to 6 months for comprehensive professional programs.'],
  ['Will I receive a certificate after completing a course?', 'Yes. Students who successfully complete their course requirements and assessments receive an official HIKLASS Academy Certificate of Completion.'],
  ['What payment methods do you accept?', 'We accept multiple payment options:\n\n• MTN Mobile Money (MoMo)\n• Orange Money (OM)\n• PayPal\n• Cash Payment (At Our Office)'],
  ['Can I pay in installments?', 'Yes. Selected professional programs allow installment payments. Please contact our admissions team for available payment plans.'],
  ['What equipment do I need?', 'A laptop or desktop computer is highly recommended for most courses. For online classes, you will also need a stable internet connection.'],
  ['Will I work on real-world projects?', 'Absolutely! Every course includes practical assignments, hands-on exercises, and real-world projects to help you build a professional portfolio.'],
  ['Are your instructors experienced?', 'Yes. Our instructors are experienced industry professionals with practical knowledge and years of experience in their respective fields.'],
  ['Can I enroll in more than one course?', 'Yes. You can enroll in multiple courses or choose one of our professionally curated learning packages for faster career development.'],
  ['What happens after I submit my enrollment request?', 'Our admissions team will review your application and send a confirmation email with your enrollment details, payment instructions, and the next steps.'],
  ['Can I switch to another course later?', "Yes. Course transfers are possible within the Academy's transfer policy. Contact the admissions office for assistance."],
  ['Do you offer support after enrollment?', 'Yes. Students receive continuous academic support, instructor guidance, live chat assistance, and access to learning resources throughout their training.'],
  ['How do I contact HIKLASS Academy?', '📞 WhatsApp:\n+237 651 251 941\n+237 671 320 385\n\n📧 Email:\ninfo@hiklassacademy.com\n\n🌐 Website:\nhttps://hiklassacademy.com\n\nOur support team is always ready to assist you before, during, and after your learning journey.'],
];

function selectedTotal(selectedCourses, selectedPackages) {
  return (
    selectedCourses.reduce((sum, course) => sum + course.price, 0) +
    selectedPackages.reduce((sum, item) => sum + item.price, 0)
  );
}

function formatWhatsAppCourses(selectedCourses) {
  if (!selectedCourses.length) return 'None';
  return selectedCourses.map((course) => `- ${course.title}: ${formatPrice(course.price)}`).join('\n');
}

function formatWhatsAppPackages(selectedPackages) {
  if (!selectedPackages.length) return 'None';
  return selectedPackages
    .map((item) => [
      `- ${item.name}: ${formatPrice(item.price)}`,
      `  Duration: ${item.duration}`,
      '',
      '  Includes:',
      ...item.courses.map((course) => `  - ${course}`),
    ].join('\n'))
    .join('\n\n');
}

function buildWhatsAppText(form, selectedCourses, selectedPackages, discount) {
  const subtotal = selectedTotal(selectedCourses, selectedPackages);
  const discountAmount = Number(discount?.discountAmount || 0);
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const message = [
    '*HIKLASS Academy Enrollment Request*',
    '',
    '*Student Information*',
    `- Name: ${form.name.trim() || 'None'}`,
    `- Email: ${form.email.trim() || 'None'}`,
    `- Phone: ${form.phone.trim() || 'None'}`,
    '',
    '*Selected Courses*',
    formatWhatsAppCourses(selectedCourses),
    '',
    '*Selected Packages*',
    formatWhatsAppPackages(selectedPackages),
    '',
    '*Discount Code*',
    discount?.code || 'None',
    '',
    '*Payment Method*',
    form.paymentMethod || 'None',
    '',
    '*Total Amount*',
    formatPrice(grandTotal),
    '',
    '*Learning Mode*',
    form.mode || 'None',
    '',
    '*Additional Notes*',
    form.notes.trim() || 'None',
    '',
    'Kindly assist me with my registration.',
    '',
    'Thank you.',
  ].join('\n');

  return encodeURIComponent(message);
}

function getOrderCourseTitle(course) {
  return typeof course === 'string' ? course : course?.title || 'Unknown course';
}

function getOrderCoursePrice(course) {
  return typeof course === 'object' && course?.price ? Number(course.price) : 0;
}

function getOrderPackageName(item) {
  return typeof item === 'string' ? item : item?.name || 'Unknown package';
}

function getOrderPackagePrice(item) {
  return typeof item === 'object' && item?.price ? Number(item.price) : 0;
}

function getOrderPackageDuration(item) {
  return typeof item === 'object' && item?.duration ? item.duration : 'Duration not set';
}

function getOrderPackageCourses(item) {
  return Array.isArray(item?.courses) ? item.courses : [];
}

function buildAdminWhatsAppText(order) {
  const courseLines = (order.courses || [])
    .map((course) => `- ${getOrderCourseTitle(course)}: ${formatPrice(getOrderCoursePrice(course))}`)
    .join('\n') || 'None';
  const packageLines = (order.packages || [])
    .map((item) => {
      const includedCourses = getOrderPackageCourses(item);
      return [
        `- ${getOrderPackageName(item)}: ${formatPrice(getOrderPackagePrice(item))}`,
        `  Duration: ${getOrderPackageDuration(item)}`,
        '',
        '  Includes:',
        ...(includedCourses.length ? includedCourses.map((course) => `  - ${course}`) : ['  - Not provided']),
      ].join('\n');
    })
    .join('\n\n') || 'None';
  const message = [
    '*HIKLASS Academy Enrollment Request*',
    '',
    '*Student Information*',
    `- Name: ${order.name || 'None'}`,
    `- Email: ${order.email || 'None'}`,
    `- Phone: ${order.phone || 'None'}`,
    '',
    '*Selected Courses*',
    courseLines,
    '',
    '*Selected Packages*',
    packageLines,
    '',
    '*Discount Code*',
    order.discountCode || 'None',
    '',
    '*Payment Method*',
    order.paymentMethod || 'None',
    '',
    '*Total Amount*',
    formatPrice(order.grandTotal || order.totalAmount || 0),
    '',
    '*Learning Mode*',
    order.mode || 'None',
    '',
    '*Additional Notes*',
    order.notes || 'None',
    '',
    'Kindly assist me with my registration.',
    '',
    'Thank you.',
  ].join('\n');

  return encodeURIComponent(message);
}

function WhatsAppBrandIcon({ size = 22 }) {
  return (
    <span className="whatsappIconCircle" aria-hidden="true">
      <img src={uiAssets.whatsappIcon} alt="" style={{ width: size, height: size }} />
    </span>
  );
}

function PaymentIcon({ method, size = 22 }) {
  if (method === 'MTN MOMO') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" rx="4" fill="#FFC107" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1A1A1A">MTN</text>
      </svg>
    );
  }
  if (method === 'Orange OM') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" rx="4" fill="#FF6600" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="700" fill="#FFFFFF">OM</text>
      </svg>
    );
  }
  if (method === 'PayPal') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="8" fill="#FFFFFF" />
        <rect x="1" y="1" width="38" height="38" rx="7" stroke="#E5E7EB" strokeWidth="2" />
        <path d="M13.6 10.5h9.2c3.6 0 5.8 2.1 5.2 5.4-.7 4.1-3.6 6.2-7.4 6.2h-2.5l-.9 5.8h-4.4l2.4-15.1c.2-1.3.9-2.3 2.4-2.3Z" fill="#003087" />
        <path d="M18.2 15.1h8.2c3.1 0 4.8 1.9 4.2 4.9-.7 3.7-3.3 5.7-6.8 5.7h-2.4l-.7 4.3h-4.2l2.1-13.1c.1-.8.6-1.8 1.8-1.8Z" fill="#009CDE" opacity="0.92" />
        <text x="20" y="35" textAnchor="middle" fontSize="6" fontWeight="700" fill="#003087">PayPal</text>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#1E2F97" />
      <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="700" fill="#FFFFFF">C</text>
    </svg>
  );
}

function formatDate(value) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function toCsvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

const adminPages = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'enrollments', label: 'Enrollments', icon: Inbox },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'blog', label: 'Blog', icon: BookOpenCheck },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'discounts', label: 'Discounts', icon: Gift },
  { id: 'instructors', label: 'Instructors', icon: BriefcaseBusiness },
  { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
  { id: 'messages', label: 'Messages', icon: Inbox },
  { id: 'email-logs', label: 'Email Logs', icon: Mail },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'admins', label: 'Admins', icon: UserRound },
  { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
  { id: 'activity-logs', label: 'Activity Logs', icon: Layers3 },
];

const adminSyncSections = [
  'students',
  'payments',
  'discounts',
  'instructors',
  'testimonials',
  'reports',
  'settings',
  'admins',
  'roles',
  'activity-logs',
];

function normalizeAdminPageId(pageId = '') {
  const normalized = String(pageId || '').trim().toLowerCase();
  if (!normalized || normalized === 'dashboard') return 'dashboard';
  const allowedPages = new Set([...adminPages.map((page) => page.id), 'profile']);
  return allowedPages.has(normalized) ? normalized : 'dashboard';
}

function getAdminPageFromPath(pathname = window.location.pathname) {
  const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (segments[0] !== 'admin') return 'dashboard';
  return normalizeAdminPageId(segments[1] || 'dashboard');
}

function getAdminPathForPage(pageId) {
  return `/admin/${normalizeAdminPageId(pageId)}`;
}

const statusColors = {
  Pending: '#F59E0B',
  Confirmed: '#2554A5',
  Paid: '#1B5E20',
  Completed: '#0F766E',
  Cancelled: '#D30D1A',
  Refunded: '#6B7280',
};

const fallbackMessages = [
  { id: 'msg-1', name: 'Armand Abega', message: 'Hello, I would like more information about the Developer Package...', createdAt: '2024-06-12T10:30:00' },
  { id: 'msg-2', name: 'Brenda M.', message: 'Good day, please I need assistance with my enrollment.', createdAt: '2024-06-12T09:45:00' },
];

function shortDate(value) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' }).format(new Date(value));
}

function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function getEnrollmentStatus(order) {
  return statusColors[order.status] ? order.status : 'Pending';
}

function studentAvatar(name = 'HA') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'HA';
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Sums (or counts, by default) records into "last 30 days" vs "the 30 days before that"
// buckets, based on a date field the caller extracts. Records with no valid date, or
// older than 60 days, are excluded rather than guessed at.
function windowSums(records, getDate, getValue = () => 1) {
  const now = Date.now();
  let recent = 0;
  let previous = 0;
  for (const record of records) {
    const raw = getDate(record);
    if (!raw) continue;
    const time = new Date(raw).getTime();
    if (Number.isNaN(time)) continue;
    const age = now - time;
    if (age < 0 || age > THIRTY_DAYS_MS * 2) continue;
    const value = getValue(record);
    if (age <= THIRTY_DAYS_MS) recent += value;
    else previous += value;
  }
  return { recent, previous };
}

function growthLabel({ recent, previous }) {
  if (previous === 0) return recent > 0 ? 'New' : '0%';
  const pct = ((recent - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function buildChartData(orders) {
  const recent = [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(-10);
  if (!recent.length) {
    return ['May 12', 'May 19', 'May 26', 'Jun 02', 'Jun 09'].map((label, index) => ({
      label,
      enrollments: [12, 24, 21, 46, 28][index],
      revenue: [1200000, 2100000, 2200000, 3900000, 1900000][index],
    }));
  }
  return recent.map((order, index) => ({
    label: shortDate(order.createdAt),
    enrollments: index + 1,
    revenue: Number(order.totalAmount || 0),
  }));
}

function buildStatusData(stats, totalOrders) {
  const counts = stats?.statusCounts || {};
  const fallback = totalOrders
    ? { Pending: Math.ceil(totalOrders * 0.35), Confirmed: Math.ceil(totalOrders * 0.41), Paid: Math.floor(totalOrders * 0.18), Cancelled: Math.max(0, totalOrders - Math.ceil(totalOrders * 0.35) - Math.ceil(totalOrders * 0.41) - Math.floor(totalOrders * 0.18)) }
    : { Pending: 45, Confirmed: 52, Paid: 23, Cancelled: 8 };
  return ['Pending', 'Confirmed', 'Paid', 'Completed', 'Cancelled', 'Refunded'].map((name) => ({ name, value: counts[name] ?? fallback[name] ?? 0 }));
}

function topCourseRows(stats) {
  const entries = Object.entries(stats?.courseCounts || {});
  const rows = entries.length
    ? entries
    : [
        ['Web Development', 28],
        ['Graphic Design', 22],
        ['Video Editing', 18],
        ['Digital Marketing', 15],
        ['Microsoft Office', 12],
      ];
  const max = Math.max(...rows.map(([, count]) => count), 1);
  return rows.slice(0, 5).map(([name, count], index) => ({ name, count, rank: index + 1, percent: Math.round((count / max) * 22) || 9 }));
}

function topPackageRows(stats) {
  const entries = Object.entries(stats?.packageCounts || {});
  const rows = entries.length
    ? entries
    : [
        ['Starter Package', 14],
        ['Developer Package', 11],
        ['Creative Package', 9],
        ['Professional Package', 7],
        ['Kids Holiday Package', 5],
      ];
  const max = Math.max(...rows.map(([, count]) => count), 1);
  return rows.slice(0, 5).map(([name, count], index) => ({ name, count, rank: index + 1, percent: Math.round((count / max) * 22) || 9 }));
}

function courseCatalogRows() {
  return courses.map((course) => ({ ...course, status: 'Active' }));
}

function Hero() {
  return (
    <section id="home" className="hero">
      <div className="heroCopy">
        <p className="eyebrow">
          <Sparkles size={18} />
          Holiday computer courses
        </p>
        <h1>Build practical tech skills during the holidays.</h1>
        <p className="lead">
          HIKLASS helps students, creatives, beginners, and professionals learn by building real projects in design,
          coding, AI, office tools, cybersecurity, and digital business.
        </p>
        <div className="heroActions">
          <a className="button primary redCta" href="#courses">
            Choose courses
            <ArrowRight size={18} />
          </a>
          <a className="button secondary" href="#enroll">
            Send order
            <Send size={18} />
          </a>
        </div>
        <div className="proofStrip" aria-label="Course highlights">
          <span>
            <strong>25</strong>
            course tracks
          </span>
          <span>
            <strong>3</strong>
            learning modes
          </span>
          <span>
            <strong>100%</strong>
            practical focus
          </span>
        </div>
      </div>

      <div className="heroVisual" aria-hidden="true">
        <img src={brandAssets.heroBanner} alt="" />
        <div className="skillChip chipOne">React</div>
        <div className="skillChip chipTwo">AI</div>
        <div className="skillChip chipThree">Excel</div>
        <div className="skillChip chipFour">Design</div>
      </div>
    </section>
  );
}

function CategorySection() {
  return (
    <section className="section" aria-labelledby="category-title">
      <div className="sectionIntro">
        <p className="eyebrow">Course categories</p>
        <h2 id="category-title">Pick a lane, or combine skills across tracks.</h2>
      </div>
      <div className="categoryGrid">
        {categories.map((category) => (
          <article className="categoryCard" key={category.name}>
            <Layers3 size={22} />
            <h3>{category.name}</h3>
            <p>{category.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const TOPIC_LIST_LIMIT = 6;

function CourseCard({ course, selected, onToggle }) {
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const isNewBadge = /new/i.test(course.badge || '');
  const topicsLong = course.topics.length > TOPIC_LIST_LIMIT;
  const visibleTopics = topicsExpanded || !topicsLong ? course.topics : course.topics.slice(0, TOPIC_LIST_LIMIT);
  return (
    <article className={selected ? 'courseCard selected' : 'courseCard'}>
      {course.badge ? (
        <span className={`courseCardBadge${isNewBadge ? ' isNew' : ''}`}>{course.badge}</span>
      ) : null}
      {course.image ? (
        <div className="courseCardImageWrap">
          <img className="courseCardImage" src={course.image} alt="" />
          <button
            type="button"
            className="selectButton courseCardSelectFloat"
            onClick={() => onToggle(course)}
            aria-pressed={selected}
          >
            {selected ? <Check size={16} /> : null}
            {selected ? 'Selected' : 'Select'}
          </button>
        </div>
      ) : null}
      <div className={`courseCardBody${!course.image ? ' noImage' : ''}`}>
        {!course.image ? (
          <div className="courseTop">
            <span className="courseBadge">
              <img src={course.icon} alt="" />
            </span>
            <button type="button" className="selectButton" onClick={() => onToggle(course)} aria-pressed={selected}>
              {selected ? <Check size={16} /> : null}
              {selected ? 'Selected' : 'Select'}
            </button>
          </div>
        ) : null}
        <p className="meta">{course.category}</p>
        <h3>{course.title}</h3>
        <p className="coursePrice">{formatPrice(course.price)}</p>
        <p className="duration">
          <Clock3 size={16} />
          {course.duration}
        </p>
        <p className="curriculumLabel">Course Curriculum</p>
        <div className="topicList">
          {visibleTopics.map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
        {topicsLong ? (
          <button type="button" className="readMoreToggle" onClick={() => setTopicsExpanded((current) => !current)}>
            {topicsExpanded ? 'Show less' : `+ ${course.topics.length - TOPIC_LIST_LIMIT} more`}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function CoursesSection({ selectedCourses, onToggle }) {
  const [query, setQuery] = useState('');
  const [livePricing, setLivePricing] = useState(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/courses`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load live pricing'))))
      .then((data) => {
        if (cancelled) return;
        const map = new Map((data.courses || []).map((course) => [course.title, course]));
        setLivePricing(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const liveCourses = useMemo(() => {
    if (!livePricing) return courses;
    return courses.map((course) => {
      const live = livePricing.get(course.title);
      if (!live) return course;
      return {
        ...course,
        price: live.price || course.price,
        duration: live.duration || course.duration,
        category: live.category || course.category,
        image: live.image ? getAssetUrl(live.image) : course.image,
      };
    });
  }, [livePricing]);

  const selectedTotal = selectedCourses.reduce((sum, course) => sum + course.price, 0);
  const filteredCourses = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return liveCourses;
    return liveCourses.filter((course) =>
      [course.title, course.category, course.duration, ...course.topics].join(' ').toLowerCase().includes(search),
    );
  }, [query, liveCourses]);

  return (
    <section id="courses" className="section coursesSection" aria-labelledby="courses-title">
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Course selection</p>
          <h2 id="courses-title">Select the courses you want to order.</h2>
        </div>
        <label className="searchBox">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses" />
        </label>
      </div>

      <div className="selectedSummary">
        <strong>{selectedCourses.length} selected</strong>
        <span>
          {selectedCourses.length
            ? `${selectedCourses.map((course) => course.title).join(', ')} - Total: ${formatPrice(selectedTotal)}`
            : 'Choose one or more courses below.'}
        </span>
      </div>

      <div className="courseGrid">
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            selected={selectedCourses.some((item) => item.id === course.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  );
}

const WHY_CHOOSE_REASONS = [
  ['Student dashboard', 'See every enrolled course, order, and payment in one dashboard with a live progress ring.', LayoutDashboard],
  ['Curriculum tracking', 'Move through modules and lessons with clear completed, in-progress, and locked states.', BookOpenCheck],
  ['Quizzes & assignments', 'Submit assignments and take auto-graded quizzes with instant scores and feedback.', ClipboardCheck],
  ['Live chat & video calls', 'Message your instructors, send voice notes, or start a one-click video call for support.', Video],
  ['Certificates', 'Earn a certificate of completion as proof of participation when you finish a course.', Award],
  ['Secure orders & payments', 'Every order and payment is validated and stored securely, with full history in your portal.', ShieldCheck],
];

const TRAINING_APPROACH_STEPS = [
  { step: 1, tone: 'blue', label: 'Learn the Fundamentals' },
  { step: 2, tone: 'red', label: 'Hands-on Practice' },
  { step: 3, tone: 'brown', label: 'Real-World Projects' },
  { step: 4, tone: 'dark', label: 'Portfolio Development' },
  { step: 5, tone: 'orange', label: 'Certification' },
  { step: 6, tone: 'green', label: 'Career Growth' },
];

function WhyChoose() {
  return (
    <section id="why" className="section whySection">
      <div className="sectionIntro">
        <p className="eyebrow">Why choose HIKLASS</p>
        <h2>Training built for confidence, not confusion.</h2>
      </div>
      <div className="whyGrid">
        {WHY_CHOOSE_REASONS.map(([title, description, Icon]) => (
          <article key={title} className="whyCard">
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <div className="whyApproachStrip">
        <strong>Our Training Approach</strong>
        <div className="whyApproachSteps">
          {TRAINING_APPROACH_STEPS.map((item) => (
            <div className="whyApproachStep" key={item.step}>
              <span className={`aboutStepCircle tone${item.tone[0].toUpperCase()}${item.tone.slice(1)}`}>{item.step}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PACKAGE_COURSE_LIST_LIMIT = 6;

function PackageCard({ item, selected, onToggle }) {
  const [coursesExpanded, setCoursesExpanded] = useState(false);
  const coursesLong = item.courses.length > PACKAGE_COURSE_LIST_LIMIT;
  const visibleCourses = coursesExpanded || !coursesLong ? item.courses : item.courses.slice(0, PACKAGE_COURSE_LIST_LIMIT);
  return (
    <button type="button" className={selected ? 'packageCard selectedPackage' : 'packageCard'} onClick={() => onToggle(item)} aria-pressed={selected}>
      {item.image ? (
        <div className="packageImageWrap">
          <img className="packageImage" src={item.image} alt="" />
          <div className="packageImageOverlayRow">
            <span className="packageDuration packageDurationOnPhoto">
              <Clock3 size={16} />
              {item.duration}
            </span>
            {selected ? <span className="selectedBadge">Selected</span> : null}
          </div>
        </div>
      ) : null}
      <div className="packageBody">
        {!item.image ? (
          <div className="packageTop">
            <span className="packageDuration">
              <Clock3 size={16} />
              {item.duration}
            </span>
            {selected ? <span className="selectedBadge">Selected</span> : null}
          </div>
        ) : null}
        <div className="packagePriceRow">
          <span>{formatPrice(item.price)}</span>
          <small>Complete path</small>
        </div>
        <h3>{item.name}</h3>
        <p className="packageSavings">Includes guided lessons, practical exercises, and a complete learning path.</p>
        <div className="packageCourseList">
          {visibleCourses.map((course) => (
            <span key={course}>
              <CheckCircle2 size={18} />
              {course}
            </span>
          ))}
        </div>
        {coursesLong ? (
          <span
            className="readMoreToggle"
            onClick={(event) => { event.stopPropagation(); setCoursesExpanded((current) => !current); }}
          >
            {coursesExpanded ? 'Show less' : `+ ${item.courses.length - PACKAGE_COURSE_LIST_LIMIT} more`}
          </span>
        ) : null}
        <span className="packageSelectLabel">{selected ? <Check size={16} /> : null}{selected ? 'Selected' : 'Select package'}</span>
      </div>
    </button>
  );
}

function PackagesSection({ selectedPackages, onToggle }) {
  const [livePackages, setLivePackages] = useState(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/packages`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load live packages'))))
      .then((data) => {
        if (cancelled) return;
        const map = new Map((data.packages || []).map((item) => [item.name, item]));
        setLivePackages(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const displayPackages = useMemo(() => {
    if (!livePackages) return packages;
    return packages.map((item) => {
      const live = livePackages.get(item.name);
      if (!live?.image) return item;
      return { ...item, image: getAssetUrl(live.image) };
    });
  }, [livePackages]);

  return (
    <section id="packages" className="section packagesSection">
      <div className="sectionIntro">
        <p className="eyebrow">Package selection</p>
        <h2>Structured Learning Bundles</h2>
        <p>Choose a complete learning path designed to help you gain skills faster, save money, and achieve your goals with a guided curriculum.</p>
      </div>
      <div className="packageGrid">
        {displayPackages.map((item) => (
          <PackageCard
            key={item.id}
            item={item}
            selected={selectedPackages.some((selected) => selected.id === item.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  );
}

function Instructors() {
  const [instructors, setInstructors] = useState([]);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/instructors`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load instructors'))))
      .then((data) => { if (!cancelled) setInstructors(data.instructors || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!instructors.length) return null;

  return (
    <section id="instructors" className="section instructorsSection">
      <div className="sectionIntro">
        <p className="eyebrow">Meet the team</p>
        <h2>Learn from instructors who've done the work.</h2>
      </div>
      <div className="instructorGrid">
        {instructors.map((item) => {
          const bioPreview = item.bio ? item.bio.split('\n').find((line) => line.trim()) || '' : '';
          return (
            <article className="instructorCard" key={item.id}>
              <span className="instructorAvatar">
                {item.image ? <img src={getAssetUrl(item.image)} alt="" /> : <UserRound size={28} />}
              </span>
              <h3>{item.name}</h3>
              {item.position || item.role ? <p className="instructorRole">{item.position || item.role}</p> : null}
              {bioPreview ? <p className="instructorBio">{bioPreview.length > 160 ? `${bioPreview.slice(0, 160)}...` : bioPreview}</p> : null}
              {item.courses?.length ? (
                <div className="instructorCourses">
                  {item.courses.map((course) => <span key={course}>{course}</span>)}
                </div>
              ) : null}
              <a className="instructorProfileLink" href={`/instructor/${item.id}`}>View Full Profile <ArrowRight size={14} /></a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function InstructorProfilePage({ instructorId }) {
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/instructors/${encodeURIComponent(instructorId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Instructor not found.'))))
      .then((data) => { if (!cancelled) setInstructor(data.instructor); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [instructorId]);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section instructorProfileSection">
          <a className="instructorBackLink" href="/#instructors">&larr; Back to Instructors</a>

          {loading ? <p className="instructorProfileState">Loading instructor profile...</p> : null}
          {!loading && error ? <p className="instructorProfileState">{error}</p> : null}

          {!loading && instructor ? (
            <>
              <div className="instructorProfileHero">
                <span className="instructorAvatar instructorAvatarLarge">
                  {instructor.image ? <img src={getAssetUrl(instructor.image)} alt="" /> : <UserRound size={48} />}
                </span>
                <div>
                  <h1>{instructor.name}</h1>
                  {instructor.position ? <p className="instructorProfilePosition">{instructor.position}</p> : null}
                  {instructor.professionalTitle ? <p className="instructorProfileTitle">{instructor.professionalTitle}</p> : null}
                  {instructor.experienceYears ? (
                    <p className="instructorProfileExperience"><BriefcaseBusiness size={15} /> {instructor.experienceYears} of experience</p>
                  ) : null}
                </div>
              </div>

              {instructor.bio ? (
                <div className="instructorProfileCard">
                  <h2>Biography</h2>
                  {instructor.bio.split('\n').filter((p) => p.trim()).map((para, i) => <p key={i}>{para}</p>)}
                </div>
              ) : null}

              {instructor.expertise?.length ? (
                <div className="instructorProfileCard">
                  <h2>Areas of Expertise</h2>
                  <div className="instructorCourses">
                    {instructor.expertise.map((item) => <span key={item}>{item}</span>)}
                  </div>
                </div>
              ) : null}

              {instructor.certifications?.length ? (
                <div className="instructorProfileCard">
                  <h2>Certifications &amp; Professional Development</h2>
                  <ul className="instructorProfileList">
                    {instructor.certifications.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}

              {instructor.teachingPhilosophy ? (
                <div className="instructorProfileCard instructorProfileQuote">
                  <h2>Teaching Philosophy</h2>
                  <blockquote>&ldquo;{instructor.teachingPhilosophy}&rdquo;<cite>&mdash; {instructor.name}</cite></blockquote>
                </div>
              ) : null}

              {instructor.mission ? (
                <div className="instructorProfileCard">
                  <h2>Mission</h2>
                  <p>{instructor.mission}</p>
                </div>
              ) : null}

              {instructor.motto ? (
                <div className="instructorProfileMotto">
                  <p>{instructor.motto}</p>
                </div>
              ) : null}

              {instructor.courses?.length ? (
                <div className="instructorProfileCard">
                  <h2>Courses Taught</h2>
                  <div className="instructorCourses">
                    {instructor.courses.map((course) => <span key={course}>{course}</span>)}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function TestimonialForm({ onSubmitted }) {
  const [form, setForm] = useState({ name: '', role: '', text: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: '', message: '' });
    try {
      const result = await submitTestimonial(form);
      setStatus({ type: 'success', message: result.message || 'Thank you! Your testimonial has been submitted for review.' });
      setForm({ name: '', role: '', text: '' });
      onSubmitted?.();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="orderForm" onSubmit={handleSubmit} noValidate>
      <label>
        Your name
        <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
      </label>
      <label>
        You are a...
        <input
          value={form.role}
          onChange={(event) => updateField('role', event.target.value)}
          placeholder="Student, Parent, Web Development learner..."
          required
        />
      </label>
      <label className="full">
        Your testimonial
        <textarea
          value={form.text}
          onChange={(event) => updateField('text', event.target.value)}
          placeholder="Tell us about your experience at HIKLASS Academy"
          required
        />
      </label>
      <div className="full">
        <button
          className="button submitButton"
          type="submit"
          disabled={submitting}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {submitting ? 'Sending...' : 'Submit Testimonial'}
        </button>
        {status.message ? (
          <p className={`formStatus ${status.type}`}>
            {status.type === 'success' ? <img src={uiAssets.successCheck} alt="" /> : null}
            <span>{status.message}</span>
          </p>
        ) : null}
      </div>
    </form>
  );
}

const TESTIMONIAL_TRUNCATE_LENGTH = 220;

function TestimonialCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const text = item.quote || item.text || '';
  const isLong = text.length > TESTIMONIAL_TRUNCATE_LENGTH;
  const displayText = expanded || !isLong ? text : `${text.slice(0, TESTIMONIAL_TRUNCATE_LENGTH).trimEnd()}...`;

  return (
    <article className="testimonialCard">
      <div className="stars" aria-label="Five star review">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={16} fill="currentColor" />
        ))}
      </div>
      <p>{displayText}</p>
      {isLong ? (
        <button type="button" className="readMoreToggle" onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Read less' : 'Read more'}
        </button>
      ) : null}
      <strong>{item.name}</strong>
      <span>{item.role}</span>
    </article>
  );
}

function Testimonials() {
  const [liveTestimonials, setLiveTestimonials] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchTestimonials()
      .then((list) => { if (!cancelled) setLiveTestimonials(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const allTestimonials = [...defaultTestimonials, ...liveTestimonials];

  return (
    <section className="section testimonialsSection">
      <div className="sectionIntro">
        <p className="eyebrow">Testimonials</p>
        <h2>Students and parents value practical results.</h2>
        <button type="button" className="button primary" style={{ marginTop: '18px' }} onClick={() => setModalOpen(true)}>
          <MessageSquare size={18} /> Share Your Experience
        </button>
      </div>
      <div className="testimonialGrid">
        {allTestimonials.map((item) => (
          <TestimonialCard key={item.id || item.name} item={item} />
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Share Your Experience">
        <TestimonialForm onSubmitted={() => setTimeout(() => setModalOpen(false), 2500)} />
      </Modal>
    </section>
  );
}

function EnrollmentForm({ selectedCourses, selectedPackages, setSelectedCourses, setSelectedPackages }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountStatus, setDiscountStatus] = useState({ type: '', message: '' });
  const [discountLoading, setDiscountLoading] = useState(false);

  const whatsappText = useMemo(() => buildWhatsAppText(form, selectedCourses, selectedPackages, appliedDiscount), [form, selectedCourses, selectedPackages, appliedDiscount]);
  const selectedCourseNames = selectedCourses.map((course) => course.title);
  const subtotal = selectedTotal(selectedCourses, selectedPackages);
  const discountAmount = Number(appliedDiscount?.discountAmount || 0);
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const canSubmit =
    form.name.trim() && form.email.trim() && form.phone.trim() && (selectedCourses.length || selectedPackages.length) && form.paymentMethod && !submitting;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function applyDiscount(code = discountInput, silent = false) {
    const nextCode = code.trim().toUpperCase();
    if (!selectedCourses.length && !selectedPackages.length) {
      setAppliedDiscount(null);
      setDiscountStatus({ type: 'error', message: 'Select at least one course or package before applying a discount.' });
      return;
    }
    if (!nextCode) {
      setAppliedDiscount(null);
      setDiscountStatus({ type: 'error', message: 'Enter a discount code.' });
      return;
    }

    setDiscountLoading(true);
    if (!silent) setDiscountStatus({ type: 'info', message: 'Checking discount code...' });
    try {
      const response = await fetch(`${API_URL}/api/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: nextCode,
          selectedCourses: selectedCourseNames,
          selectedPackages: selectedPackages.map(({ id, name }) => ({ id, name })),
          subtotal,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || 'Invalid or expired discount code');
      setAppliedDiscount(data);
      setDiscountInput(data.code);
      setDiscountStatus({ type: 'success', message: data.message || 'Discount applied successfully.' });
    } catch (error) {
      setAppliedDiscount(null);
      setDiscountStatus({
        type: 'error',
        message: silent ? `Discount removed: ${error.message}` : error.message,
      });
    } finally {
      setDiscountLoading(false);
    }
  }

  function removeDiscount() {
    setAppliedDiscount(null);
    setDiscountInput('');
    setDiscountStatus({ type: 'info', message: 'Discount removed.' });
  }

  React.useEffect(() => {
    if (!appliedDiscount?.code) return undefined;
    const timer = window.setTimeout(() => applyDiscount(appliedDiscount.code, true), 300);
    return () => window.clearTimeout(timer);
  }, [selectedCourses, selectedPackages]);

  async function submitOrder(event) {
    event.preventDefault();
    if (!canSubmit) {
      setStatus({ type: 'error', message: 'Please add your name, phone, email, at least one selected course or package, and a payment method.' });
      return;
    }

    setSubmitting(true);
    setStatus({ type: 'info', message: 'Sending your course order...' });

    try {
      const data = await submitEnrollment({
        ...form,
        studentName: form.name,
        learningMode: form.mode,
        courses: selectedCourseNames,
        selectedCourses: selectedCourses.map(({ title, price }) => ({ title, price })),
        packages: selectedPackages.map(({ id, name }) => ({ id, name })),
        selectedPackages: selectedPackages.map(({ id, name, price, duration, courses }) => ({ id, name, price, duration, courses })),
        discountCode: appliedDiscount?.code || '',
        discountAmount,
        subtotal,
        grandTotal,
        paymentMethod: form.paymentMethod,
      });

      if (data.emailSent === false) {
        setStatus({
          type: 'warning',
          message: `${data.message || 'Your order was saved, but the confirmation email was not sent.'} Redirecting you to WhatsApp with your order details...`,
        });
        window.setTimeout(() => {
          window.location.assign(`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappText}`);
        }, 1200);
        return;
      }

      setStatus({
        type: 'success',
        message: data.message || 'Your order was received successfully. HIKLASS Academy will contact you shortly.',
      });
      setForm({ ...initialForm, paymentMethod: '' });
      setSelectedCourses([]);
      setSelectedPackages([]);
      setAppliedDiscount(null);
      setDiscountInput('');
      setDiscountStatus({ type: '', message: '' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `${error.message || 'Something went wrong.'} You can still send this order through WhatsApp below.`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="enroll" className="section enrollSection">
      <div className="enrollCopy">
        <p className="eyebrow">Course selection form</p>
        <h2>Send your holiday course order.</h2>
        <p>
          Select courses or complete learning bundles, choose a learning mode, and submit. If email delivery fails, your
          selected order is still ready for WhatsApp.
        </p>

        <div className="selectedPanel">
          <strong>Selected courses</strong>
          {selectedCourseNames.length ? (
            selectedCourses.map((course) => (
              <span key={course.id}>
                {course.title}
                <b>{formatPrice(course.price)}</b>
              </span>
            ))
          ) : (
            <small>No course selected yet.</small>
          )}
          <strong>Selected packages</strong>
          {selectedPackages.length ? (
            selectedPackages.map((item) => (
              <span key={item.id} className="selectedPackageLine">
                <span>
                  {item.name}
                  <small>{item.duration}</small>
                </span>
                <b>{formatPrice(item.price)}</b>
              </span>
            ))
          ) : (
            <small>No package selected yet.</small>
          )}
          <div className="discountBox">
            <label htmlFor="discount-code">Discount Code</label>
            <div>
              <input
                id="discount-code"
                value={discountInput}
                onChange={(event) => setDiscountInput(event.target.value.toUpperCase())}
                placeholder="Enter discount code"
              />
              <button type="button" onClick={() => applyDiscount()} disabled={discountLoading || !discountInput.trim()}>
                {discountLoading ? 'Applying...' : 'Apply'}
              </button>
            </div>
            {discountStatus.message ? <p className={discountStatus.type}>{discountStatus.message}</p> : null}
            {appliedDiscount ? (
              <button type="button" className="removeDiscountButton" onClick={removeDiscount}>
                {appliedDiscount.type === 'percentage'
                  ? `${appliedDiscount.value}%`
                  : formatPrice(appliedDiscount.value)} Discount — Remove
              </button>
            ) : null}
          </div>
          {form.paymentMethod ? (
            <div className="selectedPaymentMethodSummary">
              <span className="selectedPaymentMethodLabel">Payment Method:</span>
              <span className="selectedPaymentMethodValue">
                <PaymentIcon method={form.paymentMethod} size={18} />
                {form.paymentMethod}
              </span>
            </div>
          ) : (
            <small className="paymentMethodPlaceholder">Select a payment method below</small>
          )}
          {selectedCourses.length || selectedPackages.length ? (
            <em className="pricingSummary">
              <span>Subtotal: <b>{formatPrice(subtotal)}</b></span>
              <span>Discount Code: <b>{appliedDiscount?.code || 'None'}</b></span>
              <span>Discount: <b>-{formatPrice(discountAmount)}</b></span>
              <strong>Grand Total: {formatPrice(grandTotal)}</strong>
            </em>
          ) : null}
        </div>

      </div>

      <form className="orderForm" onSubmit={submitOrder} noValidate>
        <label>
          Student name
          <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />
        </label>
        <label>
          Preferred learning mode
          <select value={form.mode} onChange={(event) => updateField('mode', event.target.value)}>
            <option>Online</option>
            <option>Physical</option>
            <option>Hybrid</option>
          </select>
        </label>
        <label className="full">
          Notes
          <textarea
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder="Preferred schedule, age group, or questions"
          />
        </label>

        <fieldset className="paymentMethodFieldset">
          <legend>Payment Method</legend>
          <p className="paymentMethodSubtitle">Choose how you would like to pay for your selected courses.</p>
          <PaymentMethodSelector
            selectedMethod={form.paymentMethod}
            onSelectMethod={(method) => updateField('paymentMethod', method)}
          />
          <PaymentDetailsPanel selectedMethod={form.paymentMethod} />
          {!form.paymentMethod && status.type === 'error' ? (
            <p className="paymentMethodError">Please select payment method.</p>
          ) : null}
        </fieldset>

        <div className="courseOrderActions">
          <button className="button submitButton courseOrderActionButton" type="submit" disabled={!canSubmit}>
            {submitting ? <img src={uiAssets.loadingSpinner} alt="" /> : <Send size={22} aria-hidden="true" />}
            {submitting ? 'Sending...' : 'Submit Course Order'}
          </button>
          <a
            className="button whatsapp courseOrderActionButton"
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppBrandIcon size={22} />
            <span>Order via WhatsApp</span>
          </a>
        </div>

        {status.message ? (
          <p className={`formStatus ${status.type}`}>
            {status.type === 'success' ? <img src={uiAssets.successCheck} alt="" /> : null}
            <span>{status.message}</span>
          </p>
        ) : null}
      </form>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="section faqSection">
      <div className="sectionIntro">
        <p className="eyebrow">FAQ</p>
        <h2>Answers before you enroll.</h2>
      </div>
      <div className="faqList">
        {faqs.map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <ChevronDown size={18} />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FloatingEnrollButton({ selectedCount, pulse }) {
  if (!selectedCount) return null;

  function scrollToEnrollment() {
    document.getElementById('enroll')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <button
      className={pulse ? 'floatingEnroll pulseOnce' : 'floatingEnroll'}
      type="button"
      onClick={scrollToEnrollment}
      aria-label={`Enroll now with ${selectedCount} selected item${selectedCount === 1 ? '' : 's'}`}
    >
      <GraduationCap size={22} aria-hidden="true" />
      <span>Enroll Now</span>
      <strong>{selectedCount}</strong>
    </button>
  );
}

function AdminDashboard({ initialPage = getAdminPageFromPath() }) {
  const [token, setToken] = useState(() => getStoredAdminToken());
  const [tokenInput, setTokenInput] = useState(token);
  const [orders, setOrders] = useState([]);
  const [coursesData, setCoursesData] = useState([]);
  const [packagesData, setPackagesData] = useState([]);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [testimonialsData, setTestimonialsData] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [settingsData, setSettingsData] = useState(null);
  const [stats, setStats] = useState(null);
  const [activePage, setActivePage] = useState(() => normalizeAdminPageId(initialPage));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => { try { return JSON.parse(localStorage.getItem('adminSidebarCollapsed')); } catch { return false; } });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [modal, setModal] = useState({ open: false, mode: '', data: null });
  const [confirm, setConfirm] = useState({ open: false, id: null, label: '' });

  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return orders;
    return orders.filter((order) =>
      [order.id, order.name, order.email, order.phone, order.mode, order.notes,
        ...(order.courses || []).map(getOrderCourseTitle),
        ...(order.packages || []).map(getOrderPackageName),
      ].join(' ').toLowerCase().includes(search),
    );
  }, [orders, query]);

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #C6C6C6', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };

  const chartData = useMemo(() => buildChartData(orders), [orders]);
  const topCourses = useMemo(() => topCourseRows(stats), [stats]);
  const topPackages = useMemo(() => topPackageRows(stats), [stats]);
  const statusData = useMemo(() => buildStatusData(stats, stats?.totalOrders || orders.length), [orders.length, stats]);
  const recentOrders = useMemo(() => filteredOrders.slice(0, 6), [filteredOrders]);

  async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json', 'x-admin-token': token } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_URL}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      clearAdminSession();
      setToken('');
      window.location.replace('/admin/login');
      throw new Error('Your admin session expired. Please sign in again.');
    }
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  function showToast(message, type) { setToast({ message, type }); }

  async function loadAll() {
    setLoading(true);
    try {
      const [o, c, p, m, e, st, pay, disc, inst, test, rep, set, adminUsers, roleList, logs] = await Promise.all([
        api('GET', '/api/admin/orders').catch(() => ({ orders: [], stats: {} })),
        api('GET', '/api/admin/courses').catch(() => ({ courses: [] })),
        api('GET', '/api/admin/packages').catch(() => ({ packages: [] })),
        api('GET', '/api/admin/messages').catch(() => ({ messages: [] })),
        api('GET', '/api/admin/email-logs').catch(() => ({ logs: [] })),
        api('GET', '/api/admin/students').catch(() => ({ students: [] })),
        api('GET', '/api/admin/payments').catch(() => ({ payments: [] })),
        api('GET', '/api/admin/discounts').catch(() => ({ discounts: [] })),
        api('GET', '/api/admin/instructors').catch(() => ({ instructors: [] })),
        api('GET', '/api/admin/testimonials').catch(() => ({ testimonials: [] })),
        api('GET', '/api/admin/reports').catch(() => ({ reports: [] })),
        api('GET', '/api/admin/settings').catch(() => ({ settings: null })),
        api('GET', '/api/admin/admins').catch(() => ({ admins: [] })),
        api('GET', '/api/admin/roles').catch(() => ({ roles: [] })),
        api('GET', '/api/admin/activity-logs').catch(() => ({ logs: [] })),
      ]);
      setOrders(o.orders || []);
      setStats(o.stats || null);
      setCoursesData(c.courses || []);
      setPackagesData(p.packages || []);
      setMessages(m.messages || []);
      setEmailLogs(e.logs || []);
      setStudents(st.students || []);
      setPayments(pay.payments || []);
      setDiscounts(disc.discounts || []);
      setInstructors(inst.instructors || []);
      setTestimonialsData(test.testimonials || []);
      setReports(rep.reports || []);
      setSettingsData(set.settings || null);
      setAdmins(adminUsers.admins || []);
      setRoles(roleList.roles || []);
      setActivityLogs(logs.logs || []);
    } catch (err) { setStatus({ type: 'error', message: err.message }); }
    setLoading(false);
  }

  async function loadSection(type) {
    try {
      let res;
      switch (type) {
        case 'students': res = await api('GET', '/api/admin/students'); setStudents(res.students || []); break;
        case 'payments': res = await api('GET', '/api/admin/payments'); setPayments(res.payments || []); break;
        case 'discounts': res = await api('GET', '/api/admin/discounts'); setDiscounts(res.discounts || []); break;
        case 'instructors': res = await api('GET', '/api/admin/instructors'); setInstructors(res.instructors || []); break;
        case 'testimonials': res = await api('GET', '/api/admin/testimonials'); setTestimonialsData(res.testimonials || []); break;
        case 'reports': res = await api('GET', '/api/admin/reports'); setReports(res.reports || []); break;
        case 'settings': res = await api('GET', '/api/admin/settings'); setSettingsData(res.settings || null); break;
        case 'admins': res = await api('GET', '/api/admin/admins'); setAdmins(res.admins || []); break;
        case 'roles': res = await api('GET', '/api/admin/roles'); setRoles(res.roles || []); break;
        case 'activity-logs': res = await api('GET', '/api/admin/activity-logs'); setActivityLogs(res.logs || []); break;
      }
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function updateEnrollmentStatus(orderId, newStatus) {
    try {
      const data = await api('PATCH', `/api/admin/enrollments/${orderId}/status`, { status: newStatus });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      if (data.stats) setStats(data.stats);
      await loadAll();
      showToast(
        data.statusEmailSent
          ? `Enrollment ${orderId.slice(-6)} marked as ${newStatus}. Student email sent.`
          : `Enrollment ${orderId.slice(-6)} marked as ${newStatus}, but student email was not sent.`,
        data.statusEmailSent ? 'success' : 'warning',
      );
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function deleteEntity(type, id) {
    try {
      await api('DELETE', `/api/admin/${type}/${id}`);
      showToast(`${type.slice(0, -1)} deleted.`, 'success');
      setConfirm({ open: false, id: null, label: '' });
      await loadAll();
      if (adminSyncSections.includes(type)) await loadSection(type);
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function uploadInstructorPhoto(id, file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`${API_URL}/api/admin/instructors/${id}/avatar`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not upload photo.');
      showToast('Instructor photo updated.', 'success');
      await loadSection('instructors');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function removeInstructorPhoto(id) {
    try {
      await api('DELETE', `/api/admin/instructors/${id}/avatar`);
      showToast('Instructor photo removed.', 'success');
      await loadSection('instructors');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function uploadCourseImage(id, file) {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_URL}/api/admin/courses/${id}/image`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not upload image.');
      showToast('Course image updated.', 'success');
      await loadAll();
      return data.course;
    } catch (err) { showToast(err.message, 'error'); return null; }
  }

  async function removeCourseImage(id) {
    try {
      const data = await api('DELETE', `/api/admin/courses/${id}/image`);
      showToast('Course image removed.', 'success');
      await loadAll();
      return data.course;
    } catch (err) { showToast(err.message, 'error'); return null; }
  }

  async function uploadPackageImage(id, file) {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_URL}/api/admin/packages/${id}/image`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not upload image.');
      showToast('Package image updated.', 'success');
      await loadAll();
      return data.package;
    } catch (err) { showToast(err.message, 'error'); return null; }
  }

  async function removePackageImage(id) {
    try {
      const data = await api('DELETE', `/api/admin/packages/${id}/image`);
      showToast('Package image removed.', 'success');
      await loadAll();
      return data.package;
    } catch (err) { showToast(err.message, 'error'); return null; }
  }

  function saveToken(e) {
    e.preventDefault();
    const nextToken = tokenInput.trim();
    setToken(nextToken);
    if (nextToken) localStorage.setItem(ADMIN_TOKEN_KEY, nextToken);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  }

  function exportCsv() {
    const rows = [['ID', 'Date', 'Name', 'Email', 'Phone', 'Mode', 'Courses', 'Amount', 'Status', 'Notes'],
      ...filteredOrders.map((o) => [
        o.id, o.createdAt, o.name, o.email, o.phone, o.mode,
        (o.courses || []).map((c) => getOrderCourseTitle(c)).join('; '),
        formatPrice(o.totalAmount || 0), o.status, o.notes,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `hiklass-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function openPage(pageId) {
    const nextPage = normalizeAdminPageId(pageId);
    setActivePage(nextPage);
    const nextPath = getAdminPathForPage(nextPage);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    if (window.innerWidth <= 1180) setSidebarOpen(false);
  }

  function handleSignOut() {
    localStorage.removeItem('hiklass-admin-token');
    localStorage.removeItem('hiklass-admin-user');
    sessionStorage.removeItem('hiklass-admin-session-token');
    setToken('');
    window.location.replace('/admin/login');
  }

  function syncAdminData() {
    window.__adminData = {
      courses: coursesData,
      packages: packagesData,
      orders,
      students,
      payments,
      messages,
    };
  }

  React.useEffect(() => {
    if (token) { loadAll(); loadSection(activePage); }
    else setStatus({ type: 'info', message: 'Enter admin token to access dashboard.' });
  }, [token]);

  // Keep dashboard stats and the active page's data live without requiring a manual
  // refresh: re-sync on an interval, and immediately whenever the tab regains focus.
  React.useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => { loadAll(); loadSection(activePage); }, DASHBOARD_POLL_MS);
    function onFocus() {
      if (document.visibilityState === 'visible') { loadAll(); loadSection(activePage); }
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [token, activePage]);

  React.useEffect(() => {
    if (!token) return;
    loadSection(activePage);
  }, [activePage, token]);

  React.useEffect(() => {
    syncAdminData();
  }, [coursesData, packagesData, orders, students, payments, messages]);

  React.useEffect(() => {
    function handler(e) { showToast(e.detail.message, e.detail.type); }
    window.addEventListener('admin:toast', handler);
    return () => window.removeEventListener('admin:toast', handler);
  }, []);

  React.useEffect(() => {
    function syncPageFromBrowser() {
      setActivePage(getAdminPageFromPath());
    }
    window.addEventListener('popstate', syncPageFromBrowser);
    return () => window.removeEventListener('popstate', syncPageFromBrowser);
  }, []);

  const enrollmentGrowth = useMemo(
    () => growthLabel(windowSums(orders, (order) => order.createdAt)),
    [orders],
  );
  const revenueGrowth = useMemo(
    () => growthLabel(windowSums(
      payments.filter((payment) => payment.status === 'Paid'),
      (payment) => payment.date || payment.createdAt,
      (payment) => Number(payment.amount || 0),
    )),
    [payments],
  );
  const studentGrowth = useMemo(
    () => growthLabel(windowSums(students, (student) => student.createdAt)),
    [students],
  );

  const statCards = [
    { label: 'Total Enrollments', value: stats?.totalOrders ?? orders.length, growth: enrollmentGrowth, icon: GraduationCap, tone: 'blue' },
    { label: 'Total Revenue (FCFA)', value: Number(stats?.totalAmount || 0).toLocaleString('en-US'), growth: revenueGrowth, icon: WalletCards, tone: 'green' },
    { label: 'Total Students', value: students.length, growth: studentGrowth, icon: Users, tone: 'purple' },
    { label: 'Total Courses', value: coursesData.length, growth: null, icon: BookOpen, tone: 'orange' },
    { label: 'Total Packages', value: packagesData.length, growth: null, icon: Package, tone: 'teal' },
  ];

  function renderOverview() {
    return (
      <>
        <section className="adminMetricGrid">
          {statCards.map(({ label, value, growth, icon: Icon, tone }) => (
            <article className="adminMetricCard" key={label}>
              <span className={`adminMetricIcon ${tone}`}>
                <Icon size={23} />
              </span>
              <div>
                <strong>{value}</strong>
                <p>{label}</p>
                {growth ? <small>{growth} <span>vs last 30 days</span></small> : null}
              </div>
            </article>
          ))}
        </section>

        <section className="adminDashboardGrid">
          <article className="adminPanel adminChartWide">
            <div className="adminPanelTitle">
              <h2>Enrollment Overview</h2>
              <button type="button">This Month <ChevronDown size={15} /></button>
            </div>
            <div className="adminChartBox">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${Math.round(value / 1000000)}M`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value, name) => (name === 'revenue' ? formatPrice(value) : value)} />
                  <Line yAxisId="left" type="monotone" dataKey="enrollments" stroke="#2563EB" strokeWidth={3} dot={false} name="Enrollments" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#D30D1A" strokeWidth={3} dot={false} name="Revenue (FCFA)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="adminPanel">
            <div className="adminPanelTitle">
              <h2>Enrollments by Status</h2>
            </div>
            <div className="adminStatusChart">
              <ResponsiveContainer width="48%" height={210}>
                <PieChart>
                  <Pie data={statusData} innerRadius={52} outerRadius={86} paddingAngle={2} dataKey="value">
                    {statusData.map((item) => (
                      <Cell key={item.name} fill={statusColors[item.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="statusLegend">
                {statusData.map((item) => {
                  const total = statusData.reduce((sum, entry) => sum + entry.value, 0) || 1;
                  return (
                    <p key={item.name}>
                      <i style={{ background: statusColors[item.name] }} />
                      <span>{item.name}</span>
                      <strong>{item.value} ({Math.round((item.value / total) * 100)}%)</strong>
                    </p>
                  );
                })}
                <b>Total<br />{stats?.totalOrders ?? orders.length}</b>
              </div>
            </div>
          </article>

          <article className="adminPanel adminTablePanel">
            <div className="adminPanelTitle">
              <h2>Recent Enrollments</h2>
              <button type="button" onClick={() => openPage('enrollments')}>View All</button>
            </div>
            <EnrollmentTable orders={recentOrders} compact updateStatus={updateEnrollmentStatus} />
          </article>

          <article className="adminPanel">
            <div className="adminPanelTitle">
              <h2>Top Courses</h2>
              <button type="button" onClick={() => openPage('courses')}>View All</button>
            </div>
            <div className="topCourseList">
              {topCourses.map((course) => (
                <div className="topCourseItem" key={course.name}>
                  <span>{course.rank}</span>
                  <div>
                    <strong>{course.name}</strong>
                    <small>Enrollments: {course.count}</small>
                    <i><b style={{ width: `${course.percent * 3.6}%` }} /></i>
                  </div>
                  <em>{course.percent}%</em>
                </div>
              ))}
            </div>
          </article>

          <article className="adminPanel">
            <div className="adminPanelTitle">
              <h2>Top Packages</h2>
              <button type="button" onClick={() => openPage('packages')}>View All</button>
            </div>
            <div className="topCourseList">
              {topPackages.map((pkg) => (
                <div className="topCourseItem" key={pkg.name}>
                  <span>{pkg.rank}</span>
                  <div>
                    <strong>{pkg.name}</strong>
                    <small>Enrollments: {pkg.count}</small>
                    <i><b style={{ width: `${pkg.percent * 3.6}%` }} /></i>
                  </div>
                  <em>{pkg.percent}%</em>
                </div>
              ))}
            </div>
          </article>

          <article className="adminPanel">
            <div className="adminPanelTitle">
              <h2>Recent Messages</h2>
              <button type="button" onClick={() => openPage('messages')}>View All</button>
            </div>
            <div className="adminMessageList">
              {messages.slice(0, 3).map((message) => (
                <div className="adminMessageItem" key={message.id}>
                  <span>{studentAvatar(message.name)}</span>
                  <div>
                    <strong>{message.name}</strong>
                    <p>{message.message}</p>
                  </div>
                  <time>{shortDate(message.createdAt)}<br />{formatTime(message.createdAt)}</time>
                </div>
              ))}
            </div>
          </article>

          <article className="adminPanel">
            <div className="adminPanelTitle">
              <h2>Revenue Overview</h2>
              <button type="button">This Month <ChevronDown size={15} /></button>
            </div>
            <div className="revenueSummary">
              <span>Total Revenue</span>
              <strong>{formatPrice(stats?.totalAmount || 0)}</strong>
              <small>{revenueGrowth} <span>vs last 30 days</span></small>
            </div>
            <ResponsiveContainer width="100%" height={145}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#1B5E20" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1B5E20" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Tooltip formatter={(value) => formatPrice(value)} />
                <Area type="monotone" dataKey="revenue" stroke="#1B5E20" fill="url(#revenueFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </article>
        </section>
      </>
    );
  }

  function renderManagementPage() {
    if (activePage === 'enrollments') {
      return (
        <article className="adminPanel adminFullPanel">
          <div className="adminPanelTitle">
            <h2>All Enrollment Requests</h2>
            <button type="button" onClick={exportCsv} disabled={!filteredOrders.length}><Download size={16} /> Export CSV</button>
          </div>
          <EnrollmentTable orders={filteredOrders} updateStatus={updateEnrollmentStatus} />
        </article>
      );
    }

    if (activePage === 'courses') {
      return (
        <CatalogCRUD
          title="Courses"
          data={coursesData}
          kind="course"
          onAdd={() => setModal({ open: true, mode: 'add', data: null })}
          onEdit={(item) => setModal({ open: true, mode: 'edit', data: item })}
          onDelete={(id, label) => setConfirm({ open: true, id, label })}
          onUploadImage={uploadCourseImage}
          onRemoveImage={removeCourseImage}
        />
      );
    }

    if (activePage === 'packages') {
      return (
        <CatalogCRUD
          title="Packages"
          data={packagesData}
          kind="package"
          onAdd={() => setModal({ open: true, mode: 'add', data: null })}
          onEdit={(item) => setModal({ open: true, mode: 'edit', data: item })}
          onDelete={(id, label) => setConfirm({ open: true, id, label })}
          onUploadImage={uploadPackageImage}
          onRemoveImage={removePackageImage}
        />
      );
    }

    if (activePage === 'blog') {
      return <AdminBlogManager />;
    }

    if (activePage === 'students') {
      return <StudentsPage data={students} onAdd={() => setModal({ open: true, mode: 'add', page: 'students', data: null })} onEdit={(item) => setModal({ open: true, mode: 'edit', page: 'students', data: item })} onDelete={(id) => setConfirm({ open: true, id, label: 'student', type: 'students' })} />;
    }

    if (activePage === 'payments') {
      return <PaymentsPage data={payments} onAdd={() => setModal({ open: true, mode: 'add', page: 'payments', data: null })} onEdit={(item) => setModal({ open: true, mode: 'edit', page: 'payments', data: item })} onDelete={(id) => setConfirm({ open: true, id, label: 'payment', type: 'payments' })} />;
    }

    if (activePage === 'discounts') {
      return <DiscountsPage data={discounts} onAdd={() => setModal({ open: true, mode: 'add', page: 'discounts', data: null })} onEdit={(item) => setModal({ open: true, mode: 'edit', page: 'discounts', data: item })} onDelete={(id) => setConfirm({ open: true, id, label: 'discount', type: 'discounts' })} />;
    }

    if (activePage === 'instructors') {
      return (
        <InstructorsPage
          data={instructors}
          onAdd={() => setModal({ open: true, mode: 'add', page: 'instructors', data: null })}
          onEdit={(item) => setModal({ open: true, mode: 'edit', page: 'instructors', data: item })}
          onDelete={(id) => setConfirm({ open: true, id, label: 'instructor', type: 'instructors' })}
          onUploadPhoto={uploadInstructorPhoto}
          onRemovePhoto={removeInstructorPhoto}
        />
      );
    }

    if (activePage === 'testimonials') {
      return (
        <TestimonialsPage
          data={testimonialsData}
          onAdd={() => setModal({ open: true, mode: 'add', page: 'testimonials', data: null })}
          onEdit={(item) => setModal({ open: true, mode: 'edit', page: 'testimonials', data: item })}
          onDelete={(id) => setConfirm({ open: true, id, label: 'testimonial', type: 'testimonials' })}
          onApprove={async (item) => {
            try {
              await api('PUT', `/api/admin/testimonials/${item.id}`, { ...item, status: 'Approved' });
              showToast(`${item.name}'s testimonial approved — now live on the site.`, 'success');
              await loadSection('testimonials');
            } catch (err) { showToast(err.message, 'error'); }
          }}
        />
      );
    }

    if (activePage === 'messages') {
      return <MessagesPage messages={messages} />;
    }

    if (activePage === 'email-logs') {
      return <EmailLogsPage logs={emailLogs} />;
    }

    if (activePage === 'reports') {
      return <ReportsPage reports={reports} stats={stats} exportCsv={exportCsv} />;
    }

    if (activePage === 'profile') {
      return <ProfilePage />;
    }

    if (activePage === 'settings') {
      return (
        <SettingsPage
          tokenInput={tokenInput}
          setTokenInput={setTokenInput}
          saveToken={saveToken}
          settings={settingsData}
          onEdit={() => setModal({ open: true, mode: 'edit', page: 'settings', data: settingsData })}
          onTestEmail={async () => {
            const recipient = window.prompt('Send a test email to:', settingsData?.smtpUser || settingsData?.supportEmail || '');
            if (!recipient) return;
            try {
              const result = await api('POST', '/api/admin/settings/test-email', { recipient });
              showToast(result.message, 'success');
            } catch (err) {
              showToast(err.message, 'error');
            }
          }}
        />
      );
    }

    if (activePage === 'admins') {
      return <AdminsPage data={admins} onAdd={() => setModal({ open: true, mode: 'add', page: 'admins', data: null })} onEdit={(item) => setModal({ open: true, mode: 'edit', page: 'admins', data: item })} onDelete={(id) => setConfirm({ open: true, id, label: 'admin', type: 'admins' })} />;
    }

    if (activePage === 'roles') {
      return <RolesPage data={roles} onAdd={() => setModal({ open: true, mode: 'add', page: 'roles', data: null })} onEdit={(item) => setModal({ open: true, mode: 'edit', page: 'roles', data: item })} onDelete={(id) => setConfirm({ open: true, id, label: 'role', type: 'roles' })} />;
    }

    if (activePage === 'activity-logs') {
      return <ActivityLogsPage data={activityLogs} />;
    }

    return <PlaceholderPage page={adminPages.find((page) => page.id === activePage)} orders={orders} />;
  }

  const currentPage = adminPages.find((page) => page.id === activePage) || adminPages[0];

  return (
    <main className={`adminDashboardShell ${sidebarOpen ? 'sidebarOpen' : ''} ${sidebarCollapsed ? 'sidebarCollapsed' : ''}`}>
      <aside className="adminSidebar">
        <a className="adminSidebarLogo" href="/" aria-label="HIKLASS Academy home">
          <img src={brandAssets.logoHorizontal} alt="HIKLASS Academy" />
        </a>
        <nav>
          {adminPages.map(({ id, label, icon: Icon }) => (
            <button className={activePage === id ? 'active' : ''} type="button" key={id} onClick={() => openPage(id)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="adminQuickActions">
          <span>Quick Actions</span>
          <button type="button" className="red" onClick={() => { openPage('courses'); setModal({ open: true, mode: 'add', page: 'courses', data: null }); }}><PlusCircle size={17} /> Add Course</button>
          <button type="button" className="blue" onClick={() => { openPage('packages'); setModal({ open: true, mode: 'add', page: 'packages', data: null }); }}><Box size={17} /> Add Package</button>
          <button type="button" className="blue" onClick={() => openPage('blog')}><BookOpenCheck size={17} /> Blog Manager</button>
          <button type="button" className="green" onClick={() => window.location.href = 'mailto:info@hiklassacademy.com'}><Mail size={17} /> Send Email</button>
          <button type="button" className="blue" onClick={() => { window.location.href = '/admin/content'; }}><LayoutDashboard size={17} /> Student Portal</button>
        </div>
        <footer>
          <strong>HIKLASS Academy</strong>
          <p>Experience <span>Brighter</span> Success</p>
        </footer>
      </aside>

      <section className="adminMain">
        <AdminTopbar
          currentPage={currentPage}
          query={query}
          setQuery={setQuery}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          loading={loading}
          onRefresh={async () => { await loadAll(); await loadSection(activePage); }}
          onOpenPage={(id) => openPage(id)}
          onSignOut={handleSignOut}
        />

        {status.message ? <p className={`adminStatus ${status.type}`}>{status.message}</p> : null}

        {activePage === 'dashboard' ? renderOverview() : renderManagementPage()}

        <footer className="adminDashboardFooter">
          <span>&copy; 2026 HIKLASS Academy. All Rights Reserved.</span>
          <span>Made with <Heart size={14} fill="#D30D1A" /> for Education</span>
        </footer>
      </section>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

      <ConfirmDialog
        open={confirm.open}
        title="Confirm delete"
        message={`Are you sure you want to delete this ${confirm.label}?`}
        onConfirm={() => deleteEntity(confirm.type || `${confirm.label}s`, confirm.id)}
        onClose={() => setConfirm({ open: false, id: null, label: '', type: '' })}
      />

      <EntityModal />
    </main>
  );

  function EntityModal() {
    const { mode, data } = modal;
    const page = modal.page || activePage;
    const addImageInputRef = React.useRef(null);
    const [pendingImageFile, setPendingImageFile] = useState(null);
    const [pendingImagePreview, setPendingImagePreview] = useState('');

    React.useEffect(() => {
      if (!modal.open) {
        setPendingImageFile(null);
        setPendingImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return ''; });
      }
    }, [modal.open]);

    if (!mode) return null;

    let title, fields, endpoint;
    if (page === 'courses') {
      title = mode === 'add' ? 'Add Course' : 'Edit Course';
      endpoint = mode === 'add' ? '/api/admin/courses' : `/api/admin/courses/${data.id}`;
      fields = [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'category', label: 'Category', type: 'text' },
        { key: 'description', label: 'Description (internal note, not shown on the site)', type: 'textarea' },
        { key: 'price', label: 'Price (FCFA)', type: 'number' },
        { key: 'duration', label: 'Duration', type: 'text' },
        {
          key: 'instructorName',
          label: 'Instructor',
          type: 'select',
          options: [
            { value: '', label: 'No instructor assigned' },
            ...instructors.map((inst) => ({ value: inst.name, label: inst.name })),
          ],
        },
      ];
    } else if (page === 'packages') {
      title = mode === 'add' ? 'Add Package' : 'Edit Package';
      endpoint = mode === 'add' ? '/api/admin/packages' : `/api/admin/packages/${data.id}`;
      fields = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'price', label: 'Price (FCFA)', type: 'number' },
        { key: 'duration', label: 'Duration', type: 'text' },
        { key: 'courses', label: 'Courses (comma-separated)', type: 'text' },
        {
          key: 'instructorName',
          label: 'Instructor',
          type: 'select',
          options: [
            { value: '', label: 'No instructor assigned' },
            ...instructors.map((inst) => ({ value: inst.name, label: inst.name })),
          ],
        },
      ];
    } else if (page === 'students') {
      title = mode === 'add' ? 'Add Student' : 'Edit Student';
      endpoint = mode === 'add' ? '/api/admin/students' : `/api/admin/students/${data.id}`;
      fields = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'mode', label: 'Learning Mode', type: 'text' },
        { key: 'courses', label: 'Courses (comma-separated)', type: 'text' },
      ];
    } else if (page === 'payments') {
      title = mode === 'add' ? 'Add Payment' : 'Edit Payment';
      endpoint = mode === 'add' ? '/api/admin/payments' : `/api/admin/payments/${data.id}`;
      fields = [
        { key: 'enrollmentId', label: 'Enrollment ID', type: 'text' },
        { key: 'method', label: 'Payment Method', type: 'text' },
        { key: 'amount', label: 'Amount (FCFA)', type: 'number' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'reference', label: 'Reference', type: 'text' },
        { key: 'date', label: 'Date', type: 'text' },
      ];
    } else if (page === 'discounts') {
      title = mode === 'add' ? 'Add Discount' : 'Edit Discount';
      endpoint = mode === 'add' ? '/api/admin/discounts' : `/api/admin/discounts/${data.id}`;
      fields = [
        { key: 'code', label: 'Discount Code', type: 'text', required: true },
        { key: 'type', label: 'Type', type: 'select', defaultValue: 'percentage', options: ['percentage', 'fixed'] },
        { key: 'value', label: 'Value', type: 'number', required: true, min: 1 },
        { key: 'appliesTo', label: 'Applies To', type: 'select', defaultValue: 'all', options: ['all', 'courses', 'packages'] },
        { key: 'minOrderAmount', label: 'Minimum Order Amount', type: 'number', defaultValue: 0, min: 0 },
        { key: 'startDate', label: 'Start Date', type: 'date' },
        { key: 'endDate', label: 'End Date', type: 'date' },
        { key: 'usageLimit', label: 'Usage Limit (0 = unlimited)', type: 'number', defaultValue: 0, min: 0 },
        { key: 'usedCount', label: 'Used Count', type: 'number', defaultValue: 0, min: 0 },
        { key: 'status', label: 'Status', type: 'select', defaultValue: 'Active', options: ['Active', 'Inactive'] },
      ];
    } else if (page === 'instructors') {
      title = mode === 'add' ? 'Add Instructor' : 'Edit Instructor';
      endpoint = mode === 'add' ? '/api/admin/instructors' : `/api/admin/instructors/${data.id}`;
      fields = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'position', label: 'Position (e.g. Founder, CEO & Lead Instructor)', type: 'text' },
        { key: 'professionalTitle', label: 'Professional Title (e.g. CGI Engineer | Full-Stack Developer | ...)', type: 'text' },
        { key: 'role', label: 'Short Role Label (shown on course cards)', type: 'text' },
        { key: 'bio', label: 'Biography', type: 'textarea', rows: 8 },
        { key: 'expertise', label: 'Areas of Expertise (one per line)', type: 'textarea', rows: 6 },
        { key: 'experienceYears', label: 'Years of Experience (e.g. "15+ Years")', type: 'text' },
        { key: 'certifications', label: 'Certifications & Professional Development (one per line)', type: 'textarea', rows: 5 },
        { key: 'teachingPhilosophy', label: 'Teaching Philosophy (quote)', type: 'textarea', rows: 3 },
        { key: 'mission', label: 'Mission', type: 'textarea', rows: 3 },
        { key: 'motto', label: 'Motto', type: 'text' },
      ];
    } else if (page === 'testimonials') {
      title = mode === 'add' ? 'Add Testimonial' : 'Edit Testimonial';
      endpoint = mode === 'add' ? '/api/admin/testimonials' : `/api/admin/testimonials/${data.id}`;
      fields = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'role', label: 'Role', type: 'text' },
        { key: 'text', label: 'Testimonial', type: 'textarea' },
        { key: 'status', label: 'Status (Approved shows on the website; Pending hides it)', type: 'select', defaultValue: 'Approved', options: ['Pending', 'Approved'] },
        { key: 'avatar', label: 'Avatar URL', type: 'text' },
      ];
    } else if (page === 'admins') {
      title = mode === 'add' ? 'Add Admin' : 'Edit Admin';
      endpoint = mode === 'add' ? '/api/admin/admins' : `/api/admin/admins/${data.id}`;
      fields = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'role', label: 'Role', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
      ];
    } else if (page === 'roles') {
      title = mode === 'add' ? 'Add Role' : 'Edit Role';
      endpoint = mode === 'add' ? '/api/admin/roles' : `/api/admin/roles/${data.id}`;
      fields = [
        { key: 'name', label: 'Role Name', type: 'text' },
        { key: 'permissions', label: 'Permissions (comma-separated)', type: 'text' },
        { key: 'users', label: 'Users', type: 'number' },
        { key: 'status', label: 'Status', type: 'text' },
      ];
    } else if (page === 'settings') {
      title = 'Edit Settings';
      endpoint = '/api/admin/settings';
      fields = [
        { key: 'academyName', label: 'Academy Name', type: 'text' },
        { key: 'supportEmail', label: 'Support Email', type: 'email' },
        { key: 'primaryWhatsApp', label: 'Primary WhatsApp', type: 'text' },
        { key: 'currency', label: 'Currency', type: 'text' },
        { key: 'timezone', label: 'Timezone', type: 'text' },
        { key: 'smtpHost', label: 'SMTP Host', type: 'text' },
        { key: 'smtpPort', label: 'SMTP Port', type: 'number', defaultValue: 465 },
        { key: 'smtpSecure', label: 'SMTP Secure (true = SSL/TLS on 465, false = STARTTLS on 587)', type: 'select', options: ['true', 'false'] },
        { key: 'smtpUser', label: 'SMTP Username (mailbox address)', type: 'email' },
        { key: 'smtpPass', label: 'SMTP Password (leave blank to keep current)', type: 'password' },
        { key: 'smtpFrom', label: 'From Header (e.g. "HIKLASS Academy" <info@hiklassacademy.com>)', type: 'text' },
      ];
    } else {
      return null;
    }

    return (
      <Modal open={modal.open} title={title} onClose={() => setModal({ open: false, mode: '', data: null })}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const body = {};
            for (const f of fields) body[f.key] = f.type === 'number' ? Number(fd.get(f.key)) : fd.get(f.key);
            for (const key of ['courses', 'permissions']) {
              if (typeof body[key] === 'string') body[key] = body[key].split(',').map((s) => s.trim()).filter(Boolean);
            }
            for (const key of ['expertise', 'certifications']) {
              if (typeof body[key] === 'string') body[key] = body[key].split('\n').map((s) => s.trim()).filter(Boolean);
            }
            try {
              if (mode === 'add') {
                const created = await api('POST', endpoint, body);
                showToast(`${title.replace(/^(Add|Edit) /, '')} created.`, 'success');
                const newId = created?.course?.id || created?.package?.id;
                if (pendingImageFile && newId) {
                  if (page === 'courses') await uploadCourseImage(newId, pendingImageFile);
                  else if (page === 'packages') await uploadPackageImage(newId, pendingImageFile);
                }
              } else {
                await api('PUT', endpoint, body);
                showToast(`${title.replace(/^(Add|Edit) /, '')} updated.`, 'success');
              }
              setModal({ open: false, mode: '', data: null });
              await loadAll();
              if (adminSyncSections.includes(page)) await loadSection(page);
            } catch (err) { showToast(err.message, 'error'); }
          }}>
            {fields.map((f) => (
              <label key={f.key}>
                <span>{f.label}</span>
                {f.type === 'textarea' ? (
                  <textarea
                    name={f.key}
                    defaultValue={Array.isArray(data?.[f.key]) ? data[f.key].join('\n') : data?.[f.key] || ''}
                    rows={f.rows || 3}
                    style={inputStyle}
                  />
                ) : f.type === 'select' ? (
                  <select
                    name={f.key}
                    defaultValue={data?.[f.key] ?? f.defaultValue ?? ''}
                    required={f.required}
                    style={inputStyle}
                  >
                    {f.options.map((option) => {
                      const value = typeof option === 'object' ? option.value : option;
                      const label = typeof option === 'object' ? option.label : option;
                      return <option key={value} value={value}>{label}</option>;
                    })}
                  </select>
                ) : (
                  <input
                    name={f.key}
                    type={f.type}
                    defaultValue={Array.isArray(data?.[f.key]) ? data[f.key].join(', ') : data?.[f.key] ?? f.defaultValue ?? ''}
                    min={f.min}
                    required={f.required}
                    style={inputStyle}
                  />
                )}
              </label>
            ))}
            {(page === 'courses' || page === 'packages') && mode === 'edit' && data ? (
              <ModalImageField
                image={data.image}
                label={page === 'courses' ? 'Course Image' : 'Package Image'}
                fallbackIcon={page === 'courses' ? BookOpen : Package}
                onUpload={async (file) => {
                  const updated = page === 'courses' ? await uploadCourseImage(data.id, file) : await uploadPackageImage(data.id, file);
                  if (updated) setModal((current) => ({ ...current, data: { ...current.data, image: updated.image } }));
                }}
                onRemove={async () => {
                  const updated = page === 'courses' ? await removeCourseImage(data.id) : await removePackageImage(data.id);
                  if (updated) setModal((current) => ({ ...current, data: { ...current.data, image: updated.image } }));
                }}
              />
            ) : null}
            {(page === 'courses' || page === 'packages') && mode === 'add' ? (
              <label>
                <span>{page === 'courses' ? 'Course Image' : 'Package Image'} <small>(optional)</small></span>
                <div className="modalImageField">
                  <span className="modalImageFieldPreview">
                    {pendingImagePreview ? (
                      <img src={pendingImagePreview} alt="" />
                    ) : page === 'courses' ? <BookOpen size={22} /> : <Package size={22} />}
                  </span>
                  <div className="modalImageFieldActions">
                    <button type="button" className="button secondary" onClick={() => addImageInputRef.current?.click()}>
                      {pendingImageFile ? 'Change Image' : 'Choose Image'}
                    </button>
                    {pendingImageFile ? (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          setPendingImageFile(null);
                          setPendingImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return ''; });
                        }}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={addImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      setPendingImageFile(file);
                      setPendingImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
                    }}
                  />
                </div>
              </label>
            ) : null}
            <div className="modalActions">
              <button type="button" className="button secondary" onClick={() => setModal({ open: false, mode: '', data: null })}>Cancel</button>
              <button type="submit" className="button primary">{mode === 'add' ? 'Create' : 'Save'}</button>
            </div>
          </form>
      </Modal>
    );
  }
}

function ModalImageField({ image, label, fallbackIcon: FallbackIcon, onUpload, onRemove }) {
  const inputRef = React.useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try { await onUpload(file); } finally { setUploading(false); }
  }

  async function handleRemove() {
    setUploading(true);
    try { await onRemove(); } finally { setUploading(false); }
  }

  return (
    <label>
      <span>{label}</span>
      <div className="modalImageField">
        <span className="modalImageFieldPreview">
          {image ? <img src={getAssetUrl(image)} alt="" /> : <FallbackIcon size={22} />}
        </span>
        <div className="modalImageFieldActions">
          <button type="button" className="button secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Working...' : image ? 'Change Image' : 'Upload Image'}
          </button>
          {image ? (
            <button type="button" className="button secondary" onClick={handleRemove} disabled={uploading}>Remove</button>
          ) : null}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} />
      </div>
    </label>
  );
}

function EnrollmentTable({ orders, updateStatus, compact = false }) {
  return (
    <div className="adminTableWrap">
      <table className="adminDataTable">
        <thead>
          <tr>
            <th>Student</th>
            <th>Course / Package</th>
            <th>Amount</th>
            <th>Payment Method</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.length ? (
            orders.map((order) => {
              const status = getEnrollmentStatus(order);
              const selections = [
                ...(order.courses || []).map(getOrderCourseTitle),
                ...(order.packages || []).map(getOrderPackageName),
              ];
              return (
                <tr key={order.id}>
                  <td>
                    <div className="adminStudentCell">
                      <span>{studentAvatar(order.name)}</span>
                      <div>
                        <strong>{order.name}</strong>
                        <small>{order.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{selections[0] || 'Not provided'}</strong>
                    {selections.length > 1 ? <small>+{selections.length - 1} more</small> : null}
                  </td>
                  <td>{formatPrice(order.totalAmount || 0)}</td>
                  <td><span className="paymentMethodCell">{order.paymentMethod || 'Not set'}</span></td>
                  <td><span className={`statusBadge ${status.toLowerCase()}`}>{status}</span></td>
                  <td>{shortDate(order.createdAt)}<br /><small>{formatTime(order.createdAt)}</small></td>
                  <td>
                    <div className="adminRowActions">
                      {!compact ? (
                        <select value={status} onChange={(event) => updateStatus(order.id, event.target.value)}>
                          {Object.keys(statusColors).map((item) => <option key={item}>{item}</option>)}
                        </select>
                      ) : null}
                      <a href={`https://wa.me/${order.phone.replace(/\D/g, '')}?text=${buildAdminWhatsAppText(order)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="7">
                <div className="emptyAdminState compact">
                  <Search size={26} />
                  <h3>No enrollments found</h3>
                  <p>New enrollment requests will appear here after students submit the form.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CatalogImageCell({ item, isCourse, onUpload, onRemove }) {
  const inputRef = React.useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try { await onUpload(item.id, file); } finally { setUploading(false); }
  }

  const FallbackIcon = isCourse ? BookOpen : Package;

  return (
    <div className="adminCourseImageCell">
      <button
        type="button"
        className="adminCourseImageButton"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title={item.image ? 'Change image' : 'Upload image'}
      >
        {item.image ? <img src={getAssetUrl(item.image)} alt="" /> : <FallbackIcon size={19} />}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} />
      {item.image ? (
        <button type="button" className="adminCourseImageRemove" onClick={() => onRemove(item.id)} title="Remove image" aria-label="Remove image">
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}

function CatalogCRUD({ title, data, kind, onAdd, onEdit, onDelete, onUploadImage, onRemoveImage }) {
  const isCourse = kind === 'course';
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle">
        <h2>{title}</h2>
        <button type="button" onClick={() => onAdd()}><PlusCircle size={16} /> Add {isCourse ? 'Course' : 'Package'}</button>
      </div>
      <div className="adminCatalogGrid">
        {data.map((item) => (
          <article className="adminCatalogCard" key={item.id || item.title || item.name}>
            <div>
              <CatalogImageCell item={item} isCourse={isCourse} onUpload={onUploadImage} onRemove={onRemoveImage} />
              <strong>{item.title || item.name}</strong>
              <small>{item.category || 'Package'}</small>
            </div>
            <p>{item.description || (item.courses ? `Includes: ${(Array.isArray(item.courses) ? item.courses : []).join(', ')}` : '')}</p>
            <dl>
              <div><dt>Price</dt><dd>{formatPrice(item.price)}</dd></div>
              <div><dt>Duration</dt><dd>{item.duration}</dd></div>
              <div><dt>Status</dt><dd><span className="statusBadge paid">Active</span></dd></div>
            </dl>
            <footer>
              <button type="button" onClick={() => onEdit(item)}>Edit</button>
              <button type="button" className="danger" onClick={() => onDelete(item.id, isCourse ? 'course' : 'package')}>Delete</button>
            </footer>
          </article>
        ))}
      </div>
    </article>
  );
}

function MessagesPage({ messages }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle">
        <h2>Messages</h2>
        <span>{messages.length} messages</span>
      </div>
      <div className="adminMessageList expanded">
        {messages.length ? messages.map((msg) => (
          <div className="adminMessageItem" key={msg.id}>
            <span>{studentAvatar(msg.name)}</span>
            <div>
              <strong>{msg.name}</strong>
              <small>{msg.email}</small>
              <p>{msg.message}</p>
            </div>
            <time>{formatDate(msg.createdAt)}<br /><small>{formatTime(msg.createdAt)}</small></time>
          </div>
        )) : (
          <div className="emptyAdminState"><Search size={26} /><h3>No messages</h3></div>
        )}
      </div>
    </article>
  );
}

function EmailLogsPage({ logs }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle"><h2>Email Logs</h2></div>
      <div className="adminTableWrap">
        <table className="adminDataTable">
          <thead><tr><th>Recipient</th><th>Subject</th><th>Status</th><th>Details</th><th>Date</th></tr></thead>
          <tbody>
            {logs.length ? logs.map((log) => (
              <tr key={log.id}>
                <td>{log.recipient}</td>
                <td>{log.subject}</td>
                <td><span className={`statusBadge ${(log.status || '').toLowerCase()}`}>{log.status || 'Sent'}</span></td>
                <td>{log.errorMessage || 'Delivered successfully'}</td>
                <td>{formatDate(log.date)}</td>
              </tr>
            )) : (
              <tr><td colSpan={5}><div className="emptyAdminState compact"><h3>No email attempts recorded yet</h3></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function SettingsPage({ tokenInput, setTokenInput, saveToken, settings, onEdit, onTestEmail }) {
  return (
    <section className="adminSettingsGrid">
      <article className="adminPanel">
        <div className="adminPanelTitle">
          <h2>Brand Settings</h2>
          <button type="button" onClick={onEdit}>Edit</button>
        </div>
        <div className="settingsRows">
          <p><span>Academy</span><strong>{settings?.academyName || 'HIKLASS Academy'}</strong></p>
          <p><span>Primary Blue</span><strong>#1E2F97</strong></p>
          <p><span>Royal Blue</span><strong>#2554A5</strong></p>
          <p><span>Red</span><strong>#D30D1A</strong></p>
        </div>
      </article>
      <article className="adminPanel">
        <h2>Contact Settings</h2>
        <div className="settingsRows">
          <p><span>Email</span><strong>{settings?.supportEmail || 'info@hiklassacademy.com'}</strong></p>
          <p><span>WhatsApp</span><strong>{settings?.primaryWhatsApp || '+237651251941'}</strong></p>
        </div>
      </article>
      <article className="adminPanel">
        <div className="adminPanelTitle">
          <h2>Email Settings</h2>
          <button type="button" onClick={onEdit}>Edit</button>
        </div>
        <div className="settingsRows">
          <p><span>SMTP host</span><strong>{settings?.smtpHost || 'Not set'}</strong></p>
          <p><span>SMTP port</span><strong>{settings?.smtpPort || 'Not set'}</strong></p>
          <p><span>SMTP secure</span><strong>{settings?.smtpSecure ? 'Yes (SSL/TLS)' : 'No (STARTTLS)'}</strong></p>
          <p><span>SMTP user</span><strong>{settings?.smtpUser || 'Not set'}</strong></p>
          <p><span>SMTP password</span><strong>{settings?.smtpPassSet ? '•••••••••••• (set)' : 'Not set'}</strong></p>
        </div>
        <div className="adminPanelTitle" style={{ marginTop: 12 }}>
          <button type="button" className="button secondary" onClick={onTestEmail}>Send Test Email</button>
        </div>
      </article>
      <article className="adminPanel">
        <h2>Admin Access</h2>
        <form className="adminTokenForm" onSubmit={saveToken}>
          <label><LockKeyhole size={18} /> Admin token</label>
          <div>
            <input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="Admin token" />
            <button className="button secondary" type="submit">Apply</button>
          </div>
        </form>
      </article>
    </section>
  );
}

function AdminTable({ headers, rows, emptyMsg, onAdd, onEdit, onDelete, addLabel, renderRowActions }) {
  return (
    <>
      {onAdd ? (
        <div className="adminTableActions">
          <button type="button" onClick={onAdd}><PlusCircle size={16} /> {addLabel || 'Add Record'}</button>
        </div>
      ) : null}
      <div className="adminTableWrap">
        <table className="adminDataTable">
          <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}<th>Actions</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.id}>
                {headers.map((h) => <td key={h}>{row[h] ?? '-'}</td>)}
                <td>
                  <div className="adminRowActions">
                    {renderRowActions ? renderRowActions(row) : null}
                    {onEdit ? <button type="button" onClick={() => onEdit(row)}>Edit</button> : null}
                    {onDelete ? <button type="button" className="danger" onClick={() => onDelete(row.id)}>Delete</button> : null}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={headers.length + 1}><div className="emptyAdminState compact"><h3>{emptyMsg || 'No data'}</h3></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StudentsPage({ data, onAdd, onEdit, onDelete }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle"><h2>Students</h2></div>
      <AdminTable headers={['name', 'email', 'phone', 'courses']} rows={data.map((s) => ({ ...s, courses: (s.courses || []).join(', ') }))} emptyMsg="No students yet" onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} addLabel="Add Student" />
    </article>
  );
}

function PaymentsPage({ data, onAdd, onEdit, onDelete }) {
  const [filterMethod, setFilterMethod] = useState('');
  const filtered = filterMethod ? data.filter((p) => (p.method || '').toLowerCase() === filterMethod.toLowerCase()) : data;
  const revenueByMethod = PAYMENT_METHODS.map((method) => ({
    ...method,
    total: data
      .filter((payment) => payment.method === method.id)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
  }));
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle">
        <h2>Payments</h2>
        <div className="paymentsFilterGroup">
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
            <option value="">All Methods</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.id} value={method.id}>{method.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="paymentRevenueGrid" aria-label="Revenue by Payment Method">
        {revenueByMethod.map((method) => (
          <div className="paymentRevenueCard" key={method.id}>
            <PaymentIcon method={method.id} size={28} />
            <span>{method.label}</span>
            <strong>{formatPrice(method.total)}</strong>
          </div>
        ))}
      </div>
      <AdminTable
        headers={['studentName', 'amount', 'method', 'status', 'reference', 'date']}
        rows={filtered.map((p) => ({
          ...p,
          studentName: p.studentName || p.enrollmentId || '-',
          amount: formatPrice(p.amount || 0),
          reference: p.reference || '-',
        }))}
        emptyMsg="No payments yet"
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        addLabel="Add Payment"
      />
    </article>
  );
}

function DiscountsPage({ data, onAdd, onEdit, onDelete }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle"><h2>Discounts</h2></div>
      <AdminTable
        headers={['code', 'type', 'value', 'appliesTo', 'minOrderAmount', 'usageLimit', 'usedCount', 'status']}
        rows={data.map((item) => ({
          ...item,
          type: item.type || (item.percentage ? 'percentage' : 'fixed'),
          value: item.value ?? item.percentage ?? 0,
          appliesTo: item.appliesTo || 'all',
          minOrderAmount: item.minOrderAmount ?? 0,
          usageLimit: item.usageLimit ?? item.maxUses ?? 0,
          usedCount: item.usedCount ?? item.used ?? 0,
          status: item.status || 'Active',
        }))}
        emptyMsg="No discount codes"
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        addLabel="Add Discount"
      />
    </article>
  );
}

function InstructorPhotoCell({ instructor, onUpload, onRemove }) {
  const inputRef = React.useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try { await onUpload(instructor.id, file); } finally { setUploading(false); }
  }

  return (
    <div className="adminInstructorPhotoCell">
      <button
        type="button"
        className="adminInstructorPhotoButton"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title={instructor.image ? 'Change photo' : 'Upload photo'}
      >
        {instructor.image ? <img src={getAssetUrl(instructor.image)} alt="" /> : <UserRound size={20} />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {instructor.image ? (
        <button type="button" className="adminInstructorPhotoRemove" onClick={() => onRemove(instructor.id)} title="Remove photo" aria-label="Remove photo">
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}

function InstructorsPage({ data, onAdd, onEdit, onDelete, onUploadPhoto, onRemovePhoto }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle">
        <h2>Instructors</h2>
        <button type="button" onClick={onAdd}><PlusCircle size={16} /> Add Instructor</button>
      </div>
      <div className="adminTableWrap">
        <table className="adminDataTable">
          <thead>
            <tr><th>Photo</th><th>name</th><th>role</th><th>courses</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {data.length ? data.map((inst) => (
              <tr key={inst.id}>
                <td><InstructorPhotoCell instructor={inst} onUpload={onUploadPhoto} onRemove={onRemovePhoto} /></td>
                <td>{inst.name || '-'}</td>
                <td>{inst.role || '-'}</td>
                <td>{(inst.courses || []).join(', ') || '-'}</td>
                <td>
                  <div className="adminRowActions">
                    <button type="button" onClick={() => onEdit(inst)}>Edit</button>
                    <button type="button" className="danger" onClick={() => onDelete(inst.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5}><div className="emptyAdminState compact"><h3>No instructors yet</h3></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function TestimonialsPage({ data, onAdd, onEdit, onDelete, onApprove }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle"><h2>Testimonials</h2></div>
      <AdminTable
        headers={['name', 'role', 'text', 'status']}
        rows={data}
        emptyMsg="No testimonials yet"
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        addLabel="Add Testimonial"
        renderRowActions={(row) => (row.status !== 'Approved' ? (
          <button type="button" className="success" onClick={() => onApprove(row)}>Approve</button>
        ) : null)}
      />
    </article>
  );
}

function AdminsPage({ data, onAdd, onEdit, onDelete }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle"><h2>Admins</h2></div>
      <AdminTable headers={['name', 'email', 'role', 'status']} rows={data} emptyMsg="No admin users yet" onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} addLabel="Add Admin" />
    </article>
  );
}

function RolesPage({ data, onAdd, onEdit, onDelete }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle"><h2>Roles & Permissions</h2></div>
      <AdminTable headers={['name', 'permissions', 'users', 'status']} rows={data.map((role) => ({ ...role, permissions: (role.permissions || []).join(', ') }))} emptyMsg="No roles yet" onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} addLabel="Add Role" />
    </article>
  );
}

function ActivityLogsPage({ data }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle"><h2>Activity Logs</h2></div>
      <AdminTable headers={['actor', 'action', 'target', 'detail', 'createdAt']} rows={data} emptyMsg="No activity recorded yet" />
    </article>
  );
}

function ReportsPage({ reports, stats, exportCsv }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle">
        <h2>Reports</h2>
        <button type="button" onClick={exportCsv}><Download size={16} /> Export Enrollments</button>
      </div>
      <div className="adminReportGrid">
        {(reports.length ? reports : [{ id: 'live', name: 'Live Summary', totalEnrollments: stats?.totalOrders || 0, totalRevenue: stats?.totalAmount || 0, totalPayments: 0 }]).map((report) => (
          <article className="adminReportCard" key={report.id}>
            <strong>{report.name}</strong>
            <p>Enrollments: {report.totalEnrollments ?? 0}</p>
            <p>Revenue: {formatPrice(report.totalRevenue || 0)}</p>
            <p>Payments: {formatPrice(report.totalPayments || 0)}</p>
          </article>
        ))}
      </div>
    </article>
  );
}

function PlaceholderPage({ page, orders }) {
  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle"><h2>{page?.label || 'Admin Page'}</h2></div>
      <div className="adminPlaceholder">
        <LifeBuoy size={34} />
        <h3>{page?.label || 'Admin'} workspace</h3>
        <p>No records are available in this section. Current enrollment records available: {orders.length}.</p>
      </div>
    </article>
  );
}

function AppFallback() {
  return (
    <main className="appFallback">
      <section>
        <img src={brandAssets.logoHorizontal} alt="HIKLASS Academy" />
        <h1>HIKLASS Academy</h1>
        <p>The website could not finish loading. Please refresh this page or contact info@hiklassacademy.com.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload page</button>
      </section>
    </main>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App render failed:', error, info);
  }

  render() {
    if (this.state.hasError) return <AppFallback />;
    return this.props.children;
  }
}

function App() {
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [hasSeenFloatingEnroll, setHasSeenFloatingEnroll] = useState(false);
  const adminPath = window.location.pathname.replace(/\/$/, '') || '/';
  const isAdminLoginRoute = adminPath === '/admin/login';
  const isAdminDashboardRoute = adminPath === '/admin' || adminPath.startsWith('/admin/');
  const isStudentLoginRoute = adminPath === '/student/login';
  const isStudentRegisterRoute = adminPath === '/student/register';
  const isStudentForgotPasswordRoute = adminPath === '/student/forgot-password' || adminPath === '/student/reset-password';
  const isStudentPortalRoute = adminPath.startsWith('/student') && !isStudentLoginRoute && !isStudentRegisterRoute && !isStudentForgotPasswordRoute;
  const blogArticleMatch = adminPath.match(/^\/blog\/(.+)$/);
  const isBlogRoute = adminPath === '/blog' || Boolean(blogArticleMatch);
  const isAboutRoute = adminPath === '/about';
  const isContactRoute = adminPath === '/contact';
  const instructorProfileMatch = adminPath.match(/^\/instructor\/(.+)$/);
  const selectedCount = selectedCourses.length + selectedPackages.length;

  React.useEffect(() => {
    if (!selectedCount || hasSeenFloatingEnroll) return undefined;
    const pulseTimer = window.setTimeout(() => setHasSeenFloatingEnroll(true), 1200);
    return () => window.clearTimeout(pulseTimer);
  }, [hasSeenFloatingEnroll, selectedCount]);

  function toggleCourse(course) {
    setSelectedCourses((current) =>
      current.some((item) => item.id === course.id)
        ? current.filter((item) => item.id !== course.id)
        : [...current, course],
    );
  }

  function togglePackage(packageItem) {
    setSelectedPackages((current) =>
      current.some((item) => item.id === packageItem.id)
        ? current.filter((item) => item.id !== packageItem.id)
        : [...current, packageItem],
    );
  }

  const isAdminRoute = adminPath.startsWith('/admin');
  const isStudentRoute = adminPath.startsWith('/student');

  if (isAdminLoginRoute) {
    if (getStoredAdminToken()) {
      window.history.replaceState(null, '', '/admin/dashboard');
      return <AdminDashboard />;
    }
    return <AdminLogin />;
  }

  if (adminPath === '/admin/content') {
    return <AdminContentManager />;
  }

  if (isAdminDashboardRoute && !isAdminLoginRoute) {
    if (!getStoredAdminToken()) {
      window.history.replaceState(null, '', '/admin/login');
      return <AdminLogin />;
    }
    if (adminPath === '/admin') {
      window.history.replaceState(null, '', '/admin/dashboard');
    }
    return <AdminDashboard initialPage={getAdminPageFromPath()} />;
  }

  if (isStudentLoginRoute) {
    if (getStoredStudentToken()) {
      window.history.replaceState(null, '', '/student/dashboard');
      return <StudentPortal path="/student/dashboard" />;
    }
    return <StudentLogin />;
  }

  if (isStudentRegisterRoute) {
    if (getStoredStudentToken()) {
      window.history.replaceState(null, '', '/student/dashboard');
      return <StudentPortal path="/student/dashboard" />;
    }
    return <StudentRegister />;
  }

  if (isStudentForgotPasswordRoute) {
    return <StudentResetPassword />;
  }

  if (isStudentPortalRoute) {
    if (!getStoredStudentToken()) {
      window.history.replaceState(null, '', '/student/login');
      return <StudentLogin />;
    }
    if (adminPath === '/student') {
      window.history.replaceState(null, '', '/student/dashboard');
      return <StudentPortal path="/student/dashboard" />;
    }
    return <StudentPortal path={adminPath} />;
  }

  if (isBlogRoute) {
    return (
      <>
        <BlogPage slug={blogArticleMatch ? decodeURIComponent(blogArticleMatch[1]) : ''} />
        <SmartsuppChat enabled />
      </>
    );
  }

  if (isAboutRoute) {
    return (
      <>
        <AboutPage />
        <SmartsuppChat enabled />
      </>
    );
  }

  if (isContactRoute) {
    return (
      <>
        <ContactPage />
        <SmartsuppChat enabled />
      </>
    );
  }

  if (instructorProfileMatch) {
    return <InstructorProfilePage instructorId={decodeURIComponent(instructorProfileMatch[1])} />;
  }

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <CategorySection />
        <CoursesSection selectedCourses={selectedCourses} onToggle={toggleCourse} />
        <WhyChoose />
        <Instructors />
        <PackagesSection selectedPackages={selectedPackages} onToggle={togglePackage} />
        <EnrollmentForm
          selectedCourses={selectedCourses}
          selectedPackages={selectedPackages}
          setSelectedCourses={setSelectedCourses}
          setSelectedPackages={setSelectedPackages}
        />
        <Testimonials />
        <FAQ />
      </main>
      <SiteFooter />
      <FloatingEnrollButton selectedCount={selectedCount} pulse={!hasSeenFloatingEnroll} />
      <SmartsuppChat enabled={!isAdminRoute && !isStudentRoute} />
    </>
  );
}

const rootElement = document.getElementById('root');

try {
  createRoot(rootElement).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>,
  );
} catch (error) {
  console.error('App startup failed:', error);
  rootElement.innerHTML = `
    <main class="appFallback">
      <section>
        <h1>HIKLASS Academy</h1>
        <p>The website could not start. Please refresh this page or contact info@hiklassacademy.com.</p>
        <button type="button" onclick="window.location.reload()">Reload page</button>
      </section>
    </main>
  `;
}
