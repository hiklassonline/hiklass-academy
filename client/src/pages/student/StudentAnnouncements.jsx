import React, { useEffect, useState } from 'react';
import { Bell, Calendar, Megaphone } from 'lucide-react';
import { fetchAnnouncements } from '../../services/studentAuthService';

const ICONS = { course: Bell, schedule: Calendar, system: Megaphone };

export default function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchAnnouncements()
      .then((list) => { if (!cancelled) setAnnouncements(list); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="studentPageHeader">
        <h2>Announcements</h2>
        <p>Updates from HIKLASS Academy.</p>
      </div>

      {loading ? <p className="studentEmptyState">Loading announcements...</p> : null}
      {!loading && error ? <p className="studentEmptyState">{error}</p> : null}

      {!loading && !error && !announcements.length ? (
        <div className="studentEmptyState">
          <Megaphone size={40} />
          <h2>No announcements yet</h2>
          <p>Check back later for updates from HIKLASS Academy.</p>
        </div>
      ) : null}

      {!loading && !error && announcements.length ? (
        <div className="studentAnnouncementList">
          {announcements.map((item) => {
            const Icon = ICONS[item.icon] || Megaphone;
            return (
              <article className="studentAnnouncementRow" key={item.id}>
                <span className="studentAnnouncementIcon"><Icon size={18} /></span>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                  <time>{new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
