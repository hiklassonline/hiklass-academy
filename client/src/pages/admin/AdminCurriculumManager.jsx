import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckSquare, Save, Trash2 } from 'lucide-react';
import { getStoredAdminToken } from '../../services/authService';
import { adminApi } from '../../services/adminContentApi';
import { courses as catalog } from '../../data/courses';
import AdminCurriculumForm from './AdminCurriculumForm.jsx';

const CURRICULUM_TEMPLATE = {
  courseCode: '',
  level: 'Beginner',
  duration: '',
  mode: 'Physical | Online | Hybrid',
  prerequisite: 'None',
  certification: '',
  description: '',
  objectives: [],
  learningOutcomes: [],
  modules: [
    { id: '1', title: 'Module 1', duration: 'Week 1', lessons: [{ id: '1.1', title: 'Lesson 1', topics: [], practical: '' }] },
  ],
  practicalProject: [],
  capstoneProject: [],
  assessment: [],
  certificationRequirements: [],
  softwareTools: [],
  careerOpportunities: [],
};

function flattenLessons(curriculum) {
  const lessons = [];
  for (const module of curriculum?.modules || []) {
    for (const lesson of module.lessons || []) {
      lessons.push({ id: lesson.id, title: lesson.title, moduleTitle: module.title });
    }
  }
  return lessons;
}

export default function AdminCurriculumManager({ studentAccounts }) {
  const token = getStoredAdminToken();
  const [curricula, setCurricula] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const [selectedCourse, setSelectedCourse] = useState('');
  const [editorMode, setEditorMode] = useState('form');
  const [curriculumObject, setCurriculumObject] = useState(null);
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [savingCurriculum, setSavingCurriculum] = useState(false);

  const [progressStudentId, setProgressStudentId] = useState('');
  const [progressCourse, setProgressCourse] = useState('');
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  async function loadCurricula() {
    setLoading(true);
    try {
      const data = await adminApi(token, 'GET', '/api/admin/course-curricula');
      setCurricula(data.curricula || []);
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCurricula(); }, []);

  function onSelectCourse(title) {
    setSelectedCourse(title);
    setJsonError('');
    const existing = curricula.find((item) => item.courseTitle === title);
    const base = existing
      ? (() => { const { courseTitle: _t, createdAt: _c, updatedAt: _u, ...rest } = existing; return rest; })()
      : { ...CURRICULUM_TEMPLATE, description: `${title} at HIKLASS Academy.` };
    setCurriculumObject(base);
    setJsonDraft(JSON.stringify(base, null, 2));
  }

  function switchMode(nextMode) {
    if (nextMode === editorMode) return;
    if (nextMode === 'form') {
      try {
        setCurriculumObject(JSON.parse(jsonDraft));
        setJsonError('');
        setEditorMode('form');
      } catch {
        setJsonError('Invalid JSON — fix the syntax before switching to Form view.');
      }
    } else {
      setJsonDraft(JSON.stringify(curriculumObject, null, 2));
      setEditorMode('json');
    }
  }

  async function saveCurriculum() {
    if (!selectedCourse) { setJsonError('Choose a course first.'); return; }
    let payload = curriculumObject;
    if (editorMode === 'json') {
      try {
        payload = JSON.parse(jsonDraft);
      } catch {
        setJsonError('Invalid JSON. Fix the syntax and try again.');
        return;
      }
    }
    setJsonError('');
    setSavingCurriculum(true);
    setStatus(null);
    try {
      await adminApi(token, 'PUT', `/api/admin/course-curricula/${encodeURIComponent(selectedCourse)}`, payload);
      setStatus({ type: 'success', text: `Curriculum saved for ${selectedCourse}.` });
      await loadCurricula();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setSavingCurriculum(false);
    }
  }

  async function deleteCurriculum() {
    if (!selectedCourse) return;
    if (!window.confirm(`Delete the curriculum for ${selectedCourse}? Students will no longer see a course detail page for it.`)) return;
    setSavingCurriculum(true);
    setStatus(null);
    try {
      await adminApi(token, 'DELETE', `/api/admin/course-curricula/${encodeURIComponent(selectedCourse)}`);
      setStatus({ type: 'success', text: `Curriculum deleted for ${selectedCourse}.` });
      setSelectedCourse('');
      setJsonDraft('');
      setCurriculumObject(null);
      await loadCurricula();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setSavingCurriculum(false);
    }
  }

  const progressCurriculum = useMemo(
    () => curricula.find((item) => item.courseTitle === progressCourse) || null,
    [curricula, progressCourse],
  );
  const progressLessons = useMemo(() => flattenLessons(progressCurriculum), [progressCurriculum]);

  useEffect(() => {
    if (!progressStudentId || !progressCourse) { setCompletedLessonIds([]); return; }
    let cancelled = false;
    setLoadingProgress(true);
    adminApi(token, 'GET', `/api/admin/lesson-progress/${progressStudentId}/${encodeURIComponent(progressCourse)}`)
      .then((data) => { if (!cancelled) setCompletedLessonIds(data.completedLessonIds || []); })
      .catch((error) => { if (!cancelled) setStatus({ type: 'error', text: error.message }); })
      .finally(() => { if (!cancelled) setLoadingProgress(false); });
    return () => { cancelled = true; };
  }, [progressStudentId, progressCourse]);

  function toggleLesson(lessonId) {
    setCompletedLessonIds((current) =>
      current.includes(lessonId) ? current.filter((id) => id !== lessonId) : [...current, lessonId],
    );
  }

  async function saveProgress() {
    setSavingProgress(true);
    setStatus(null);
    try {
      await adminApi(token, 'PUT', `/api/admin/lesson-progress/${progressStudentId}/${encodeURIComponent(progressCourse)}`, { completedLessonIds });
      setStatus({ type: 'success', text: 'Lesson progress saved. The student will see this immediately.' });
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setSavingProgress(false);
    }
  }

  const catalogTitles = catalog.map((course) => course.title);

  return (
    <>
      {status ? <div className={`adminContentStatus ${status.type}`}>{status.text}</div> : null}

      <div className="adminContentGrid">
        <section className="adminContentCard">
          <h2><BookOpen size={18} /> Course Curricula</h2>
          <p className="adminContentHint">
            Build a course's full curriculum (modules, lessons, topics, assessment) using the form below, or switch
            to Raw JSON for bulk edits. Courses with a curriculum here get a real "Course Content" page on the
            student dashboard.
          </p>

          {loading ? <p>Loading existing curricula...</p> : null}

          <select value={selectedCourse} onChange={(e) => onSelectCourse(e.target.value)} disabled={loading}>
            <option value="">Choose a course...</option>
            {catalogTitles.map((title) => (
              <option key={title} value={title}>
                {title}{curricula.some((c) => c.courseTitle === title) ? ' (has curriculum)' : ''}
              </option>
            ))}
          </select>

          {selectedCourse ? (
            <>
              <div className="adminCurriculumModeTabs">
                <button type="button" className={editorMode === 'form' ? 'active' : ''} onClick={() => switchMode('form')}>Form</button>
                <button type="button" className={editorMode === 'json' ? 'active' : ''} onClick={() => switchMode('json')}>Raw JSON</button>
              </div>

              {editorMode === 'form' && curriculumObject ? (
                <AdminCurriculumForm value={curriculumObject} onChange={setCurriculumObject} />
              ) : (
                <textarea
                  className="adminCurriculumJson"
                  value={jsonDraft}
                  onChange={(e) => setJsonDraft(e.target.value)}
                  rows={16}
                  spellCheck={false}
                />
              )}

              {jsonError ? <div className="adminContentStatus error">{jsonError}</div> : null}
              <div className="adminCurriculumActions">
                <button type="button" onClick={saveCurriculum} disabled={savingCurriculum}><Save size={15} /> Save curriculum</button>
                {curricula.some((c) => c.courseTitle === selectedCourse) ? (
                  <button type="button" className="danger" onClick={deleteCurriculum} disabled={savingCurriculum}><Trash2 size={15} /> Delete</button>
                ) : null}
              </div>
            </>
          ) : null}

          {!loading && !curricula.length ? <p className="adminContentEmpty">No curricula published yet.</p> : null}
        </section>

        <section className="adminContentCard">
          <h2><CheckSquare size={18} /> Lesson Progress</h2>
          <p className="adminContentHint">
            Mark lessons complete for a specific student. This is the only way a student's lesson checkmarks, lock
            states, and progress ring update — students cannot mark their own lessons complete.
          </p>

          <select value={progressStudentId} onChange={(e) => setProgressStudentId(e.target.value)}>
            <option value="">Choose a student...</option>
            {studentAccounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name} ({account.email})</option>
            ))}
          </select>

          <select value={progressCourse} onChange={(e) => setProgressCourse(e.target.value)} disabled={!curricula.length}>
            <option value="">Choose a course...</option>
            {curricula.map((item) => (
              <option key={item.courseTitle} value={item.courseTitle}>{item.courseTitle}</option>
            ))}
          </select>

          {loadingProgress ? <p>Loading lesson list...</p> : null}

          {!loadingProgress && progressStudentId && progressCourse && progressLessons.length ? (
            <>
              <ul className="adminLessonChecklist">
                {progressLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={completedLessonIds.includes(lesson.id)}
                        onChange={() => toggleLesson(lesson.id)}
                      />
                      <span className="adminLessonId">{lesson.id}</span>
                      <span>{lesson.title}</span>
                      <small>{lesson.moduleTitle}</small>
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={saveProgress} disabled={savingProgress}>
                <Save size={15} /> {savingProgress ? 'Saving...' : 'Save lesson progress'}
              </button>
            </>
          ) : null}

          {!loadingProgress && progressStudentId && progressCourse && !progressLessons.length ? (
            <p className="adminContentEmpty">This course has no lessons defined yet.</p>
          ) : null}
        </section>
      </div>
    </>
  );
}
