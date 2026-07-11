import React from 'react';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, X, Youtube } from 'lucide-react';
import { brandAssets } from '../assets/index.js';
import './SiteFooter.css';

export default function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="siteFooterGrid">
        <div className="siteFooterBrand">
          <img src={brandAssets.logo} alt="HIKLASS Academy" />
          <p>Empowering future digital professionals with practical skills, hands-on training, and real-world experience.</p>
          <div className="siteFooterSocial">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={18} /></a>
            <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X"><X size={18} /></a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={18} /></a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube size={18} /></a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
          </div>
        </div>
        <div>
          <h3>Quick Links</h3>
          <a href="/">Home</a>
          <a href="/#courses">Courses</a>
          <a href="/#packages">Programs</a>
          <a href="/blog">Blog</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact Us</a>
        </div>
        <div>
          <h3>Popular Courses</h3>
          <a href="/#courses">Web Development</a>
          <a href="/#courses">Graphic Design</a>
          <a href="/#courses">Digital Marketing</a>
          <a href="/#courses">Video Editing</a>
          <a href="/#courses">AI &amp; Machine Learning</a>
          <a href="/#courses">Cybersecurity</a>
        </div>
        <div>
          <h3>Resources</h3>
          <a href="/blog?category=student-resources">Student Resources</a>
          <a href="/blog?category=career-development">Career Guide</a>
          <a href="/#packages">Scholarships</a>
          <a href="/#faq">FAQ</a>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms-and-conditions">Terms &amp; Conditions</a>
        </div>
        <div id="contact">
          <h3>Contact Us</h3>
          <p><Phone size={15} /> +237 651 251 941</p>
          <p><Phone size={15} /> +237 671 320 385</p>
          <p><Mail size={15} /> info@hiklassacademy.com</p>
          <p><MapPin size={15} /> Douala, Cameroon</p>
        </div>
      </div>
      <div className="siteFooterBottom">
        <span>&copy; {new Date().getFullYear()} HIKLASS Academy. All Rights Reserved.</span>
      </div>
    </footer>
  );
}
