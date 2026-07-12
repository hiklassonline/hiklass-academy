import React from 'react';
import { ChevronRight, Mail, Phone, MapPin, Globe } from 'lucide-react';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import './AboutPage.css';
import './PrivacyPolicyPage.css';

function LegalHero() {
  return (
    <section className="legalHero">
      <div className="legalBreadcrumb">
        <a href="/">Home</a>
        <ChevronRight size={14} />
        <span>Privacy Policy</span>
      </div>
      <p className="aboutEyebrow">HIKLASS Academy</p>
      <h1>Privacy Policy</h1>
      <p className="legalDates">
        <strong>Effective Date:</strong> January 1, 2026 &nbsp;&bull;&nbsp; <strong>Last Updated:</strong> January 1, 2026
      </p>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="aboutPage legalPage">
      <SiteHeader />
      <LegalHero />

      <section className="aboutSection legalContent">
        <p>Welcome to HIKLASS Academy.</p>
        <p>
          At HIKLASS Academy, we value your privacy and are committed to protecting your personal information. This
          Privacy Policy explains how we collect, use, store, protect, and disclose your information when you use
          our website, student portal, online services, and training programs.
        </p>
        <p>By accessing or using our website and services, you agree to the practices described in this Privacy Policy.</p>

        <h2>1. Introduction</h2>
        <p>
          This policy applies to all visitors, students, parents/guardians, and users of HIKLASS Academy's website,
          student portal, online services, and training programs.
        </p>

        <h2>2. Who We Are</h2>
        <p>
          HIKLASS Academy is a digital skills training institution providing professional education in technology,
          creative media, software development, artificial intelligence, cybersecurity, business productivity, and
          related fields.
        </p>
        <ul className="legalContactList">
          <li><Globe size={16} /> <a href="https://hiklassacademy.com" target="_blank" rel="noreferrer">https://hiklassacademy.com</a></li>
          <li><Mail size={16} /> <a href="mailto:info@hiklassacademy.com">info@hiklassacademy.com</a></li>
          <li><Phone size={16} /> <a href="tel:+237651251941">+237 651 251 941</a> &nbsp;/&nbsp; <a href="tel:+237671320385">+237 671 320 385</a></li>
          <li><MapPin size={16} /> Beseke, Bonab&eacute;ri, Douala, Cameroon</li>
        </ul>

        <h2>3. Information We Collect</h2>
        <p>We may collect the following information:</p>

        <h3>Personal Information</h3>
        <ul>
          <li>Full Name</li>
          <li>Email Address</li>
          <li>Phone Number</li>
          <li>Residential Address</li>
          <li>Country</li>
          <li>City</li>
          <li>Date of Birth (where applicable)</li>
          <li>Parent/Guardian Information (for minors)</li>
          <li>Profile Photograph (optional)</li>
        </ul>

        <h3>Enrollment Information</h3>
        <ul>
          <li>Selected Course(s)</li>
          <li>Selected Package</li>
          <li>Learning Mode</li>
          <li>Payment Method</li>
          <li>Discount Code</li>
          <li>Enrollment Status</li>
        </ul>

        <h3>Payment Information</h3>
        <p>We may collect payment-related information such as:</p>
        <ul>
          <li>Payment Method</li>
          <li>Transaction Reference</li>
          <li>Payment Status</li>
          <li>Invoice Information</li>
        </ul>
        <p>We do <strong>NOT</strong> store your Mobile Money PIN, PayPal password, or banking credentials.</p>

        <h3>Technical Information</h3>
        <p>When you use our website, we may collect:</p>
        <ul>
          <li>IP Address</li>
          <li>Browser Type</li>
          <li>Operating System</li>
          <li>Device Type</li>
          <li>Screen Resolution</li>
          <li>Language Preferences</li>
          <li>Website Usage Statistics</li>
          <li>Cookies</li>
        </ul>

        <h2>4. How We Use Your Information</h2>
        <p>Your information is used to:</p>
        <ul>
          <li>Process course enrollments.</li>
          <li>Communicate with students.</li>
          <li>Send enrollment confirmations.</li>
          <li>Provide learning materials.</li>
          <li>Generate certificates.</li>
          <li>Improve our services.</li>
          <li>Respond to inquiries.</li>
          <li>Process payments.</li>
          <li>Send newsletters (only if subscribed).</li>
          <li>Maintain student records.</li>
          <li>Comply with legal obligations.</li>
        </ul>

        <h2>5. Email Communication</h2>
        <p>We may send emails regarding:</p>
        <ul>
          <li>Enrollment confirmations</li>
          <li>Course updates</li>
          <li>Payment confirmations</li>
          <li>Certificates</li>
          <li>Academy announcements</li>
          <li>Student support</li>
          <li>Newsletters (optional)</li>
        </ul>
        <p>You may unsubscribe from promotional emails at any time.</p>

        <h2>6. WhatsApp Communication</h2>
        <p>If you choose to contact us through WhatsApp, we may use your information to:</p>
        <ul>
          <li>Respond to inquiries</li>
          <li>Confirm enrollments</li>
          <li>Provide student support</li>
          <li>Share class schedules</li>
          <li>Send payment confirmations</li>
        </ul>
        <p>We will never spam your WhatsApp number.</p>

        <h2>7. Cookies</h2>
        <p>Our website uses cookies to:</p>
        <ul>
          <li>Improve website performance</li>
          <li>Remember preferences</li>
          <li>Analyze traffic</li>
          <li>Enhance user experience</li>
        </ul>
        <p>You may disable cookies through your browser settings.</p>

        <h2>8. How We Protect Your Data</h2>
        <p>We implement appropriate technical and organizational security measures including:</p>
        <ul>
          <li>SSL Encryption</li>
          <li>Secure Password Hashing</li>
          <li>Protected Databases</li>
          <li>Secure Authentication</li>
          <li>Firewall Protection</li>
          <li>Role-Based Access Control</li>
          <li>Regular Security Updates</li>
          <li>Secure Cloud Hosting</li>
        </ul>

        <h2>9. Data Retention</h2>
        <p>We retain your information only for as long as necessary to:</p>
        <ul>
          <li>Deliver our services</li>
          <li>Maintain academic records</li>
          <li>Meet legal requirements</li>
          <li>Resolve disputes</li>
        </ul>
        <p>You may request deletion of your personal information where legally permitted.</p>

        <h2>10. Sharing Your Information</h2>
        <p>We do <strong>NOT</strong> sell or rent your personal information.</p>
        <p>Your information may only be shared with:</p>
        <ul>
          <li>Payment Service Providers</li>
          <li>Email Service Providers</li>
          <li>Cloud Hosting Providers</li>
          <li>Government Authorities (where legally required)</li>
          <li>Authorized Academy Staff</li>
        </ul>
        <p>All third-party providers are expected to maintain appropriate security and confidentiality standards.</p>

        <h2>11. Student Accounts</h2>
        <p>Students are responsible for:</p>
        <ul>
          <li>Keeping login credentials secure</li>
          <li>Protecting their passwords</li>
          <li>Logging out on shared devices</li>
          <li>Reporting unauthorized access immediately</li>
        </ul>

        <h2>12. Children's Privacy</h2>
        <p>Some courses may be available to children.</p>
        <p>
          For students under the applicable age of consent, parental or guardian consent may be required before
          enrollment.
        </p>

        <h2>13. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Update inaccurate information</li>
          <li>Request deletion (subject to legal obligations)</li>
          <li>Withdraw consent where applicable</li>
          <li>Request a copy of your data</li>
          <li>Opt out of marketing communications</li>
        </ul>

        <h2>14. Third-Party Services</h2>
        <p>Our website may integrate services such as:</p>
        <ul>
          <li>Google Maps</li>
          <li>Google Analytics</li>
          <li>PayPal</li>
          <li>MTN Mobile Money</li>
          <li>Orange Money</li>
          <li>WhatsApp</li>
          <li>YouTube</li>
          <li>Social Media Platforms</li>
        </ul>
        <p>Each third-party service has its own privacy policy.</p>

        <h2>15. External Links</h2>
        <p>Our website may contain links to external websites.</p>
        <p>HIKLASS Academy is not responsible for the privacy practices or content of third-party websites.</p>

        <h2>16. Data Security</h2>
        <p>
          Although we implement industry-standard security measures, no internet transmission or electronic storage
          system can be guaranteed to be 100% secure.
        </p>
        <p>We encourage users to take reasonable precautions when sharing personal information online.</p>

        <h2>17. Policy Updates</h2>
        <p>We may update this Privacy Policy from time to time.</p>
        <p>The updated version will be posted on this page with a revised &ldquo;Last Updated&rdquo; date.</p>
        <p>Continued use of our website after changes constitutes acceptance of the updated policy.</p>

        <h2>18. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or how we handle your personal information, please
          contact us:
        </p>
        <p className="legalContactName">HIKLASS Academy</p>
        <ul className="legalContactList">
          <li><Mail size={16} /> <a href="mailto:info@hiklassacademy.com">info@hiklassacademy.com</a></li>
          <li><Phone size={16} /> <a href="tel:+237651251941">+237 651 251 941</a> &nbsp;/&nbsp; <a href="tel:+237671320385">+237 671 320 385</a></li>
          <li><MapPin size={16} /> Beseke, Bonab&eacute;ri, Douala, Cameroon</li>
          <li><Globe size={16} /> <a href="https://hiklassacademy.com" target="_blank" rel="noreferrer">https://hiklassacademy.com</a></li>
        </ul>

        <h2>Consent</h2>
        <p>
          By using the HIKLASS Academy website, enrolling in our courses, or accessing our services, you acknowledge
          that you have read, understood, and agree to this Privacy Policy.
        </p>

        <p className="legalCopyright">&copy; 2026 HIKLASS Academy. All Rights Reserved.</p>
      </section>

      <SiteFooter />
    </div>
  );
}
