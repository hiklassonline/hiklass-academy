import React, { useEffect, useState } from 'react';
import { GraduationCap, LogOut, Package, WalletCards } from 'lucide-react';
import { brandAssets } from '../../assets';
import { clearStudentSession, fetchStudentEnrollments, fetchStudentPayments } from '../../services/studentAuthService';
import './StudentDashboard.css';

function orderTotal(order) {
  return Number(order.grandTotal ?? order.totalAmount ?? 0).toLocaleString('en-US');
}

function orderItems(order) {
  const courses = (order.courses || []).map((course) => course.title || course);
  const packages = (order.packages || []).map((item) => item.name || item);
  return [...courses, ...packages].join(', ') || 'No items';
}

export default function StudentDashboard() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [enrollments, paymentList] = await Promise.all([fetchStudentEnrollments(), fetchStudentPayments()]);
        if (cancelled) return;
        setOrders(enrollments);
        setPayments(paymentList);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function logout() {
    clearStudentSession();
    window.location.assign('/');
  }

  function paymentForOrder(orderId) {
    return payments.find((payment) => payment.enrollmentId === orderId);
  }

  return (
    <main className="studentDashboardPage">
      <header className="studentDashboardHeader">
        <a className="studentDashboardBrand" href="/">
          <img src={brandAssets.logoHorizontal} alt="HIKLASS Academy" />
        </a>
        <button className="studentDashboardLogout" type="button" onClick={logout}>
          <LogOut size={18} />
          Log Out
        </button>
      </header>

      <section className="studentDashboardBody">
        <h1>My Enrollments</h1>
        <p className="studentDashboardSubtitle">Track the courses and packages you've enrolled in, along with their payment status.</p>

        {loading ? <p className="studentDashboardState">Loading your enrollments...</p> : null}
        {!loading && error ? <p className="studentDashboardState studentDashboardError">{error}</p> : null}

        {!loading && !error && !orders.length ? (
          <div className="studentDashboardEmpty">
            <GraduationCap size={40} />
            <h2>No enrollments yet</h2>
            <p>Once you enroll in a course or package using this email address, it will show up here.</p>
            <a className="studentDashboardCta" href="/#courses">Browse courses</a>
          </div>
        ) : null}

        {!loading && !error && orders.length ? (
          <div className="studentDashboardList">
            {orders.map((order) => {
              const payment = paymentForOrder(order.id);
              return (
                <article className="studentDashboardCard" key={order.id}>
                  <div className="studentDashboardCardIcon">
                    <Package size={22} />
                  </div>
                  <div className="studentDashboardCardBody">
                    <h3>{orderItems(order)}</h3>
                    <p>Enrolled on {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="studentDashboardCardMeta">
                    <span className={`statusBadge ${(order.status || 'pending').toLowerCase()}`}>{order.status || 'Pending'}</span>
                    <span className="studentDashboardAmount">
                      <WalletCards size={16} />
                      {orderTotal(order)} FCFA
                    </span>
                    {payment ? (
                      <span className="studentDashboardPaymentMethod">{payment.method}</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
