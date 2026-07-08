import React from 'react';
import { statusBadgeClass } from '../../utils/studentStatus';

const DOT_COLORS = ['#1E2F97', '#16A34A', '#F59E0B', '#D30D1A', '#2554A5', '#7C3AED'];

export default function CourseStatusList({ courses }) {
  if (!courses.length) {
    return <p className="studentEmptyState">No courses to show yet.</p>;
  }

  return (
    <div className="studentSubjectList">
      {courses.map((course, index) => (
        <div className="studentSubjectRow" key={course.title}>
          <span className="studentSubjectDot" style={{ background: DOT_COLORS[index % DOT_COLORS.length] }} />
          <span className="studentSubjectName">{course.title}</span>
          <span className={`studentStatusBadge ${statusBadgeClass(course.status)}`}>{course.status}</span>
        </div>
      ))}
    </div>
  );
}
