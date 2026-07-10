import React, { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import PackageCard from '../../components/student/PackageCard';
import { fetchStudentDashboard } from '../../services/studentAuthService';

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
        <p>Bundle packages you've enrolled in. Open one to access its course content, lessons, and assignments — just like a regular course.</p>
      </div>

      {!loading && !error && packages.length ? (
        <p className="studentProgressNote">
          Progress shown reflects your enrollment stage (payment confirmed → in progress → completed).
          Lesson-by-lesson tracking is coming soon.
        </p>
      ) : null}

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
        <div className="studentCourseGrid">
          {packages.map((pkg) => (
            <PackageCard key={pkg.name} pkg={pkg} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
