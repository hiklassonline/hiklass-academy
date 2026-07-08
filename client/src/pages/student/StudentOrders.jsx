import React, { useEffect, useState } from 'react';
import { GraduationCap, WalletCards } from 'lucide-react';
import { fetchStudentEnrollments, fetchStudentPayments } from '../../services/studentAuthService';
import { statusBadgeClass, paymentMethodStyle } from '../../utils/studentStatus';

function orderTotal(order) {
  return Number(order.grandTotal ?? order.totalAmount ?? 0).toLocaleString('en-US');
}

function orderItems(order) {
  const courses = (order.courses || []).map((course) => course.title || course);
  const packages = (order.packages || []).map((item) => item.name || item);
  return [...courses, ...packages].join(', ') || 'No items';
}

export default function StudentOrders() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStudentEnrollments(), fetchStudentPayments()])
      .then(([enrollments, paymentList]) => {
        if (cancelled) return;
        setOrders(enrollments);
        setPayments(paymentList);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function paymentForOrder(orderId) {
    return payments.find((payment) => payment.enrollmentId === orderId);
  }

  return (
    <div>
      <div className="studentPageHeader">
        <h2>My Enrollments</h2>
        <p>Every order you've placed, with payment status.</p>
      </div>

      {loading ? <p className="studentEmptyState">Loading your enrollments...</p> : null}
      {!loading && error ? <p className="studentEmptyState">{error}</p> : null}

      {!loading && !error && !orders.length ? (
        <div className="studentEmptyState">
          <GraduationCap size={40} />
          <h2>No enrollments yet</h2>
          <p>Once you enroll in a course or package using this email address, it will show up here.</p>
          <a href="/#courses">Browse courses</a>
        </div>
      ) : null}

      {!loading && !error && orders.length ? (
        <div className="studentEnrollmentGrid">
          {orders.map((order) => {
            const payment = paymentForOrder(order.id);
            return (
              <article className="studentEnrollmentCard" key={order.id}>
                <div className="studentEnrollmentIcon"><WalletCards size={20} /></div>
                <div className="studentEnrollmentBody">
                  <h4>{orderItems(order)}</h4>
                  <span>Placed on {new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="studentEnrollmentMeta">
                  <span className={`studentStatusBadge ${statusBadgeClass(order.status)}`}>{order.status || 'Pending'}</span>
                  <span className="studentEnrollmentAmount">{orderTotal(order)} FCFA</span>
                  {payment?.method ? (
                    <span className="studentMethodBadge" style={paymentMethodStyle(payment.method)}>{payment.method}</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
