import React, { useEffect, useState } from 'react';
import {
  Award,
  Download,
} from 'lucide-react';
import StudentPortalLayout from './StudentPortalLayout';
import StudentDashboard from './StudentDashboard';
import StudentCourses from './StudentCourses';
import StudentCourseCurriculum from './StudentCourseCurriculum';
import StudentPackages from './StudentPackages';
import StudentOrders from './StudentOrders';
import StudentProgress from './StudentProgress';
import StudentAnnouncements from './StudentAnnouncements';
import StudentAssignments from './StudentAssignments';
import StudentQuizzes from './StudentQuizzes';
import StudentQuizTake from './StudentQuizTake';
import StudentMessages from './StudentMessages';
import StudentProfile from './StudentProfile';
import StudentSettings from './StudentSettings';
import ComingSoon from '../../components/student/ComingSoon';
import { fetchAnnouncements, fetchUnreadMessageCount } from '../../services/studentAuthService';
import './StudentPortalPages.css';

const ROUTES = {
  '/student/dashboard': { id: 'dashboard', title: 'Dashboard', Component: StudentDashboard },
  '/student/courses': { id: 'courses', title: 'My Courses', Component: StudentCourses },
  '/student/packages': { id: 'packages', title: 'My Packages', Component: StudentPackages },
  '/student/orders': { id: 'orders', title: 'My Enrollments', Component: StudentOrders },
  '/student/progress': { id: 'progress', title: 'Learning Progress', Component: StudentProgress },
  '/student/announcements': { id: 'announcements', title: 'Announcements', Component: StudentAnnouncements },
  '/student/profile': { id: 'profile', title: 'Profile', Component: StudentProfile },
  '/student/settings': { id: 'settings', title: 'Settings', Component: StudentSettings },
  '/student/assignments': { id: 'assignments', title: 'Assignments', Component: StudentAssignments },
  '/student/quizzes': { id: 'quizzes', title: 'Quizzes', Component: StudentQuizzes },
  '/student/downloads': {
    id: 'downloads', title: 'Downloads',
    Component: () => <ComingSoon icon={Download} title="Downloads" description="Course notes, source files, and templates will be downloadable here once lesson content is added." />,
  },
  '/student/certificates': {
    id: 'certificates', title: 'Certificates',
    Component: () => <ComingSoon icon={Award} title="Certificates" description="Certificates with QR verification will appear here once a course is fully completed and approved." />,
  },
  '/student/messages': { id: 'messages', title: 'Messages', Component: StudentMessages },
};

function resolveRoute(path) {
  const coursePrefix = '/student/courses/';
  if (path.startsWith(coursePrefix) && path.length > coursePrefix.length) {
    const courseTitle = decodeURIComponent(path.slice(coursePrefix.length));
    return {
      id: 'courses',
      title: courseTitle,
      Component: () => <StudentCourseCurriculum courseTitle={courseTitle} />,
    };
  }
  const quizPrefix = '/student/quizzes/';
  if (path.startsWith(quizPrefix) && path.length > quizPrefix.length) {
    const quizId = decodeURIComponent(path.slice(quizPrefix.length));
    return {
      id: 'quizzes',
      title: 'Quiz',
      Component: () => <StudentQuizTake quizId={quizId} />,
    };
  }
  return ROUTES[path] || ROUTES['/student/dashboard'];
}

export default function StudentPortal({ path: initialPath }) {
  const [path, setPath] = useState(initialPath);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const route = resolveRoute(path);
  const { Component } = route;

  useEffect(() => {
    let cancelled = false;
    fetchAnnouncements()
      .then((list) => {
        if (cancelled) return;
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setAnnouncementCount(list.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    function loadUnread() {
      fetchUnreadMessageCount().then((count) => { if (!cancelled) setMessageCount(count); }).catch(() => {});
    }
    loadUnread();
    const interval = setInterval(loadUnread, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [path]);

  useEffect(() => {
    function onPopState() {
      setPath(window.location.pathname.replace(/\/$/, '') || '/student/dashboard');
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(nextPath) {
    if (nextPath === path) return;
    window.history.pushState(null, '', nextPath);
    setPath(nextPath);
    window.scrollTo(0, 0);
  }

  // Every internal /student/* link is a plain <a href>, which is correct for
  // no-JS/SEO/back-forward semantics — but letting the browser handle the click
  // triggers a full page reload (a visible white flash). Intercept clicks on
  // those links here and route them client-side instead, without having to
  // convert every link in every page into a custom navigate() call.
  function handlePortalClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a');
    if (!anchor || anchor.target === '_blank') return;
    const href = anchor.getAttribute('href') || '';
    if (!href.startsWith('/student/')) return;
    event.preventDefault();
    navigate(href);
  }

  return (
    <StudentPortalLayout
      activePage={route.id}
      pageTitle={route.title}
      announcementCount={announcementCount}
      messageCount={messageCount}
      onContainerClick={handlePortalClick}
    >
      <Component />
    </StudentPortalLayout>
  );
}
