import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  ClipboardList,
  Download,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquare,
  Package,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import { brandAssets } from '../../assets';
import { clearStudentSession, getStoredStudentUser } from '../../services/studentAuthService';
import getAssetUrl from '../../utils/getAssetUrl';
import './StudentPortalLayout.css';

export const STUDENT_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
  { id: 'courses', label: 'My Courses', icon: GraduationCap, path: '/student/courses' },
  { id: 'packages', label: 'My Packages', icon: Package, path: '/student/packages' },
  { id: 'progress', label: 'Learning Progress', icon: BarChart3, path: '/student/progress' },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList, path: '/student/assignments' },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, path: '/student/quizzes' },
  { id: 'downloads', label: 'Downloads', icon: Download, path: '/student/downloads' },
  { id: 'certificates', label: 'Certificates', icon: Award, path: '/student/certificates' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/student/messages' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, path: '/student/announcements' },
  { id: 'profile', label: 'Profile', icon: UserRound, path: '/student/profile' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/student/settings' },
];

function initialsFor(name) {
  return (name || 'S')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'S';
}

const SIDEBAR_COLLAPSED_KEY = 'hiklass-student-sidebar-collapsed';

export default function StudentPortalLayout({ activePage, pageTitle, announcementCount = 0, messageCount = 0, onContainerClick, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) || 'false');
    } catch {
      return false;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const student = getStoredStudentUser();
  const activeItem = STUDENT_NAV_ITEMS.find((item) => item.id === activePage);
  const title = pageTitle || activeItem?.label || 'Dashboard';

  useEffect(() => {
    function onClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function logout() {
    clearStudentSession();
    window.location.assign('/');
  }

  function toggleSidebar() {
    if (window.innerWidth <= 1080) {
      setSidebarOpen((value) => !value);
    } else {
      setSidebarCollapsed((value) => {
        const next = !value;
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(next));
        return next;
      });
    }
  }

  function handleClick(event) {
    const anchor = event.target.closest('a');
    if (anchor) {
      if (anchor.closest('.studentPortalSidebar')) setSidebarOpen(false);
      if ((anchor.getAttribute('href') || '').startsWith('/student/')) setMenuOpen(false);
    }
    onContainerClick?.(event);
  }

  return (
    <div className={sidebarCollapsed ? 'studentPortal collapsed' : 'studentPortal'} onClick={handleClick}>
      <aside className={sidebarOpen ? 'studentPortalSidebar open' : 'studentPortalSidebar'}>
        <a className="studentPortalLogo" href="/">
          <img src={brandAssets.logo} alt="" />
          <span>
            <strong>HIKLASS</strong>
            <small>ACADEMY</small>
          </span>
        </a>

        <nav className="studentPortalNav" aria-label="Student portal navigation">
          {STUDENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activePage;
            return (
              <a key={item.id} href={item.path} className={isActive ? 'active' : ''}>
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === 'announcements' && announcementCount > 0 ? (
                  <em className="studentPortalNavBadge">{announcementCount}</em>
                ) : null}
                {item.id === 'messages' && messageCount > 0 ? (
                  <em className="studentPortalNavBadge">{messageCount}</em>
                ) : null}
              </a>
            );
          })}
          <button type="button" className="studentPortalLogoutLink" onClick={logout}>
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="studentPortalHelpCard">
          <LifeBuoy size={22} />
          <strong>Need Help?</strong>
          <p>Our support team is always here to help you.</p>
          <a href="/#contact" onClick={() => setSidebarOpen(false)}>Contact Support</a>
        </div>
      </aside>

      {sidebarOpen ? <button type="button" className="studentPortalBackdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="studentPortalMain">
        <header className="studentPortalTopbar">
          <button type="button" className="studentPortalMenuButton" onClick={toggleSidebar} aria-label="Toggle sidebar">
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <h1>{title}</h1>

          <div className="studentPortalTopbarActions">
            <a className="studentPortalIconButton" href="/student/announcements" aria-label="Announcements">
              <Bell size={20} />
              {announcementCount > 0 ? <em>{announcementCount}</em> : null}
            </a>
            <a className="studentPortalIconButton" href="/student/messages" aria-label="Messages">
              <MessageCircle size={20} />
              {messageCount > 0 ? <em>{messageCount}</em> : null}
            </a>

            <div className="studentPortalUserMenu" ref={menuRef}>
              <button type="button" className="studentPortalUserButton" onClick={() => setMenuOpen((value) => !value)}>
                <span className="studentPortalAvatar">
                  {student?.avatarUrl ? <img src={getAssetUrl(student.avatarUrl)} alt="" /> : initialsFor(student?.name)}
                </span>
                <span className="studentPortalUserText">
                  <strong>{student?.name || 'Student'}</strong>
                  <small>Student</small>
                </span>
              </button>
              {menuOpen ? (
                <div className="studentPortalUserDropdown">
                  <a href="/student/profile">Profile</a>
                  <a href="/student/settings">Settings</a>
                  <button type="button" onClick={logout}>Logout</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="studentPortalContent">{children}</main>
      </div>
    </div>
  );
}
