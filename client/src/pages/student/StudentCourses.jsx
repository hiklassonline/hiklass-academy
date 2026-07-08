import React, { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import CourseCard from '../../components/student/CourseCard';
import { fetchStudentDashboard, fetchInstructors } from '../../services/studentAuthService';

export default function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStudentDashboard()
      .then((data) => { if (!cancelled) setCourses(data.courses || []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    fetchInstructors().then((list) => { if (!cancelled) setInstructors(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="studentPageHeader">
        <h2>My Courses</h2>
        <p>Courses you've enrolled in, with their current stage.</p>
      </div>

      {!loading && !error && courses.length ? (
        <p className="studentProgressNote">
          Progress shown reflects your enrollment stage (payment confirmed → in progress → completed).
          Lesson-by-lesson tracking is coming soon.
        </p>
      ) : null}

      {loading ? <p className="studentEmptyState">Loading your courses...</p> : null}
      {!loading && error ? <p className="studentEmptyState">{error}</p> : null}

      {!loading && !error && !courses.length ? (
        <div className="studentEmptyState">
          <GraduationCap size={40} />
          <h2>No courses yet</h2>
          <p>Once you enroll in a course using this email address, it will show up here.</p>
          <a href="/#courses">Browse courses</a>
        </div>
      ) : null}

      {!loading && !error && courses.length ? (
        <div className="studentCourseGrid">
          {courses.map((course) => (
            <CourseCard key={course.title} course={course} instructors={instructors} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
