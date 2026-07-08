import React, { useEffect, useState } from 'react';
import ActivityChart from '../../components/student/ActivityChart';
import CourseStatusList from '../../components/student/CourseStatusList';
import { fetchStudentDashboard } from '../../services/studentAuthService';

export default function StudentProgress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStudentDashboard()
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="studentPageHeader">
        <h2>Learning Progress</h2>
        <p>Your enrollment activity and course status at a glance.</p>
      </div>

      {loading ? <p className="studentEmptyState">Loading your progress...</p> : null}
      {!loading && error ? <p className="studentEmptyState">{error}</p> : null}

      {!loading && !error && data ? (
        <div className="studentDashboardGrid">
          <div className="studentCard" style={{ gridColumn: '1 / -1' }}>
            <div className="studentCardHead"><h3>Enrollment Activity (Last 7 Days)</h3></div>
            <ActivityChart data={data.activity} height={260} />
          </div>

          <div className="studentCard" style={{ gridColumn: '1 / -1' }}>
            <div className="studentCardHead"><h3>Course Status</h3></div>
            <p className="studentProgressNote">
              Status reflects your enrollment stage (payment confirmed → in progress → completed).
              Lesson-by-lesson tracking is coming soon.
            </p>
            <CourseStatusList courses={data.courses} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
