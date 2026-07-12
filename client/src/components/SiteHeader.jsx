import React, { useEffect, useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { brandAssets } from '../assets/index.js';
import { getStoredStudentToken } from '../services/studentAuthService.js';
import './SiteHeader.css';

const NAV_LINKS = [
  { label: 'Home', href: '/', sectionId: null },
  { label: 'Courses', href: '/#courses', sectionId: 'courses' },
  { label: 'Programs', href: '/#packages', sectionId: 'packages' },
  { label: 'Blog', href: '/blog', isBlog: true },
  { label: 'About Us', href: '/about', isAbout: true },
  { label: 'FAQ', href: '/#faq', sectionId: 'faq' },
  { label: 'Contact', href: '/contact', isContact: true },
];

const SECTION_IDS = NAV_LINKS.filter((link) => link.sectionId).map((link) => link.sectionId);

function isLinkActive(link, path, activeSection) {
  if (link.isBlog) return path === '/blog' || path.startsWith('/blog/');
  if (link.isAbout) return path === '/about';
  if (link.isContact) return path === '/contact';
  if (path !== '/') return false;
  if (link.sectionId) return activeSection === link.sectionId;
  return !activeSection;
}

function goToCourseSearch() {
  if (window.location.pathname === '/') {
    document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
    window.setTimeout(() => document.querySelector('.searchBox input')?.focus(), 450);
  } else {
    window.location.href = '/#courses';
  }
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const isStudentLoggedIn = Boolean(getStoredStudentToken());
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  useEffect(() => {
    if (path !== '/') return undefined;
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActiveSection(topMost.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [path]);

  return (
    <header className="siteHeaderBar">
      <a className="siteHeaderBrand" href="/" aria-label="HIKLASS Academy home">
        <img src={brandAssets.logoHorizontal} alt="HIKLASS Academy" />
      </a>

      <nav className={open ? 'siteHeaderNav open' : 'siteHeaderNav'} aria-label="Main navigation">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={isLinkActive(link, path, activeSection) ? 'active' : ''}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <button type="button" className="siteHeaderSearch" aria-label="Search courses" onClick={goToCourseSearch}>
        <Search size={18} />
      </button>

      {isStudentLoggedIn ? (
        <a className="siteHeaderLogin" href="/student/dashboard">Dashboard</a>
      ) : (
        <a className="siteHeaderLogin" href="/student/login">Login</a>
      )}

      {isStudentLoggedIn ? (
        <a className="siteHeaderEnroll" href="/student/courses">Courses</a>
      ) : (
        <a className="siteHeaderEnroll" href="/#enroll">Enroll Now</a>
      )}

      <button className="siteHeaderMenuBtn" type="button" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div className="siteHeaderMobileActions">
        {isStudentLoggedIn ? (
          <a className="siteHeaderMobileLogin" href="/student/dashboard">Dashboard</a>
        ) : (
          <a className="siteHeaderMobileLogin" href="/student/login">Login</a>
        )}
        {isStudentLoggedIn ? (
          <a className="siteHeaderMobileEnroll" href="/student/courses">Courses</a>
        ) : (
          <a className="siteHeaderMobileEnroll" href="/#enroll">Enroll Now</a>
        )}
      </div>
    </header>
  );
}
