import React from 'react';
import { ArrowRight, BookOpen, UserRound } from 'lucide-react';
import { courses as catalog } from '../../data/courses';
import { statusBadgeClass } from '../../utils/studentStatus';
import getAssetUrl from '../../utils/getAssetUrl';

function findCatalogCourse(title) {
  const normalized = String(title || '').toLowerCase();
  return (
    catalog.find((course) => course.title.toLowerCase() === normalized) ||
    catalog.find((course) => normalized.includes(course.title.toLowerCase()) || course.title.toLowerCase().includes(normalized))
  );
}

function findInstructor(instructors, title) {
  const normalized = String(title || '').toLowerCase();
  return (instructors || []).find((inst) => (inst.courses || []).some((c) => String(c).toLowerCase() === normalized));
}

const CTA_LABEL = {
  'Pending Payment': 'View Payment Status',
  'In Progress': 'Continue Learning',
  Completed: 'Review Course',
  Cancelled: 'View Details',
  Refunded: 'View Details',
};

export default function CourseCard({ course, instructors = [] }) {
  const catalogCourse = findCatalogCourse(course.title);
  const instructor = findInstructor(instructors, course.title);

  return (
    <article className="studentCourseCard">
      <div className="studentCourseThumb">
        {catalogCourse?.image ? (
          <img className="studentCourseThumbPhoto" src={catalogCourse.image} alt="" />
        ) : catalogCourse ? (
          <img src={catalogCourse.icon} alt="" />
        ) : (
          <BookOpen size={26} />
        )}
        {catalogCourse?.badge ? <span className="studentCourseAppBadge">{catalogCourse.badge}</span> : null}
        <span className={`studentStatusBadge ${statusBadgeClass(course.status)}`}>{course.status}</span>
      </div>
      <div className="studentCourseBody">
        <span className="studentCourseCategory">{catalogCourse?.category || 'Course'}</span>
        <h4>{course.title}</h4>

        <div className="studentCourseInstructorRow">
          <span className="studentCourseAvatar">
            {instructor?.image ? <img src={getAssetUrl(instructor.image)} alt="" /> : <UserRound size={13} />}
          </span>
          <span>
            <small>Instructor</small>
            {instructor?.name || 'HIKLASS Team'}
          </span>
        </div>

        <div className="studentCourseProgress">
          <div className="studentCourseProgressTrack">
            <div className="studentCourseProgressFill" style={{ width: `${course.progress}%` }} />
          </div>
          <small>{course.progress}%</small>
        </div>

        <a className="studentCourseCta" href={`/student/courses/${encodeURIComponent(course.title)}`}>
          {CTA_LABEL[course.status] || 'View Course'} <ArrowRight size={15} />
        </a>
      </div>
    </article>
  );
}
