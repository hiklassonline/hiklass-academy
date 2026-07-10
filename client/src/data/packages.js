import starterPackageImage from '../assets/course-images/Starter-Package.jpg';
import creativePackageImage from '../assets/course-images/Creative-Package.jpg';
import developerPackageImage from '../assets/course-images/Developer-Package.jpg';
import professionalPackageImage from '../assets/course-images/Professional-Package.jpg';
import aiFutureTechPackageImage from '../assets/course-images/AI-&-Future-Tech-Package.jpg';
import kidsHolidayPackageImage from '../assets/course-images/Kids-Holiday-Package.jpg';
import professionalSecretaryPackageImage from '../assets/course-images/Professional-Secretary-&-Office-Administration.jpg';

export const packages = [
  {
    id: 'starter',
    name: 'Starter Package',
    price: 50000,
    duration: '2 Weeks',
    image: starterPackageImage,
    courses: ['Basic Computer', 'Internet & Email', 'Microsoft Word', 'Microsoft PowerPoint'],
  },
  {
    id: 'creative',
    name: 'Creative Package',
    price: 100000,
    duration: '1 Month',
    image: creativePackageImage,
    courses: ['Canva', 'Photoshop', 'Illustrator', 'CorelDRAW', 'CapCut'],
  },
  {
    id: 'developer',
    name: 'Developer Package',
    price: 150000,
    duration: '2 Months',
    image: developerPackageImage,
    courses: ['HTML5', 'CSS3', 'JavaScript', 'React', 'Node.js', 'Database Fundamentals'],
  },
  {
    id: 'professional',
    name: 'Professional Package',
    price: 200000,
    duration: '3 Months',
    image: professionalPackageImage,
    courses: ['Full Stack Development', 'Mobile App Development', 'UI/UX Design', 'Cloud Computing'],
  },
  {
    id: 'ai-future-tech',
    name: 'AI & Future Tech Package',
    price: 150000,
    duration: '1 Month',
    image: aiFutureTechPackageImage,
    courses: ['Artificial Intelligence', 'Prompt Engineering', 'ChatGPT Productivity', 'Automation Tools'],
  },
  {
    id: 'kids-holiday',
    name: 'Kids Holiday Package',
    price: 75000,
    duration: '1 Month',
    image: kidsHolidayPackageImage,
    courses: ['Scratch Programming', 'Coding for Kids', 'Animation', 'Robotics Basics'],
  },
  {
    id: 'professional-secretary',
    name: 'Professional Secretary & Office Administration',
    price: 250000,
    duration: '3 Months',
    image: professionalSecretaryPackageImage,
    courses: [
      'Office Administration & Management',
      'Business Communication',
      'Professional Business Writing',
      'Microsoft Word',
      'Microsoft Excel',
      'Microsoft PowerPoint',
      'Microsoft Outlook',
      'Google Workspace (Docs, Sheets, Drive, Calendar)',
      'Records & File Management',
      'Executive Calendar & Appointment Scheduling',
      'Meeting Planning & Minute Taking',
      'Customer Service & Front Desk Management',
      'Telephone & Email Etiquette',
      'Office Equipment & Digital Tools',
      'Office Finance & Petty Cash Basics',
      'Human Resource Administrative Support',
      'Business Ethics & Workplace Professionalism',
      'AI for Office Productivity (ChatGPT, Claude AI, Microsoft Copilot, Google Gemini)',
      'Time Management & Productivity',
      'Virtual Assistant Skills',
    ],
  },
];
