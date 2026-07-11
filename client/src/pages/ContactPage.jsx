import React, { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Facebook,
  GraduationCap,
  Headset,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Music2,
  Phone,
  Send,
  Share2,
  Youtube,
} from 'lucide-react';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { brandAssets, uiAssets } from '../assets/index.js';
import API_URL from '../utils/apiBaseUrl.js';
import supportImage from '../assets/course-images/Professional-Secretary-&-Office-Administration.jpg';
import './AboutPage.css';
import './ContactPage.css';

const GOOGLE_MAPS_LOCATION_URL = 'https://share.google/UCuI1oMi4jB8gqYVo';

const QUICK_ACTIONS = [
  { icon: Send, tone: 'blue', title: 'Send a Message', text: "We'll respond as soon as possible.", href: '#contactForm' },
  { isWhatsapp: true, tone: 'green', title: 'Chat on WhatsApp', text: 'Speak with our team instantly.', href: 'https://wa.me/237651251941' },
  { icon: Clock3, tone: 'purple', title: '< 24hrs', text: 'Email Response Time' },
  { icon: Headset, tone: 'orange', title: '24/7', text: 'WhatsApp Support' },
  { icon: CalendarClock, tone: 'blue', title: 'Mon - Sat', text: '8AM - 6PM Office Hours' },
];

const CONTACT_CARDS = [
  { icon: Phone, tone: 'blue', title: 'Call Us', lines: ['+237 651 251 941', '+237 671 320 385'], href: 'tel:+237651251941' },
  { icon: Mail, tone: 'red', title: 'Email Us', lines: ['info@hiklassacademy.com'], href: 'mailto:info@hiklassacademy.com' },
  { isWhatsapp: true, tone: 'green', title: 'WhatsApp', lines: ['Chat with admissions'], href: 'https://wa.me/237651251941', chevron: true },
  { icon: MapPin, tone: 'blue', title: 'Visit Us', lines: ['Beseke, Bonaberi', 'Douala, Cameroon'], href: GOOGLE_MAPS_LOCATION_URL, chevron: true },
];

const SOCIAL_LINKS = [
  { icon: Facebook, tone: 'facebook', href: 'https://facebook.com', label: 'Facebook' },
  { icon: Instagram, tone: 'instagram', href: 'https://instagram.com', label: 'Instagram' },
  { icon: Youtube, tone: 'youtube', href: 'https://youtube.com', label: 'YouTube' },
  { icon: Linkedin, tone: 'linkedin', href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: Music2, tone: 'tiktok', href: 'https://tiktok.com', label: 'TikTok' },
];

const initialForm = { name: '', email: '', phone: '', subject: '', message: '' };

function toneClass(tone) {
  return `badge${tone[0].toUpperCase()}${tone.slice(1)}`;
}

function ContactHero() {
  return (
    <section className="contactHero">
      <div className="contactBreadcrumb">
        <a href="/">Home</a>
        <ChevronRight size={14} />
        <span>Contact Us</span>
      </div>
      <div className="contactHeroGrid">
        <div className="aboutHeroCopy">
          <p className="aboutEyebrow">Contact Us</p>
          <h1>We'd Love to Hear From You</h1>
          <p className="contactHeroLead">
            Questions about a course, a package, or your enrollment? Reach out and our admissions team will get back
            to you shortly.
          </p>
        </div>
        <div className="contactHeroVisual">
          <img src={supportImage} alt="HIKLASS Academy team" />
          <div className="contactHeroBadge">
            <img src={brandAssets.logo} alt="" />
            <span>HIKLASS<br />ACADEMY</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <div className="contactQuickActions">
      {QUICK_ACTIONS.map((item) => {
        const inner = (
          <>
            <span className={`aboutIconCircle ${toneClass(item.tone)}`}>
              {item.isWhatsapp ? <img src={uiAssets.whatsappIcon} alt="" /> : <item.icon size={20} />}
            </span>
            <div>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </div>
          </>
        );
        return item.href ? (
          <a
            className="contactQuickAction"
            key={item.title}
            href={item.href}
            target={item.href.startsWith('http') ? '_blank' : undefined}
            rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
          >
            {inner}
          </a>
        ) : (
          <div className="contactQuickAction" key={item.title}>{inner}</div>
        );
      })}
    </div>
  );
}

function ContactFormSection() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not send your message. Please try again.');
      setStatus({ type: 'success', message: data.message || "Thanks for reaching out! We'll get back to you shortly." });
      setForm(initialForm);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="aboutSection" id="contactForm">
      <div className="contactMainGrid">
        <div className="contactInfoColumn">
          <p className="aboutEyebrow dark">Get In Touch</p>
          <h2>Choose the Way That Works for You</h2>
          <div className="contactInfoList">
            {CONTACT_CARDS.map((item) => (
              <a
                className="contactInfoCard"
                key={item.title}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
              >
                <span className={`aboutIconCircle ${toneClass(item.tone)}`}>
                  {item.isWhatsapp ? <img src={uiAssets.whatsappIcon} alt="" /> : <item.icon size={20} />}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  {item.lines.map((line) => <span key={line}>{line}</span>)}
                </div>
                {item.chevron ? <ChevronRight size={18} className="contactInfoChevron" /> : null}
              </a>
            ))}
          </div>
        </div>

        <div className="contactFormPanel">
          <p className="aboutEyebrow dark">Send a Message</p>
          <h2>Fill In the Form Below</h2>
          <p className="contactFormIntro">Tell us a bit about what you're looking for and we'll follow up by email or WhatsApp.</p>

          <form onSubmit={submit} className="contactForm">
            <div className="contactFormRow">
              <label>
                <span>Full Name</span>
                <input type="text" required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Your name" />
              </label>
              <label>
                <span>Email Address</span>
                <input type="email" required value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@example.com" />
              </label>
            </div>
            <div className="contactFormRow">
              <label>
                <span>Phone Number</span>
                <input type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+237 6XX XXX XXX" />
              </label>
              <label>
                <span>Subject</span>
                <input type="text" value={form.subject} onChange={(event) => updateField('subject', event.target.value)} placeholder="What is this about?" />
              </label>
            </div>
            <label>
              <span>Message</span>
              <textarea required rows={5} value={form.message} onChange={(event) => updateField('message', event.target.value)} placeholder="Write your message..." />
            </label>

            {status ? (
              <div className={status.type === 'success' ? 'contactFormStatus success' : 'contactFormStatus error'}>
                {status.type === 'success' ? <CheckCircle2 size={18} /> : null}
                {status.message}
              </div>
            ) : null}

            <button className="aboutBtn redBtn" type="submit" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Message'} <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function ContactExtras() {
  return (
    <section className="aboutSection aboutSectionAlt">
      <div className="contactExtrasGrid">
        <div className="contactExtraCard">
          <h3><Clock3 size={18} /> Office Hours</h3>
          <ul className="contactHoursList">
            <li><span>Monday - Friday</span><strong>8:00 AM - 6:00 PM</strong></li>
            <li><span>Saturday</span><strong>9:00 AM - 3:00 PM</strong></li>
            <li><span>Sunday</span><strong className="closed">Closed</strong></li>
          </ul>
        </div>

        <div className="contactExtraCard">
          <h3><MapPin size={18} /> Our Location</h3>
          <p className="contactAddress">Beseke, Bonaberi, Douala, Cameroon</p>
          <div className="contactMapEmbed">
            <iframe
              title="HIKLASS Academy location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3979.7336951834495!2d9.678968179720423!3d4.074576436216043!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x10611355030c185b%3A0x33d120ab14ad6698!2sHIKLASS!5e0!3m2!1sen!2scm!4v1783788814634!5m2!1sen!2scm"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <a className="contactDirectionsLink" href={GOOGLE_MAPS_LOCATION_URL} target="_blank" rel="noreferrer">
            Get Directions on Google Maps <ChevronRight size={14} />
          </a>
        </div>

        <div className="contactExtraCard">
          <h3><Share2 size={18} /> Follow Us</h3>
          <p className="contactSocialIntro">Stay connected for updates, tips, news and special offers.</p>
          <div className="contactSocialRow">
            {SOCIAL_LINKS.map(({ icon: Icon, tone, href, label }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className={`socialIcon social-${tone}`}>
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactCta() {
  return (
    <section className="aboutCta">
      <span className="aboutCtaIcon"><GraduationCap size={26} /></span>
      <div className="aboutCtaCopy">
        <h2>Ready to Start Learning?</h2>
        <p>Skip the wait — browse our courses and packages, or enroll directly and our team will confirm your seat.</p>
      </div>
      <div className="aboutCtaActions">
        <a className="aboutBtn redBtn" href="/#courses">Browse Courses</a>
        <a className="aboutBtn outlineBtn" href="/#enroll">Enroll Now</a>
      </div>
    </section>
  );
}

export default function ContactPage() {
  return (
    <div className="aboutPage contactPage">
      <SiteHeader />
      <ContactHero />
      <QuickActions />
      <ContactFormSection />
      <ContactExtras />
      <ContactCta />
      <SiteFooter />
    </div>
  );
}
