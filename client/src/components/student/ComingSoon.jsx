import React from 'react';

export default function ComingSoon({ icon: Icon, title, description }) {
  return (
    <div className="studentComingSoon">
      <span className="studentComingSoonIcon"><Icon size={30} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="studentComingSoonBadge">Coming soon</span>
    </div>
  );
}
