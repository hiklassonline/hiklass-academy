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
        <span>Terms &amp; Conditions</span>
      </div>
      <p className="aboutEyebrow">HIKLASS Academy</p>
      <h1>Terms &amp; Conditions</h1>
      <p className="legalDates">
        <strong>Effective Date:</strong> January 1, 2026 &nbsp;&bull;&nbsp; <strong>Last Updated:</strong> January 1, 2026
      </p>
    </section>
  );
}

export default function TermsAndConditionsPage() {
  return (
    <div className="aboutPage legalPage">
      <SiteHeader />
      <LegalHero />

      <section className="aboutSection legalContent">
        <p>Welcome to HIKLASS Academy.</p>
        <p>
          These Terms &amp; Conditions govern your access to and use of the HIKLASS Academy website, student portal,
          online services, training programs, and all related services provided by HIKLASS Academy.
        </p>
        <p>
          By accessing our website, enrolling in a course, or using any of our services, you agree to be legally
          bound by these Terms &amp; Conditions.
        </p>
        <p>If you do not agree with these Terms, please discontinue the use of our services.</p>

        <h2>1. Introduction</h2>
        <p>
          These Terms apply to all visitors, students, parents/guardians, and users of HIKLASS Academy's website,
          student portal, online services, and training programs.
        </p>

        <h2>2. About HIKLASS Academy</h2>
        <p>
          HIKLASS Academy is a professional digital skills training institution offering practical education in
          technology, creative media, software development, artificial intelligence, cybersecurity, business
          productivity, and related fields.
        </p>
        <ul className="legalContactList">
          <li><Globe size={16} /> <a href="https://hiklassacademy.com" target="_blank" rel="noreferrer">https://hiklassacademy.com</a></li>
          <li><Mail size={16} /> <a href="mailto:info@hiklassacademy.com">info@hiklassacademy.com</a></li>
          <li><Phone size={16} /> <a href="tel:+237651251941">+237 651 251 941</a> &nbsp;/&nbsp; <a href="tel:+237671320385">+237 671 320 385</a></li>
          <li><MapPin size={16} /> Beseke, Bonab&eacute;ri, Douala, Cameroon</li>
        </ul>

        <h2>3. Eligibility</h2>
        <p>You may enroll in our courses if you:</p>
        <ul>
          <li>Provide accurate registration information.</li>
          <li>Meet any stated course prerequisites.</li>
          <li>Agree to these Terms &amp; Conditions.</li>
          <li>Are legally able to enter into a binding agreement.</li>
        </ul>
        <p>For students under the applicable age of consent, parental or guardian approval may be required.</p>

        <h2>4. Course Enrollment</h2>
        <p>Enrollment is considered complete only after:</p>
        <ul>
          <li>Submission of a valid enrollment request.</li>
          <li>Verification by HIKLASS Academy.</li>
          <li>Payment confirmation (where applicable).</li>
          <li>Acceptance by the Academy.</li>
        </ul>
        <p>HIKLASS Academy reserves the right to accept or decline any enrollment where necessary.</p>

        <h2>5. Course Fees</h2>
        <p>Course fees are clearly displayed on the website.</p>
        <p>Fees may vary depending on:</p>
        <ul>
          <li>Individual Courses</li>
          <li>Course Packages</li>
          <li>Promotions</li>
          <li>Scholarships</li>
          <li>Discounts</li>
        </ul>
        <p>Prices are subject to change without prior notice, but confirmed enrollments will not be affected.</p>

        <h2>6. Payment Methods</h2>
        <p>Accepted payment methods include:</p>
        <ul>
          <li>MTN Mobile Money (MoMo)</li>
          <li>Orange Money (OM)</li>
          <li>PayPal</li>
          <li>Cash Payment (Office)</li>
        </ul>
        <p>Payments must be completed using the official payment details provided by HIKLASS Academy.</p>

        <h2>7. Payment Confirmation</h2>
        <p>Students are responsible for:</p>
        <ul>
          <li>Sending accurate payment information.</li>
          <li>Keeping payment receipts.</li>
          <li>Providing valid transaction references if requested.</li>
        </ul>
        <p>Enrollment may be delayed until payment verification is completed.</p>

        <h2>8. Refund Policy</h2>
        <p>Course fees are generally non-refundable once training has commenced.</p>
        <p>
          Refund requests made before the start of a course may be considered at the sole discretion of HIKLASS
          Academy.
        </p>
        <p>Approved refunds may be subject to administrative charges.</p>

        <h2>9. Course Schedules</h2>
        <p>Course schedules may change due to:</p>
        <ul>
          <li>Public holidays</li>
          <li>Instructor availability</li>
          <li>Technical issues</li>
          <li>Emergencies</li>
        </ul>
        <p>Students will be informed promptly of any significant changes.</p>

        <h2>10. Attendance</h2>
        <p>Students are expected to:</p>
        <ul>
          <li>Attend classes regularly.</li>
          <li>Arrive on time.</li>
          <li>Participate actively.</li>
          <li>Complete assigned work.</li>
        </ul>
        <p>Failure to attend may affect certification eligibility.</p>

        <h2>11. Certification</h2>
        <p>To receive a HIKLASS Academy Certificate, students must:</p>
        <ul>
          <li>Meet attendance requirements.</li>
          <li>Complete assignments and practical projects.</li>
          <li>Pass required assessments.</li>
          <li>Satisfy all course completion requirements.</li>
        </ul>
        <p>Certificates may be issued in digital or printed format.</p>

        <h2>12. Student Conduct</h2>
        <p>Students must:</p>
        <ul>
          <li>Treat instructors and fellow students respectfully.</li>
          <li>Avoid disruptive or abusive behavior.</li>
          <li>Use Academy resources responsibly.</li>
          <li>Follow classroom and online learning guidelines.</li>
        </ul>
        <p>The Academy reserves the right to suspend or terminate enrollment for serious misconduct.</p>

        <h2>13. Academic Integrity</h2>
        <p>Students must submit their own original work.</p>
        <p>The following are prohibited:</p>
        <ul>
          <li>Plagiarism</li>
          <li>Cheating</li>
          <li>Unauthorized sharing of assessments</li>
          <li>Misrepresentation of work</li>
        </ul>
        <p>Violations may result in disciplinary action.</p>

        <h2>14. Online Learning</h2>
        <p>For online classes, students are responsible for:</p>
        <ul>
          <li>Having a reliable internet connection.</li>
          <li>Using suitable devices.</li>
          <li>Maintaining access to required software.</li>
          <li>Protecting their login credentials.</li>
        </ul>

        <h2>15. Intellectual Property</h2>
        <p>Unless otherwise stated, all content provided by HIKLASS Academy&mdash;including:</p>
        <ul>
          <li>Course materials</li>
          <li>Videos</li>
          <li>Presentations</li>
          <li>Graphics</li>
          <li>Documents</li>
          <li>Logos</li>
          <li>Branding</li>
          <li>Website content</li>
          <li>Training resources</li>
        </ul>
        <p>remains the intellectual property of HIKLASS Academy.</p>
        <p>Students may not reproduce, sell, distribute, or publish Academy materials without written permission.</p>

        <h2>16. Student Projects</h2>
        <p>Students retain ownership of projects they create during training.</p>
        <p>
          By submitting projects for Academy showcases, competitions, or promotional activities, students grant
          HIKLASS Academy permission to display those projects for educational and marketing purposes unless they
          request otherwise in writing.
        </p>

        <h2>17. Website Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Attempt unauthorized access.</li>
          <li>Upload malicious software.</li>
          <li>Interfere with website operation.</li>
          <li>Misuse contact forms.</li>
          <li>Copy website content without permission.</li>
          <li>Use automated tools to abuse the platform.</li>
        </ul>

        <h2>18. User Accounts</h2>
        <p>Students are responsible for:</p>
        <ul>
          <li>Keeping login credentials secure.</li>
          <li>Maintaining accurate account information.</li>
          <li>Reporting unauthorized account activity immediately.</li>
        </ul>
        <p>
          HIKLASS Academy is not responsible for losses resulting from unauthorized use caused by weak password
          practices or account sharing.
        </p>

        <h2>19. Communication</h2>
        <p>By enrolling, you agree that HIKLASS Academy may contact you regarding:</p>
        <ul>
          <li>Enrollment updates</li>
          <li>Class schedules</li>
          <li>Course announcements</li>
          <li>Payment confirmations</li>
          <li>Certificates</li>
          <li>Student support</li>
        </ul>
        <p>Communication may occur via:</p>
        <ul>
          <li>Email</li>
          <li>Phone</li>
          <li>SMS</li>
          <li>WhatsApp</li>
        </ul>

        <h2>20. Privacy</h2>
        <p>Your personal information is handled according to the HIKLASS Academy Privacy Policy.</p>
        <p>We are committed to protecting your personal data and using it responsibly.</p>

        <h2>21. Third-Party Services</h2>
        <p>Our website may integrate services provided by third parties, including:</p>
        <ul>
          <li>PayPal</li>
          <li>MTN Mobile Money</li>
          <li>Orange Money</li>
          <li>WhatsApp</li>
          <li>Google Maps</li>
          <li>Google Analytics</li>
          <li>YouTube</li>
          <li>Social Media Platforms</li>
        </ul>
        <p>Use of these services is subject to their respective terms and privacy policies.</p>

        <h2>22. Disclaimers</h2>
        <p>HIKLASS Academy strives to provide accurate and up-to-date information.</p>
        <p>However, we do not guarantee:</p>
        <ul>
          <li>Continuous website availability.</li>
          <li>Uninterrupted online services.</li>
          <li>Error-free content.</li>
          <li>Employment after course completion.</li>
        </ul>
        <p>Individual success depends on personal effort, commitment, and market conditions.</p>

        <h2>23. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, HIKLASS Academy shall not be liable for:</p>
        <ul>
          <li>Indirect losses.</li>
          <li>Consequential damages.</li>
          <li>Business interruption.</li>
          <li>Loss of data.</li>
          <li>Internet outages.</li>
          <li>Delays caused by third-party service providers.</li>
        </ul>

        <h2>24. Force Majeure</h2>
        <p>
          HIKLASS Academy shall not be held responsible for delays or failure to perform obligations caused by
          circumstances beyond its reasonable control, including but not limited to:
        </p>
        <ul>
          <li>Natural disasters</li>
          <li>Government actions</li>
          <li>Internet disruptions</li>
          <li>Power outages</li>
          <li>Pandemics</li>
          <li>Civil unrest</li>
        </ul>

        <h2>25. Termination</h2>
        <p>HIKLASS Academy reserves the right to suspend or terminate access to its services where a user:</p>
        <ul>
          <li>Violates these Terms.</li>
          <li>Engages in fraudulent activities.</li>
          <li>Misuses Academy resources.</li>
          <li>Disrupts learning activities.</li>
        </ul>

        <h2>26. Changes to These Terms</h2>
        <p>HIKLASS Academy may update these Terms &amp; Conditions from time to time.</p>
        <p>Updated versions will be published on this page with a revised &ldquo;Last Updated&rdquo; date.</p>
        <p>Continued use of our services after updates constitutes acceptance of the revised Terms.</p>

        <h2>27. Governing Law</h2>
        <p>
          These Terms &amp; Conditions shall be governed by and interpreted in accordance with the laws of the
          Republic of Cameroon.
        </p>
        <p>Any disputes arising from these Terms shall be subject to the jurisdiction of the competent courts of Cameroon.</p>

        <h2>28. Contact Us</h2>
        <p>For questions regarding these Terms &amp; Conditions, please contact:</p>
        <p className="legalContactName">HIKLASS Academy</p>
        <ul className="legalContactList">
          <li><Mail size={16} /> <a href="mailto:info@hiklassacademy.com">info@hiklassacademy.com</a></li>
          <li><Phone size={16} /> <a href="tel:+237651251941">+237 651 251 941</a> &nbsp;/&nbsp; <a href="tel:+237671320385">+237 671 320 385</a></li>
          <li><MapPin size={16} /> Beseke, Bonab&eacute;ri, Douala, Cameroon</li>
          <li><Globe size={16} /> <a href="https://hiklassacademy.com" target="_blank" rel="noreferrer">https://hiklassacademy.com</a></li>
        </ul>

        <h2>Acceptance of Terms</h2>
        <p>
          By accessing the HIKLASS Academy website, creating an account, enrolling in any course, or using any of
          our services, you confirm that you have read, understood, and agree to be bound by these Terms &amp;
          Conditions.
        </p>

        <p className="legalCopyright">&copy; 2026 HIKLASS Academy. All Rights Reserved.</p>
      </section>

      <SiteFooter />
    </div>
  );
}
