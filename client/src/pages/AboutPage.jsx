import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Code2,
  Eye,
  Facebook,
  Flag,
  GraduationCap,
  Heart,
  Instagram,
  LayoutDashboard,
  Lightbulb,
  Linkedin,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserRound,
  Users,
  Video,
  Youtube,
} from 'lucide-react';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { brandAssets } from '../assets/index.js';
import { defaultTestimonials } from '../data/testimonials.js';
import { fetchTestimonials } from '../services/api.js';
import API_URL from '../utils/apiBaseUrl.js';
import getAssetUrl from '../utils/getAssetUrl.js';
import microsoftLogo from '../assets/technologies-we-teach/Microsoft.svg';
import adobeLogo from '../assets/technologies-we-teach/Adobe.svg';
import googleLogo from '../assets/technologies-we-teach/Google.svg';
import metaLogo from '../assets/technologies-we-teach/Meta.svg';
import awsLogo from '../assets/technologies-we-teach/AWS.svg';
import githubLogo from '../assets/technologies-we-teach/GitHub.svg';
import dockerLogo from '../assets/technologies-we-teach/Docker.svg';
import nodejsLogo from '../assets/technologies-we-teach/Nodejs.svg';
import mongodbLogo from '../assets/technologies-we-teach/MongoDB.svg';
import mysqlLogo from '../assets/technologies-we-teach/MySQL.svg';
import figmaLogo from '../assets/technologies-we-teach/Figma.svg';
import canvaLogo from '../assets/technologies-we-teach/Canva.svg';
import reactLogo from '../assets/technologies-we-teach/React.svg';
import './AboutPage.css';

const HERO_STATS = [
  { icon: CalendarDays, value: '15+', label: 'Years of Experience' },
  { icon: Users, value: '1000+', label: 'Students Trained' },
  { icon: BookOpen, value: '25+', label: 'Professional Courses' },
  { icon: Star, value: '95%', label: 'Student Satisfaction' },
];

const CORE_VALUES = [
  { icon: Lightbulb, tone: 'blue', title: 'Innovation', text: 'We embrace creativity and emerging technologies.' },
  { icon: Award, tone: 'red', title: 'Excellence', text: 'We deliver world-class education and professional standards.' },
  { icon: ShieldCheck, tone: 'green', title: 'Integrity', text: 'We promote honesty, ethics, and accountability.' },
  { icon: Code2, tone: 'purple', title: 'Practical Learning', text: 'Learning through real-world projects and hands-on experience.' },
  { icon: Users, tone: 'orange', title: 'Collaboration', text: 'Working together to achieve greater success.' },
  { icon: BookOpen, tone: 'skyblue', title: 'Continuous Learning', text: 'Technology evolves daily, and so do we.' },
  { icon: Flag, tone: 'red', title: 'Leadership', text: 'Developing confident professionals and future leaders.' },
  { icon: Heart, tone: 'green', title: 'Impact', text: 'Creating solutions that improve lives and communities.' },
];

const WHY_CHOOSE_REASONS = [
  { icon: LayoutDashboard, title: 'Student dashboard', text: 'See every enrolled course, order, and payment in one dashboard with a live progress ring.' },
  { icon: BookOpenCheck, title: 'Curriculum tracking', text: 'Move through modules and lessons with clear completed, in-progress, and locked states.' },
  { icon: ClipboardCheck, title: 'Quizzes & assignments', text: 'Submit assignments and take auto-graded quizzes with instant scores and feedback.' },
  { icon: Video, title: 'Live chat & video calls', text: 'Message your instructors, send voice notes, or start a one-click video call for support.' },
  { icon: Award, title: 'Certificates', text: 'Earn a certificate of completion as proof of participation when you finish a course.' },
  { icon: ShieldCheck, title: 'Secure orders & payments', text: 'Every order and payment is validated and stored securely, with full history in your portal.' },
];

const TRAINING_APPROACH = [
  { step: 1, tone: 'blue', label: 'Learn the Fundamentals' },
  { step: 2, tone: 'red', label: 'Hands-on Practice' },
  { step: 3, tone: 'brown', label: 'Real-World Projects' },
  { step: 4, tone: 'dark', label: 'Portfolio Development' },
  { step: 5, tone: 'orange', label: 'Certification' },
  { step: 6, tone: 'green', label: 'Career Growth' },
];

const IMPACT_STATS = [
  { icon: BookOpen, value: '25+', label: 'Professional Courses' },
  { icon: BriefcaseBusiness, value: '150+', label: 'Real-World Projects' },
  { icon: Users, value: '1000+', label: 'Students Trained' },
  { icon: CalendarDays, value: '15+', label: 'Years of Experience' },
];

const TECHNOLOGIES = [
  { name: 'Microsoft', logo: microsoftLogo },
  { name: 'Adobe', logo: adobeLogo },
  { name: 'Google', logo: googleLogo },
  { name: 'Meta', logo: metaLogo },
  { name: 'AWS', logo: awsLogo },
  { name: 'GitHub', logo: githubLogo },
  { name: 'Docker', logo: dockerLogo },
  { name: 'Node.js', logo: nodejsLogo },
  { name: 'MongoDB', logo: mongodbLogo },
  { name: 'MySQL', logo: mysqlLogo },
  { name: 'Figma', logo: figmaLogo },
  { name: 'Canva', logo: canvaLogo },
  { name: 'React', logo: reactLogo },
];

function avatarInitials(name = 'HA') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'HA';
}

function AboutHero() {
  return (
    <section className="aboutHero">
      <div className="aboutHeroCopy">
        <p className="aboutEyebrow">About</p>
        <h1>Empowering Future Digital Professionals</h1>
        <div className="aboutHeroActions">
          <a className="aboutBtn redBtn" href="/#courses">Explore Courses <ChevronRight size={16} /></a>
          <a className="aboutBtn outlineBtn" href="/#enroll">Enroll Today <ChevronRight size={16} /></a>
        </div>
        <div className="aboutHeroStats">
          {HERO_STATS.map(({ icon: Icon, value, label }) => (
            <div key={label}>
              <Icon size={20} />
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="aboutHeroVisual" aria-hidden="true">
        <img src={brandAssets.heroBanner} alt="" />
        <span className="aboutHeroBadge badgeBlue"><Code2 size={20} /></span>
        <span className="aboutHeroBadge badgePurple"><Sparkles size={20} /> AI</span>
        <span className="aboutHeroBadge badgeRed"><TrendingUp size={20} /></span>
      </div>
    </section>
  );
}

function WhoWeAre() {
  return (
    <section className="aboutSection">
      <div className="aboutWhoGrid">
        <div>
          <p className="aboutEyebrow dark">Who We Are</p>
          <h2>We Build Skills. We Build Futures.</h2>
          <p>
            HIKLASS Academy is a modern digital skills training institution dedicated to preparing students,
            professionals, entrepreneurs, and organizations for success in today's rapidly evolving digital economy.
          </p>
          <p>
            Our training is designed to bridge the gap between theory and practical application by providing
            project-based learning, experienced instructors, and industry-standard tools that enable learners to
            confidently solve real-world problems.
          </p>
          <p>
            Whether you are starting your digital journey or advancing your professional career, HIKLASS Academy
            provides the knowledge, mentorship, and practical experience needed to succeed.
          </p>
          <a className="aboutBtn blueBtn" href="#values">Learn More About Us <ChevronRight size={16} /></a>
        </div>
        <div className="aboutVisionMissionGrid">
          <div className="aboutVisionCard">
            <span className="aboutIconCircle badgeBlue"><Eye size={22} /></span>
            <h3>Our Vision</h3>
            <p>
              To become Africa's leading digital academy, recognized globally for developing highly skilled
              professionals, innovative entrepreneurs, and technology leaders who create lasting impact in their
              communities and beyond.
            </p>
          </div>
          <div className="aboutVisionCard">
            <span className="aboutIconCircle badgeRed"><Target size={22} /></span>
            <h3>Our Mission</h3>
            <p>
              To empower individuals with practical, high-quality, and affordable digital education that transforms
              lives, builds careers, fosters innovation, and creates sustainable opportunities in the global digital
              economy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CoreValues() {
  return (
    <section className="aboutSection aboutSectionAlt" id="values">
      <div className="aboutSectionHead aboutSectionHeadWide">
        <p className="aboutEyebrow dark">Our Core Values</p>
        <h2>The Principles That Guide Everything We Do</h2>
      </div>
      <div className="aboutValuesGrid">
        {CORE_VALUES.map(({ icon: Icon, tone, title, text }) => (
          <div className="aboutValueCard" key={title}>
            <span className={`aboutIconCircle badge${tone[0].toUpperCase()}${tone.slice(1)}`}><Icon size={20} /></span>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyChooseUsFull() {
  return (
    <section className="aboutSection">
      <div className="aboutSectionHead">
        <p className="aboutEyebrow dark">Why Choose HIKLASS</p>
        <h2>Training built for confidence, not confusion.</h2>
      </div>
      <div className="whyGrid">
        {WHY_CHOOSE_REASONS.map(({ icon: Icon, title, text }) => (
          <article key={title} className="whyCard">
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="whyApproachStrip">
        <strong>Our Training Approach</strong>
        <div className="whyApproachSteps">
          {TRAINING_APPROACH.map((item) => (
            <div className="whyApproachStep" key={item.step}>
              <span className={`aboutStepCircle tone${item.tone[0].toUpperCase()}${item.tone.slice(1)}`}>{item.step}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ImpactAndStories() {
  const [liveTestimonials, setLiveTestimonials] = useState([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchTestimonials()
      .then((list) => { if (!cancelled) setLiveTestimonials(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const allTestimonials = useMemo(() => [...defaultTestimonials, ...liveTestimonials], [liveTestimonials]);
  const pages = Math.max(1, Math.ceil(allTestimonials.length / 3));
  const visible = allTestimonials.slice(page * 3, page * 3 + 3);

  return (
    <section className="aboutSection aboutSectionAlt">
      <div className="aboutImpactGrid">
        <div className="aboutImpactCard">
          <p className="aboutEyebrow light">Our Impact</p>
          <h2>Our Impact in Numbers</h2>
          <div className="aboutImpactStats">
            {IMPACT_STATS.map(({ icon: Icon, value, label }) => (
              <div key={label}>
                <Icon size={22} />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="aboutStories">
          <div className="aboutSectionHead compact">
            <div>
              <p className="aboutEyebrow dark">Success Stories</p>
              <h2>What Our Students Say</h2>
            </div>
            <a href="/blog?category=career-development">View All Stories</a>
          </div>
          <div className="aboutTestimonialGrid">
            {visible.map((item) => (
              <article className="aboutTestimonialCard" key={item.id || item.name}>
                <Quote size={20} />
                <p>{item.quote || item.text}</p>
                <div className="aboutTestimonialMeta">
                  <span className="aboutAvatar">{avatarInitials(item.name)}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.role}</small>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {pages > 1 ? (
            <div className="aboutDots">
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous"><ChevronLeft size={16} /></button>
              {Array.from({ length: pages }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={index === page ? 'active' : ''}
                  onClick={() => setPage(index)}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
              <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} aria-label="Next"><ChevronRight size={16} /></button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function LeadInstructor() {
  const [instructor, setInstructor] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/instructors`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load instructors'))))
      .then((data) => { if (!cancelled) setInstructor((data.instructors || [])[0] || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!instructor) return null;

  const subtitle = instructor.expertise?.length ? instructor.expertise.join(' | ') : instructor.professionalTitle;
  const bioParagraphs = (instructor.bio || '').split('\n').filter((line) => line.trim());

  return (
    <section className="aboutSection">
      <div className="aboutSectionHead">
        <p className="aboutEyebrow dark">Our Leader</p>
        <h2>Meet Our Lead Instructor</h2>
      </div>
      <div className="aboutLeaderGrid">
        <div className="aboutLeaderPhoto">
          {instructor.image ? <img src={getAssetUrl(instructor.image)} alt={instructor.name} /> : <UserRound size={48} />}
        </div>
        <div>
          <h3>{instructor.name}</h3>
          <p className="aboutLeaderRole">{instructor.position || instructor.role}</p>
          {subtitle ? <p className="aboutLeaderSubtitle">{subtitle}</p> : null}
          {bioParagraphs.map((para, index) => <p key={index}>{para}</p>)}
          <div className="aboutLeaderSocial">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={17} /></a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={17} /></a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube size={17} /></a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17} /></a>
          </div>
        </div>
      </div>
    </section>
  );
}

function TechStack() {
  return (
    <section className="aboutTechSection">
      <h2>Technologies We Teach</h2>
      <div className="aboutTechRow">
        {TECHNOLOGIES.map(({ name, logo }) => (
          <span className="aboutTechBadge" key={name} title={name}>
            <img className="aboutTechLogo" src={logo} alt={`${name} logo`} loading="lazy" />
          </span>
        ))}
      </div>
    </section>
  );
}

function AboutCta() {
  return (
    <section className="aboutCta">
      <span className="aboutCtaIcon"><GraduationCap size={26} /></span>
      <div className="aboutCtaCopy">
        <h2>Start Your Digital Journey Today</h2>
        <p>Take the first step toward building valuable digital skills with HIKLASS Academy. Whether you're a beginner or a professional, we have the right course for you.</p>
      </div>
      <div className="aboutCtaActions">
        <a className="aboutBtn redBtn" href="/#courses">Browse Courses</a>
        <a className="aboutBtn outlineBtn" href="/#enroll">Enroll Now</a>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="aboutPage">
      <SiteHeader />
      <AboutHero />
      <WhoWeAre />
      <CoreValues />
      <WhyChooseUsFull />
      <ImpactAndStories />
      <LeadInstructor />
      <TechStack />
      <AboutCta />
      <SiteFooter />
    </div>
  );
}
