import aiDataScienceIcon from '../assets/course-icons/ai-data-science.svg';
import cloudComputingIcon from '../assets/course-icons/cloud-computing.svg';
import cybersecurityIcon from '../assets/course-icons/cybersecurity.svg';
import digitalMarketingIcon from '../assets/course-icons/digital-marketing.svg';
import graphicDesignIcon from '../assets/course-icons/graphic-design.svg';
import mobileAppsIcon from '../assets/course-icons/mobile-apps.svg';
import programmingIcon from '../assets/course-icons/programming.svg';
import uiUxDesignIcon from '../assets/course-icons/ui-ux-design.svg';
import videoEditingIcon from '../assets/course-icons/video-editing.svg';
import webDevelopmentIcon from '../assets/course-icons/web-development.svg';

import basicComputerImage from '../assets/course-images/Basic-Computer-Training.jpg';
import microsoftOfficeImage from '../assets/course-images/Micorsoft-Office-Suite.jpg';
import graphicDesignImage from '../assets/course-images/Graphic-Design.jpg';
import videoEditingImage from '../assets/course-images/Video-Editing-&-Motion-Graphics.jpg';
import webDesignDevelopmentImage from '../assets/course-images/Web-Design-&-Development.jpg';
import mobileAppDevelopmentImage from '../assets/course-images/Mobile-App-Development.jpg';
import programmingLanguagesImage from '../assets/course-images/Programming-Languages.jpg';
import databaseManagementImage from '../assets/course-images/Database-Management.jpg';
import artificialIntelligenceImage from '../assets/course-images/Artificial-Intelligence-&-Emerging-Technologies.jpg';
import dataScienceAnalyticsImage from '../assets/course-images/Data-Science-&-Analytics.jpg';
import cybersecurityImage from '../assets/course-images/Cybersecurity.jpg';
import networkingImage from '../assets/course-images/Networking.jpg';
import cloudComputingImage from '../assets/course-images/Cloud-Computing.jpg';
import devOpsEngineeringImage from '../assets/course-images/DevOps-Engineering.jpg';
import uiUxDesignImage from '../assets/course-images/UI-UX-Design.jpg';
import digitalMarketingImage from '../assets/course-images/Digital-Marketing.jpg';
import accountingSoftwareImage from '../assets/course-images/Accounting-Software.jpg';
import computerHardwareImage from '../assets/course-images/Computer-Hardware-&-Maintenance.jpg';
import multimediaBroadcastingImage from '../assets/course-images/Multimedia-&-Broadcasting.jpg';
import threeDDesignAnimationImage from '../assets/course-images/3D-Design-&-Animation.jpg';
import gisEngineeringImage from '../assets/course-images/GIS-&-Engineering-Software.jpg';
import codingKidsImage from '../assets/course-images/Specialized-Courses-for-Kids.jpg';
import freelancingImage from '../assets/course-images/Freelancing-&-Online-Business.jpg';
import claudeAiImage from '../assets/course-images/Claude-AI-for-Productivity-&-Business.jpg';

export const courses = [
  { id: 'basic-computer', title: 'Basic Computer Training', category: 'Beginner', duration: '2 weeks', price: 25000, badge: 'IT', icon: programmingIcon, image: basicComputerImage, topics: ['Windows', 'Typing', 'Internet', 'Email'] },
  { id: 'microsoft-office', title: 'Microsoft Office Suite', category: 'Productivity', duration: '3 weeks', price: 35000, badge: 'XL', icon: cloudComputingIcon, image: microsoftOfficeImage, topics: ['Word', 'Excel', 'PowerPoint', 'Access'] },
  { id: 'graphic-design', title: 'Graphic Design', category: 'Creative', duration: '1 month', price: 50000, badge: 'GD', icon: graphicDesignIcon, image: graphicDesignImage, topics: ['Canva', 'Photoshop', 'Illustrator', 'CorelDRAW'] },
  { id: 'video-editing', title: 'Video Editing', category: 'Creative', duration: '1 month', price: 60000, badge: 'VE', icon: videoEditingIcon, image: videoEditingImage, topics: ['CapCut', 'Premiere Pro', 'After Effects', 'DaVinci'] },
  { id: 'web-design', title: 'Web Design', category: 'Development', duration: '1 month', price: 75000, badge: 'WEB', icon: webDevelopmentIcon, image: webDesignDevelopmentImage, topics: ['HTML5', 'CSS3', 'Responsive Layouts', 'Landing Pages'] },
  { id: 'web-development', title: 'Web Development', category: 'Development', duration: '2 months', price: 100000, badge: 'DEV', icon: webDevelopmentIcon, image: webDesignDevelopmentImage, topics: ['JavaScript', 'React', 'Node.js', 'APIs'] },
  { id: 'mobile-app-development', title: 'Mobile App Development', category: 'Development', duration: '2 months', price: 120000, badge: 'APP', icon: mobileAppsIcon, image: mobileAppDevelopmentImage, topics: ['React Native', 'Flutter', 'Firebase', 'APIs'] },
  { id: 'programming', title: 'Programming', category: 'Programming', duration: '1 month', price: 75000, badge: 'CODE', icon: programmingIcon, image: programmingLanguagesImage, topics: ['Logic', 'Python', 'JavaScript', 'Mini Apps'] },
  { id: 'database-management', title: 'Database Management', category: 'Data', duration: '1 month', price: 60000, badge: 'DB', icon: cloudComputingIcon, image: databaseManagementImage, topics: ['SQL', 'MySQL', 'Data Modeling', 'Backups'] },
  { id: 'ai-prompt-engineering', title: 'AI & Prompt Engineering', category: 'Future Tech', duration: '2 weeks', price: 50000, badge: 'AI', icon: aiDataScienceIcon, image: artificialIntelligenceImage, topics: ['AI Tools', 'Prompting', 'Automation', 'Content Workflows'] },
  { id: 'data-science-analytics', title: 'Data Science & Analytics', category: 'Data', duration: '1 month', price: 90000, badge: 'DATA', icon: aiDataScienceIcon, image: dataScienceAnalyticsImage, topics: ['Excel', 'Power BI', 'Python', 'Dashboards'] },
  { id: 'cybersecurity', title: 'Cybersecurity', category: 'Security', duration: '1 month', price: 100000, badge: 'SEC', icon: cybersecurityIcon, image: cybersecurityImage, topics: ['Safety', 'Networks', 'Kali Linux', 'Ethical Hacking'] },
  { id: 'networking', title: 'Networking', category: 'Infrastructure', duration: '1 month', price: 75000, badge: 'NET', icon: cloudComputingIcon, image: networkingImage, topics: ['LAN', 'Routers', 'IP Addressing', 'Troubleshooting'] },
  { id: 'cloud-computing', title: 'Cloud Computing', category: 'Infrastructure', duration: '1 month', price: 100000, badge: 'CLOUD', icon: cloudComputingIcon, image: cloudComputingImage, topics: ['Hosting', 'Cloud Storage', 'Deployment', 'Backups'] },
  { id: 'devops-engineering', title: 'DevOps Engineering', category: 'Infrastructure', duration: '2 months', price: 120000, badge: 'OPS', icon: cloudComputingIcon, image: devOpsEngineeringImage, topics: ['Git', 'CI/CD', 'Containers', 'Deployment'] },
  { id: 'ui-ux-design', title: 'UI/UX Design', category: 'Design', duration: '1 month', price: 65000, badge: 'UX', icon: uiUxDesignIcon, image: uiUxDesignImage, topics: ['Figma', 'Wireframes', 'Prototypes', 'Design Systems'] },
  { id: 'digital-marketing', title: 'Digital Marketing', category: 'Business', duration: '3 weeks', price: 50000, badge: 'DM', icon: digitalMarketingIcon, image: digitalMarketingImage, topics: ['SEO', 'Social Media', 'Ads', 'Email Marketing'] },
  { id: 'accounting-software', title: 'Accounting Software', category: 'Business', duration: '3 weeks', price: 45000, badge: 'ACC', icon: cloudComputingIcon, image: accountingSoftwareImage, topics: ['QuickBooks', 'Sage', 'Invoices', 'Reports'] },
  { id: 'hardware', title: 'Computer Hardware & Maintenance', category: 'Technical', duration: '3 weeks', price: 60000, badge: 'HW', icon: cybersecurityIcon, image: computerHardwareImage, topics: ['Repairs', 'Installation', 'Troubleshooting', 'Upgrades'] },
  { id: 'multimedia-broadcasting', title: 'Multimedia & Broadcasting', category: 'Creative', duration: '1 month', price: 75000, badge: 'MEDIA', icon: videoEditingIcon, image: multimediaBroadcastingImage, topics: ['Audio', 'Streaming', 'Camera Setup', 'Production'] },
  { id: '3d-design-animation', title: '3D Design & Animation', category: 'Creative', duration: '1 month', price: 100000, badge: '3D', icon: graphicDesignIcon, image: threeDDesignAnimationImage, topics: ['Blender', 'Modeling', 'Animation', 'Rendering'] },
  { id: 'autocad-engineering', title: 'AutoCAD / Engineering Software', category: 'Technical', duration: '1 month', price: 90000, badge: 'CAD', icon: uiUxDesignIcon, image: gisEngineeringImage, topics: ['AutoCAD', 'Drafting', 'Plans', 'Engineering Tools'] },
  { id: 'coding-kids', title: 'Coding for Kids', category: 'Kids', duration: '2 weeks', price: 35000, badge: 'KID', icon: programmingIcon, image: codingKidsImage, topics: ['Scratch', 'Games', 'Animation', 'Robotics'] },
  { id: 'freelancing', title: 'Freelancing & Online Business', category: 'Business', duration: '2 weeks', price: 50000, badge: 'BIZ', icon: digitalMarketingIcon, image: freelancingImage, topics: ['Fiverr', 'Upwork', 'Portfolio', 'Branding'] },
  { id: 'claude-ai-productivity-business', title: 'Claude AI for Productivity & Business', category: 'Future Tech', duration: '3 weeks', price: 65000, badge: '⭐ NEW', icon: aiDataScienceIcon, image: claudeAiImage, topics: ['Introduction to Claude AI', 'Claude Projects', 'Claude Artifacts', 'Prompt Engineering', 'Content Creation', 'Business Automation', 'AI for Coding', 'AI for Web Development', 'AI for Digital Marketing', 'AI for Graphic Design', 'AI Workflow Automation', 'Documentation & Knowledge Bases'] },
];

export const categories = [
  { name: 'Beginner', summary: 'Computer basics, typing, internet skills, and office confidence.' },
  { name: 'Creative', summary: 'Design, video, animation, broadcasting, and practical creative production.' },
  { name: 'Development', summary: 'Web design, web development, mobile apps, databases, and project-based coding.' },
  { name: 'Future Tech', summary: 'AI prompting, automation, cloud workflows, analytics, and smarter systems.' },
  { name: 'Business', summary: 'Digital marketing, freelancing, online business, and portfolio growth.' },
  { name: 'Technical', summary: 'Hardware, maintenance, safety, troubleshooting, and cybersecurity.' },
];
