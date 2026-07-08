import React, { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { fetchStudentDashboard } from '../../services/studentAuthService';
import { statusBadgeClass } from '../../utils/studentStatus';

export default function StudentPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStudentDashboard()
      .then((data) => { if (!cancelled) setPackages(data.packages || []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="studentPageHeader">
        <h2>My Packages</h2>
        <p>Bundle packages you've enrolled in, with their current stage.</p>
      </div>

      {loading ? <p className="studentEmptyState">Loading your packages...</p> : null}
      {!loading && error ? <p className="studentEmptyState">{error}</p> : null}

      {!loading && !error && !packages.length ? (
        <div className="studentEmptyState">
          <Package size={40} />
          <h2>No packages yet</h2>
          <p>Once you enroll in a package using this email address, it will show up here.</p>
          <a href="/#packages">Browse packages</a>
        </div>
      ) : null}

      {!loading && !error && packages.length ? (
        <div className="studentEnrollmentGrid">
          {packages.map((pkg) => (
            <article className="studentEnrollmentCard" key={pkg.name}>
              <div className="studentEnrollmentIcon"><Package size={20} /></div>
              <div className="studentEnrollmentBody">
                <h4>{pkg.name}</h4>
                <span>{pkg.duration || (pkg.courses || []).join(', ') || 'Bundle package'}</span>
              </div>
              <div className="studentEnrollmentMeta">
                <span className={`studentStatusBadge ${statusBadgeClass(pkg.status)}`}>{pkg.status}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
