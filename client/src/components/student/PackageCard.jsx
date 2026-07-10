import React from 'react';
import { ArrowRight, Package as PackageIcon } from 'lucide-react';
import { packages as packageCatalog } from '../../data/packages';
import { statusBadgeClass } from '../../utils/studentStatus';

function findCatalogPackage(name) {
  const normalized = String(name || '').toLowerCase();
  return packageCatalog.find((pkg) => pkg.name.toLowerCase() === normalized);
}

const CTA_LABEL = {
  'Pending Payment': 'View Payment Status',
  'In Progress': 'Continue Learning',
  Completed: 'Review Course',
  Cancelled: 'View Details',
  Refunded: 'View Details',
};

export default function PackageCard({ pkg }) {
  const catalogPackage = findCatalogPackage(pkg.name);

  return (
    <article className="studentCourseCard">
      <div className="studentCourseThumb">
        {catalogPackage?.image ? (
          <img className="studentCourseThumbPhoto" src={catalogPackage.image} alt="" />
        ) : (
          <PackageIcon size={26} />
        )}
        <span className={`studentStatusBadge ${statusBadgeClass(pkg.status)}`}>{pkg.status}</span>
      </div>
      <div className="studentCourseBody">
        <span className="studentCourseCategory">Bundle Package</span>
        <h4>{pkg.name}</h4>

        <div className="studentCourseInstructorRow">
          <span className="studentCourseAvatar">
            <PackageIcon size={13} />
          </span>
          <span>
            <small>Duration</small>
            {pkg.duration || 'Flexible'}
          </span>
        </div>

        <div className="studentCourseProgress">
          <div className="studentCourseProgressTrack">
            <div className="studentCourseProgressFill" style={{ width: `${pkg.progress}%` }} />
          </div>
          <small>{pkg.progress}%</small>
        </div>

        <a className="studentCourseCta" href={`/student/courses/${encodeURIComponent(pkg.name)}`}>
          {CTA_LABEL[pkg.status] || 'View Course'} <ArrowRight size={15} />
        </a>
      </div>
    </article>
  );
}
