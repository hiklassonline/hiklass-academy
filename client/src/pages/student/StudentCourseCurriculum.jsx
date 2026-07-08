import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Lightbulb,
  ListChecks,
  Lock,
  PlayCircle,
  LifeBuoy,
} from 'lucide-react';
import {
  fetchStudentCourseCurriculum,
  fetchAnnouncements,
  fetchStudentAssignments,
  submitStudentAssignment,
} from '../../services/studentAuthService';
import { courses as catalog } from '../../data/courses';
import AssignmentCard from '../../components/student/AssignmentCard';
import './StudentCourseCurriculum.css';

const TABS = [
  { id: 'content', label: 'Course Content' },
  { id: 'overview', label: 'Overview' },
  { id: 'resources', label: 'Resources' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'discussion', label: 'Discussion' },
];

function findCatalogCourse(title) {
  const normalized = String(title || '').toLowerCase();
  return (
    catalog.find((course) => course.title.toLowerCase() === normalized) ||
    catalog.find((course) => normalized.includes(course.title.toLowerCase()) || course.title.toLowerCase().includes(normalized))
  );
}

function LessonRow({ lesson, state, expanded, onToggle }) {
  const Icon = state === 'completed' ? CheckCircle2 : state === 'in-progress' ? PlayCircle : Lock;
  const iconClass = state === 'completed' ? 'completed' : state === 'in-progress' ? 'inProgress' : 'locked';

  return (
    <div className={`studentLessonRow ${iconClass}`}>
      <button type="button" className="studentLessonRowHead" onClick={() => onToggle(lesson.id)} disabled={state === 'locked'}>
        <Icon size={18} />
        <span className="studentLessonId">{lesson.id}</span>
        <span className="studentLessonTitle">{lesson.title}</span>
        <span className="studentLessonMeta">{(lesson.topics || []).length} topics</span>
        {state !== 'locked' ? (expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null}
      </button>
      {expanded && state !== 'locked' ? (
        <div className="studentLessonDetail">
          {lesson.topics?.length ? (
            <div>
              <strong>Topics</strong>
              <ul>{lesson.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
            </div>
          ) : null}
          {lesson.practical ? (
            <div>
              <strong>Practical</strong>
              <p>{lesson.practical}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ModuleAccordion({ module, moduleState, lessonStates, expanded, onToggleModule, expandedLessonId, onToggleLesson }) {
  return (
    <div className="studentModuleCard">
      <button type="button" className="studentModuleHead" onClick={() => onToggleModule(module.id)}>
        <span className="studentModuleNumber">{module.id}</span>
        <span className="studentModuleHeadText">
          <strong>{module.title}</strong>
          <small>{(module.lessons || []).length} Lessons</small>
        </span>
        <span className={`studentStatusBadge ${moduleState.status.toLowerCase().replace(/\s+/g, '')}`}>{moduleState.status}</span>
        <span className="studentModulePercent">{moduleState.percent}%</span>
        <div className="studentModuleProgressTrack">
          <div className="studentModuleProgressFill" style={{ width: `${moduleState.percent}%` }} />
        </div>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {expanded ? (
        <div className="studentModuleBody">
          {(module.lessons || []).map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              state={lessonStates[lesson.id]}
              expanded={expandedLessonId === lesson.id}
              onToggle={onToggleLesson}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CircularProgress({ percent }) {
  const size = 128;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1E2F97" strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="47%" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1E2F97">{percent}%</text>
      <text x="50%" y="63%" textAnchor="middle" fontSize="10" fill="#6B7280">Overall Progress</text>
    </svg>
  );
}

export default function StudentCourseCurriculum({ courseTitle }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [expandedModuleId, setExpandedModuleId] = useState(null);
  const [expandedLessonId, setExpandedLessonId] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [submittingId, setSubmittingId] = useState('');
  const [assignmentError, setAssignmentError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchStudentCourseCurriculum(courseTitle)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        const currentLessonId = Object.entries(res.lessonStates || {}).find(([, state]) => state === 'in-progress')?.[0];
        const currentModule = res.curriculum?.modules?.find((module) => (module.lessons || []).some((lesson) => lesson.id === currentLessonId));
        setExpandedModuleId(currentModule?.id || res.curriculum?.modules?.[0]?.id || null);
      })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseTitle]);

  useEffect(() => {
    fetchAnnouncements().then(setAnnouncements).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStudentAssignments(courseTitle).then(setAssignments).catch(() => {});
  }, [courseTitle]);

  async function handleAssignmentSubmit(assignmentId, file, notes) {
    setSubmittingId(assignmentId);
    setAssignmentError('');
    try {
      const submission = await submitStudentAssignment(assignmentId, { file, notes });
      setAssignments((current) => current.map((item) => (item.id === assignmentId ? { ...item, submission } : item)));
    } catch (err) {
      setAssignmentError(err.message);
    } finally {
      setSubmittingId('');
    }
  }

  const catalogCourse = useMemo(() => findCatalogCourse(courseTitle), [courseTitle]);

  function jumpToCurrentLesson() {
    setActiveTab('content');
    const currentLessonId = Object.entries(data.lessonStates || {}).find(([, state]) => state === 'in-progress')?.[0];
    const currentModule = data.curriculum?.modules?.find((module) => (module.lessons || []).some((lesson) => lesson.id === currentLessonId));
    if (currentModule) setExpandedModuleId(currentModule.id);
    if (currentLessonId) setExpandedLessonId(currentLessonId);
  }

  if (loading) return <p className="studentEmptyState">Loading course...</p>;
  if (error) {
    const Icon = error.reason === 'pending_payment' ? Clock3 : error.reason === 'not_enrolled' ? Lock : BookOpen;
    const heading = error.reason === 'pending_payment'
      ? 'Payment awaiting confirmation'
      : error.reason === 'cancelled'
        ? 'Enrollment cancelled'
        : error.reason === 'not_enrolled'
          ? 'Not enrolled'
          : 'Curriculum not available yet';
    return (
      <div className="studentEmptyState">
        <Icon size={36} />
        <h2>{heading}</h2>
        <p>{error.message}</p>
        <a href="/student/courses">Back to My Courses</a>
      </div>
    );
  }
  if (!data) return null;

  const { curriculum, lessonStates, moduleStates, stats } = data;
  const moduleStateById = Object.fromEntries(moduleStates.map((m) => [m.id, m]));

  return (
    <div className="studentCurriculumPage">
      <a className="studentCurriculumBack" href="/student/courses">&larr; Back to My Courses</a>

      <div
        className={`studentCurriculumBanner${catalogCourse?.image ? ' hasPhoto' : ''}`}
        style={catalogCourse?.image ? { backgroundImage: `url(${catalogCourse.image})` } : undefined}
      >
        <div className="studentCurriculumBannerText">
          <span className="studentCurriculumLevelBadge">{(curriculum.level || 'Course').toUpperCase()} LEVEL</span>
          <h1>{curriculum.courseTitle}</h1>
          <p>{curriculum.description?.split('\n')[0]}</p>
          <div className="studentCurriculumStatsRow">
            <span><Clock3 size={16} /> Duration<strong>{curriculum.duration}</strong></span>
            <span><ListChecks size={16} /> Total Lessons<strong>{stats.totalLessons} Lessons</strong></span>
            <span><Award size={16} /> Certificate<strong>{curriculum.certification ? 'Yes' : 'No'}</strong></span>
            <span><BookOpen size={16} /> Level<strong>{curriculum.level}</strong></span>
          </div>
        </div>
        <div className="studentCurriculumBannerIcon">
          {catalogCourse ? <img src={catalogCourse.icon} alt="" /> : <BookOpen size={64} />}
        </div>
      </div>

      <div className="studentCurriculumLayout">
        <div>
          <div className="studentCurriculumTabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'content' ? (
            <div className="studentModuleList">
              {(curriculum.modules || []).map((module) => (
                <ModuleAccordion
                  key={module.id}
                  module={module}
                  moduleState={moduleStateById[module.id]}
                  lessonStates={lessonStates}
                  expanded={expandedModuleId === module.id}
                  onToggleModule={(id) => setExpandedModuleId((current) => (current === id ? null : id))}
                  expandedLessonId={expandedLessonId}
                  onToggleLesson={(id) => setExpandedLessonId((current) => (current === id ? null : id))}
                />
              ))}

              {stats.percent === 100 ? (
                <div className="studentCurriculumCertBanner">
                  <span>🏆</span>
                  <div>
                    <strong>All lessons completed — certificate earned</strong>
                    <p>You've completed every lesson in {curriculum.courseTitle}. Your certificate is ready.</p>
                  </div>
                  <a href="/student/certificates">View Certificate Info</a>
                </div>
              ) : (
                <div className="studentCurriculumCertBanner muted">
                  <span>🏆</span>
                  <div>
                    <strong>Complete all lessons and earn your certificate</strong>
                    <p>Finish the course and get your {curriculum.courseTitle} Certificate from HIKLASS Academy.</p>
                  </div>
                  <a href="/student/certificates">View Certificate Info</a>
                </div>
              )}
            </div>
          ) : null}

          {activeTab === 'overview' ? (
            <div className="studentCard">
              <h3>About This Course</h3>
              <p className="studentCurriculumParagraph">{curriculum.description}</p>

              {curriculum.objectives?.length ? (
                <>
                  <h4><Lightbulb size={16} /> Course Objectives</h4>
                  <ul className="studentCurriculumList">{curriculum.objectives.map((item) => <li key={item}>{item}</li>)}</ul>
                </>
              ) : null}

              {curriculum.learningOutcomes?.length ? (
                <>
                  <h4><CheckCircle2 size={16} /> Learning Outcomes</h4>
                  <ul className="studentCurriculumList check">{curriculum.learningOutcomes.map((item) => <li key={item}>{item}</li>)}</ul>
                </>
              ) : null}

              {curriculum.practicalProject?.length ? (
                <>
                  <h4>Practical Project</h4>
                  <ul className="studentCurriculumList check">{curriculum.practicalProject.map((item) => <li key={item}>{item}</li>)}</ul>
                </>
              ) : null}

              {curriculum.capstoneProject?.length ? (
                <>
                  <h4>Capstone Project</h4>
                  <p className="studentCurriculumParagraph">Each student must demonstrate:</p>
                  <ul className="studentCurriculumList">{curriculum.capstoneProject.map((item) => <li key={item}>{item}</li>)}</ul>
                </>
              ) : null}

              {curriculum.assessment?.length ? (
                <>
                  <h4>Assessment</h4>
                  <ul className="studentCurriculumList assessment">
                    {curriculum.assessment.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.weight}%</strong></li>)}
                  </ul>
                </>
              ) : null}

              {curriculum.certificationRequirements?.length ? (
                <>
                  <h4>Certification Requirements</h4>
                  <ul className="studentCurriculumList">{curriculum.certificationRequirements.map((item) => <li key={item}>{item}</li>)}</ul>
                  {curriculum.certification ? <p className="studentCurriculumParagraph"><strong>{curriculum.certification}</strong></p> : null}
                </>
              ) : null}

              {curriculum.softwareTools?.length ? (
                <>
                  <h4>Software & Tools</h4>
                  <div className="studentCurriculumTags">{curriculum.softwareTools.map((tool) => <span key={tool}>{tool}</span>)}</div>
                </>
              ) : null}

              {curriculum.careerOpportunities?.length ? (
                <>
                  <h4>Career Opportunities</h4>
                  <div className="studentCurriculumTags">{curriculum.careerOpportunities.map((role) => <span key={role}>{role}</span>)}</div>
                </>
              ) : null}

              {curriculum.nextSteps ? (
                <>
                  <h4>What's Next</h4>
                  <p className="studentCurriculumParagraph">{curriculum.nextSteps}</p>
                </>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'resources' ? (
            <div className="studentComingSoon">
              <span className="studentComingSoonIcon"><BookOpen size={30} /></span>
              <h2>Downloadable Resources</h2>
              <p>PDF notes, practice files, and downloadable guides for this course are coming soon.</p>
              <span className="studentComingSoonBadge">Coming soon</span>
            </div>
          ) : null}

          {activeTab === 'assignments' ? (
            <div className="studentAssignmentList">
              {assignmentError ? <div className="studentAssignmentError">{assignmentError}</div> : null}
              {assignments.length ? (
                assignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    submitting={submittingId === assignment.id}
                    onSubmit={handleAssignmentSubmit}
                  />
                ))
              ) : (
                <div className="studentComingSoon">
                  <span className="studentComingSoonIcon"><ListChecks size={30} /></span>
                  <h2>No assignments yet</h2>
                  <p>Your instructor hasn't posted any assignments for this course yet. Check back soon.</p>
                </div>
              )}
            </div>
          ) : null}

          {activeTab === 'announcements' ? (
            <div className="studentCard">
              <h3>Announcements</h3>
              {announcements.length ? (
                <div className="studentAnnouncementList">
                  {announcements.map((item) => (
                    <div key={item.id}>
                      <strong style={{ fontSize: '0.85rem' }}>{item.title}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--hk-muted)' }}>{item.body}</p>
                      <time style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{new Date(item.createdAt).toLocaleDateString()}</time>
                    </div>
                  ))}
                </div>
              ) : <p className="studentEmptyState">No announcements yet.</p>}
            </div>
          ) : null}

          {activeTab === 'discussion' ? (
            <div className="studentComingSoon">
              <span className="studentComingSoonIcon"><LifeBuoy size={30} /></span>
              <h2>Discussion</h2>
              <p>A course discussion board for students and instructors is coming soon.</p>
              <span className="studentComingSoonBadge">Coming soon</span>
            </div>
          ) : null}
        </div>

        <div className="studentCurriculumSidebar">
          <div className="studentCard">
            <h3>Course Progress</h3>
            <div className="studentCurriculumProgressRow">
              <CircularProgress percent={stats.percent} />
              <div className="studentCurriculumLegend">
                <span><em style={{ background: '#16A34A' }} />Completed Lessons<strong>{stats.completedLessons}</strong></span>
                <span><em style={{ background: '#1E2F97' }} />In Progress<strong>{stats.inProgressLessons}</strong></span>
                <span><em style={{ background: '#F59E0B' }} />Not Started<strong>{stats.notStartedLessons}</strong></span>
              </div>
            </div>
            <button type="button" className="studentBtnPrimary" style={{ width: '100%', justifyContent: 'center', display: 'flex' }} onClick={jumpToCurrentLesson}>
              Continue Learning
            </button>
          </div>

          <div className="studentCard">
            <h3>About This Course</h3>
            <p className="studentCurriculumParagraph">
              {descriptionExpanded ? curriculum.description : `${curriculum.description?.slice(0, 140)}...`}
            </p>
            <button type="button" className="studentCurriculumSeeMore" onClick={() => (descriptionExpanded ? setDescriptionExpanded(false) : setActiveTab('overview'))}>
              {descriptionExpanded ? 'See Less' : 'See More'}
            </button>
          </div>

          <div className="studentCard">
            <h3>Course Resources</h3>
            <div className="studentCurriculumResourceRow">
              <span><PlayCircle size={16} /> Video Lessons</span>
              <strong>{stats.totalLessons}</strong>
            </div>
            <p className="studentSettingsNote">Downloadable notes, practice files, and guides are coming soon.</p>
          </div>

          <div className="studentCard studentCurriculumHelp">
            <LifeBuoy size={22} />
            <strong>Need Help?</strong>
            <p>Stuck on a lesson? Our support team is ready to assist you.</p>
            <a href="/#contact">Chat with Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
