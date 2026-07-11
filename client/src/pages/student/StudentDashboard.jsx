import React, { useEffect, useState } from 'react';
import {
  Award,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Gift,
  GraduationCap,
  LifeBuoy,
} from 'lucide-react';
import ActivityChart from '../../components/student/ActivityChart';
import CourseCard from '../../components/student/CourseCard';
import CourseStatusList from '../../components/student/CourseStatusList';
import MiniCalendar from '../../components/student/MiniCalendar';
import { fetchStudentDashboard, fetchInstructors } from '../../services/studentAuthService';
import {
  statusBadgeClass,
  paymentMethodStyle,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_HELP,
  PAYMENT_STATUS_HELP,
} from '../../utils/studentStatus';
import './StudentDashboard.css';

const UPCOMING_TYPE_COLOR = { class: '#1E2F97', assignment: '#F59E0B', quiz: '#16A34A' };

function CircularProgress({ percent }) {
  const size = 130;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="studentProgressRing">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1E2F97"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="47%" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0149CA">{percent}%</text>
        <text x="50%" y="63%" textAnchor="middle" fontSize="10" fill="#6B7280">Overall Progress</text>
      </svg>
    </div>
  );
}

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString('en-US')} FCFA`;
}

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStudentDashboard()
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    fetchInstructors().then((list) => { if (!cancelled) setInstructors(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="studentEmptyState">Loading your dashboard...</p>;
  if (error) return <p className="studentEmptyState">{error}</p>;
  if (!data) return null;

  const { student, stats, courses, activity, latestOrder, latestPayment, announcements, upcomingItems } = data;
  const firstName = (student?.name || 'Student').split(' ')[0];

  return (
    <div>
      <div className="studentTopCard">
        <div className="studentWelcomeBlock">
          <p className="studentWelcomeGreeting">Hello,</p>
          <h2>{firstName} 👋</h2>
          <p className="studentWelcomeSubtitle">Welcome back! Continue learning and achieve your goals.</p>
          <a href="/student/courses">Continue Learning <ArrowRight size={16} /></a>
        </div>

        <div className="studentStatsPanel">
          <CircularProgress percent={stats.enrollmentProgress} />
          <div className="studentStatsGrid">
            <div className="studentStatTile">
              <span className="studentStatIcon" style={{ background: '#EEF1FD', color: '#0149CA' }}><GraduationCap size={19} /></span>
              <div><strong>{stats.purchasedCourses}</strong><small>Purchased Courses</small></div>
            </div>
            <div className="studentStatTile">
              <span className="studentStatIcon" style={{ background: '#F3E8FF', color: '#7C3AED' }}><Gift size={19} /></span>
              <div><strong>{stats.purchasedPackages}</strong><small>Purchased Packages</small></div>
            </div>
            <div className="studentStatTile">
              <span className="studentStatIcon" style={{ background: '#DCFCE7', color: '#16A34A' }}><CheckCircle2 size={19} /></span>
              <div><strong>{stats.completedOrders}</strong><small>Orders Completed</small></div>
            </div>
            <div className="studentStatTile">
              <span className="studentStatIcon" style={{ background: '#FEF3C7', color: '#F59E0B' }}><Clock3 size={19} /></span>
              <div><strong>{stats.pendingOrders}</strong><small>Orders Pending</small></div>
            </div>
            <div className="studentStatTile">
              <span className="studentStatIcon" style={{ background: '#F3E8FF', color: '#7C3AED' }}><Award size={19} /></span>
              <div><strong>{stats.paidPayments}</strong><small>Payments Completed</small></div>
            </div>
            <div className="studentStatTile">
              <span className="studentStatIcon" style={{ background: '#EEF1FD', color: '#0149CA' }}><CreditCard size={19} /></span>
              <div><strong>{formatMoney(stats.totalPaid)}</strong><small>Total Paid</small></div>
            </div>
          </div>
        </div>
      </div>

      <div className="studentDashboardSection">
        <div className="studentCardHead">
          <h3>My Courses</h3>
          <a href="/student/courses">View All Courses</a>
        </div>
        {courses.length ? (
          <div className="studentCoursesScroll">
            {courses.slice(0, 6).map((course) => <CourseCard key={course.title} course={course} instructors={instructors} />)}
          </div>
        ) : (
          <div className="studentEmptyState">
            <GraduationCap size={36} />
            <h2>No courses yet</h2>
            <p>Enroll in a course to see it here.</p>
            <a href="/#courses">Browse courses</a>
          </div>
        )}
      </div>

      <div className="studentDashboardGrid">
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="studentCard">
            <div className="studentCardHead">
              <h3>Learning Progress Overview</h3>
              <span className="studentCardHeadTag">This Week</span>
            </div>
            <div className="studentProgressOverviewGrid">
              <ActivityChart data={activity} height={230} />
              <div className="studentTopSubjects">
                <h4>Course Status</h4>
                <CourseStatusList courses={courses} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <div className="studentCard">
            <div className="studentCardHead"><h3>Order & Payment Status</h3><a href="/student/orders">View All</a></div>
            {latestOrder ? (
              <>
                <div className="studentOrderStatusRow">
                  <div>
                    <strong>Order Status</strong>
                    <p>{ORDER_STATUS_HELP[latestOrder.status] || 'Track the status of your latest order.'}</p>
                  </div>
                  <span className={`studentStatusBadge ${statusBadgeClass(latestOrder.status)}`}>{ORDER_STATUS_LABEL[latestOrder.status] || latestOrder.status}</span>
                </div>
                <div className="studentOrderStatusRow">
                  <div>
                    <strong>Payment Status</strong>
                    <p>{PAYMENT_STATUS_HELP[latestPayment?.status] || 'No payment recorded yet.'}</p>
                  </div>
                  <span className={`studentStatusBadge ${statusBadgeClass(latestPayment?.status || 'pending')}`}>{latestPayment?.status || 'Pending'}</span>
                </div>
                {latestPayment?.method ? (
                  <div className="studentOrderStatusRow">
                    <div><strong>Payment Method</strong></div>
                    <span className="studentMethodBadge" style={paymentMethodStyle(latestPayment.method)}>{latestPayment.method}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="studentEmptyState">No orders yet.</p>
            )}
          </div>

          <div className="studentCard">
            <div className="studentCardHead"><h3>Announcements</h3><a href="/student/announcements">View All</a></div>
            {announcements.length ? (
              <div className="studentAnnouncementList">
                {announcements.map((item) => (
                  <div key={item.id}>
                    <strong style={{ fontSize: '0.85rem' }}>{item.title}</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--hk-muted)' }}>{item.body}</p>
                    <time style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{new Date(item.createdAt).toLocaleDateString()}</time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="studentEmptyState">No announcements yet.</p>
            )}
          </div>

          <div className="studentCard">
            <div className="studentCardHead"><h3>Upcoming Items</h3></div>
            <div className="studentUpcomingList">
              {upcomingItems.length ? upcomingItems.map((item) => (
                <div className="studentUpcomingRow" key={item.id}>
                  <span className="studentUpcomingDot" style={{ background: UPCOMING_TYPE_COLOR[item.type] || '#1E2F97' }} />
                  <div>
                    <strong>{item.title}</strong>
                    <small>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(item.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                </div>
              )) : <p className="studentEmptyState" style={{ padding: '10px 0' }}>Nothing scheduled yet.</p>}
            </div>
            <MiniCalendar items={upcomingItems} />
          </div>

          <div className="studentCard">
            <div className="studentCardHead"><h3>Quick Actions</h3></div>
            <div className="studentQuickActions">
              <a className="studentQuickActionBtn" href="/#courses" style={{ background: '#EEF1FD', color: '#0149CA' }}>
                <GraduationCap size={20} />Browse Courses
              </a>
              <a className="studentQuickActionBtn" href="/student/downloads" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                <Download size={20} />Downloads
              </a>
              <a className="studentQuickActionBtn" href="/student/certificates" style={{ background: '#F3E8FF', color: '#7C3AED' }}>
                <Award size={20} />Certificates
              </a>
              <a className="studentQuickActionBtn" href="/#contact" style={{ background: '#FEE2E2', color: '#D30D1A' }}>
                <LifeBuoy size={20} />Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
