import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Pencil, Plus, PlusCircle, Save, Trash2, UserCheck } from 'lucide-react';
import { getStoredAdminToken } from '../../services/authService';
import { adminApi } from '../../services/adminContentApi';
import { courses as catalog } from '../../data/courses';
import './AdminQuizzesManager.css';

const EMPTY_QUESTION = { text: '', options: ['', ''], correctIndex: 0, marks: 2 };
const EMPTY_FORM = {
  title: '',
  courseCode: '',
  duration: '',
  passingScore: 70,
  learningOutcomes: [],
  assignedStudentId: '',
  assignedStudentName: '',
  questions: [{ ...EMPTY_QUESTION, options: ['', ''] }],
};

function cloneForm(form) {
  return {
    ...form,
    learningOutcomes: [...(form.learningOutcomes || [])],
    questions: (form.questions || []).map((q) => ({ ...q, options: [...(q.options || [])] })),
  };
}

export default function AdminQuizzesManager({ studentAccounts = [] }) {
  const token = getStoredAdminToken();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const [selectedCourse, setSelectedCourse] = useState('');
  const [form, setForm] = useState(cloneForm(EMPTY_FORM));
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [expandedId, setExpandedId] = useState('');
  const [attempts, setAttempts] = useState({});
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  async function loadQuizzes() {
    setLoading(true);
    try {
      const data = await adminApi(token, 'GET', '/api/admin/quizzes');
      setQuizzes(data.quizzes || []);
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadQuizzes(); }, []);

  function resetForm() {
    setForm(cloneForm(EMPTY_FORM));
    setEditingId('');
  }

  function openAddForm() {
    if (!selectedCourse) { setStatus({ type: 'error', text: 'Choose a course above first, then add a quiz for it.' }); return; }
    setStatus(null);
    resetForm();
    setShowForm(true);
  }

  function startEdit(item) {
    setSelectedCourse(item.courseTitle);
    setForm(cloneForm({
      title: item.title,
      courseCode: item.courseCode || '',
      duration: item.duration || '',
      passingScore: item.passingScore || 70,
      learningOutcomes: item.learningOutcomes || [],
      assignedStudentId: item.assignedStudentId || '',
      assignedStudentName: item.assignedStudentName || '',
      questions: item.questions?.length ? item.questions : [{ ...EMPTY_QUESTION, options: ['', ''] }],
    }));
    setEditingId(item.id);
    setShowForm(true);
  }

  function updateQuestion(qi, patch) {
    setForm((current) => {
      const next = cloneForm(current);
      next.questions[qi] = { ...next.questions[qi], ...patch };
      return next;
    });
  }

  function updateOption(qi, oi, value) {
    setForm((current) => {
      const next = cloneForm(current);
      next.questions[qi].options[oi] = value;
      return next;
    });
  }

  function addOption(qi) {
    setForm((current) => {
      const next = cloneForm(current);
      next.questions[qi].options.push('');
      return next;
    });
  }

  function removeOption(qi, oi) {
    setForm((current) => {
      const next = cloneForm(current);
      if (next.questions[qi].options.length <= 2) return next;
      next.questions[qi].options.splice(oi, 1);
      if (next.questions[qi].correctIndex >= next.questions[qi].options.length) next.questions[qi].correctIndex = 0;
      return next;
    });
  }

  function addQuestion() {
    setForm((current) => ({ ...cloneForm(current), questions: [...cloneForm(current).questions, { ...EMPTY_QUESTION, options: ['', ''] }] }));
  }

  function removeQuestion(qi) {
    if (form.questions.length <= 1) return;
    if (!window.confirm('Remove this question?')) return;
    setForm((current) => {
      const next = cloneForm(current);
      next.questions.splice(qi, 1);
      return next;
    });
  }

  function updateLearningOutcomes(text) {
    setForm((current) => ({ ...cloneForm(current), learningOutcomes: text.split('\n').map((s) => s.trim()).filter(Boolean) }));
  }

  async function saveQuiz(event) {
    event.preventDefault();
    if (!selectedCourse) { setStatus({ type: 'error', text: 'Choose a course first.' }); return; }
    if (!form.title.trim()) { setStatus({ type: 'error', text: 'Enter a quiz title.' }); return; }
    for (const q of form.questions) {
      if (!q.text.trim()) { setStatus({ type: 'error', text: 'Every question needs text.' }); return; }
      if (q.options.filter((o) => o.trim()).length < 2) { setStatus({ type: 'error', text: `"${q.text}" needs at least 2 options.` }); return; }
    }
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        courseTitle: selectedCourse,
        title: form.title,
        courseCode: form.courseCode,
        duration: form.duration,
        passingScore: Number(form.passingScore) || 70,
        learningOutcomes: form.learningOutcomes,
        assignedStudentId: form.assignedStudentId,
        assignedStudentName: form.assignedStudentName,
        questions: form.questions,
      };
      if (editingId) await adminApi(token, 'PUT', `/api/admin/quizzes/${editingId}`, payload);
      else await adminApi(token, 'POST', '/api/admin/quizzes', payload);
      setStatus({ type: 'success', text: `Quiz ${editingId ? 'updated' : 'created'}.` });
      resetForm();
      setShowForm(false);
      await loadQuizzes();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuiz(id) {
    if (!window.confirm('Delete this quiz and all student attempts?')) return;
    try {
      await adminApi(token, 'DELETE', `/api/admin/quizzes/${id}`);
      setStatus({ type: 'success', text: 'Quiz deleted.' });
      if (editingId === id) resetForm();
      await loadQuizzes();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function toggleAttempts(id) {
    if (expandedId === id) { setExpandedId(''); return; }
    setExpandedId(id);
    if (attempts[id]) return;
    setLoadingAttempts(true);
    try {
      const data = await adminApi(token, 'GET', `/api/admin/quizzes/${id}/attempts`);
      setAttempts((current) => ({ ...current, [id]: data.attempts || [] }));
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoadingAttempts(false);
    }
  }

  const catalogTitles = catalog.map((course) => course.title);
  const courseQuizzes = quizzes.filter((item) => !selectedCourse || item.courseTitle === selectedCourse);

  return (
    <section className="adminContentCard adminAssignmentsCard">
      <div className="adminPanelTitle">
        <h2><HelpCircle size={18} /> Quizzes</h2>
        <button type="button" onClick={openAddForm}><PlusCircle size={16} /> Add Quiz</button>
      </div>
      <p className="adminContentHint">
        Create auto-graded multiple-choice quizzes per course. Students see their score, pass/fail, and a full
        answer review the moment they submit — no manual grading needed. Optionally assign a quiz to one specific
        student instead of the whole course.
      </p>

      {status ? <div className={`adminContentStatus ${status.type}`}>{status.text}</div> : null}

      <select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>
        <option value="">Choose a course...</option>
        {catalogTitles.map((title) => <option key={title} value={title}>{title}</option>)}
      </select>

      {selectedCourse && showForm ? (
        <form className="adminContentForm" onSubmit={saveQuiz}>
          <div className="adminFormGrid">
            <input placeholder="Quiz title" value={form.title} onChange={(e) => setForm({ ...cloneForm(form), title: e.target.value })} />
            <input placeholder="Course code (e.g. HKA-BCT-101)" value={form.courseCode} onChange={(e) => setForm({ ...cloneForm(form), courseCode: e.target.value })} />
            <input placeholder="Duration (e.g. 30 Minutes)" value={form.duration} onChange={(e) => setForm({ ...cloneForm(form), duration: e.target.value })} />
            <input type="number" min="0" max="100" placeholder="Passing score (%)" value={form.passingScore} onChange={(e) => setForm({ ...cloneForm(form), passingScore: e.target.value })} />
          </div>

          <label className="adminFormField">
            <span>Assign to <small>(optional — leave as "All enrolled students" to make it available to the whole course)</small></span>
            <select
              value={form.assignedStudentId}
              onChange={(e) => {
                const account = studentAccounts.find((a) => a.id === e.target.value);
                setForm({ ...cloneForm(form), assignedStudentId: e.target.value, assignedStudentName: account?.name || '' });
              }}
            >
              <option value="">All enrolled students</option>
              {studentAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name} ({account.email})</option>
              ))}
            </select>
          </label>

          <label className="adminFormField">
            <span>Learning Outcomes <small>(one per line, optional)</small></span>
            <textarea rows={2} value={form.learningOutcomes.join('\n')} onChange={(e) => updateLearningOutcomes(e.target.value)} />
          </label>

          <h4 className="adminFormSectionTitle">Questions</h4>
          {form.questions.map((q, qi) => (
            <div className="adminQuizQuestionEditor" key={qi}>
              <div className="adminQuizQuestionHead">
                <input
                  placeholder={`Question ${qi + 1}`}
                  value={q.text}
                  onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                />
                <input
                  type="number"
                  min="1"
                  className="adminQuizMarksInput"
                  value={q.marks}
                  onChange={(e) => updateQuestion(qi, { marks: Number(e.target.value) || 1 })}
                  title="Marks"
                />
                <button type="button" className="adminIconDanger" onClick={() => removeQuestion(qi)} aria-label="Remove question">
                  <Trash2 size={14} />
                </button>
              </div>
              {q.options.map((opt, oi) => (
                <div className="adminQuizOptionRow" key={oi}>
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={q.correctIndex === oi}
                    onChange={() => updateQuestion(qi, { correctIndex: oi })}
                    title="Mark as correct answer"
                  />
                  <input
                    placeholder={`Option ${oi + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                  />
                  <button type="button" className="adminIconDanger" onClick={() => removeOption(qi, oi)} aria-label="Remove option">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button type="button" className="adminAddRow" onClick={() => addOption(qi)}><Plus size={13} /> Add option</button>
            </div>
          ))}
          <button type="button" className="adminAddRow" onClick={addQuestion}><Plus size={15} /> Add question</button>

          <div className="adminContentFormActions">
            <button type="submit" disabled={saving}><Save size={15} /> {editingId ? 'Save changes' : 'Add quiz'}</button>
            <button type="button" className="ghost" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</button>
          </div>
        </form>
      ) : null}

      {!selectedCourse ? <p className="adminContentHint">Choose a course above, then click "Add Quiz" to create one.</p> : null}

      {loading ? <p>Loading quizzes...</p> : null}
      {!loading && !courseQuizzes.length ? <p className="adminContentEmpty">No quizzes yet.</p> : null}

      <ul className="adminContentList">
        {courseQuizzes.map((item) => (
          <li key={item.id} className={editingId === item.id ? 'editing adminAssignmentItem' : 'adminAssignmentItem'}>
            <div className="adminAssignmentItemBody">
              <div className="adminAssignmentItemHead">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.courseTitle} &middot; {item.questions?.length || 0} questions &middot; {item.totalMarks} marks &middot; Pass {item.passingScore}%</p>
                  {item.assignedStudentId ? (
                    <p className="adminQuizAssignedBadge"><UserCheck size={13} /> Assigned to {item.assignedStudentName || 'one student'} only</p>
                  ) : null}
                </div>
                <div className="adminContentListActions">
                  <button type="button" onClick={() => startEdit(item)} aria-label="Edit quiz"><Pencil size={16} /></button>
                  <button type="button" className="danger" onClick={() => deleteQuiz(item.id)} aria-label="Delete quiz"><Trash2 size={16} /></button>
                </div>
              </div>

              <button type="button" className="adminAddRow" onClick={() => toggleAttempts(item.id)}>
                {expandedId === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {item.attemptCount} attempt{item.attemptCount === 1 ? '' : 's'} ({item.passCount} passed)
              </button>

              {expandedId === item.id ? (
                <div className="adminSubmissionList">
                  {loadingAttempts ? <p>Loading attempts...</p> : null}
                  {!loadingAttempts && !(attempts[item.id] || []).length ? (
                    <p className="adminContentEmpty">No attempts yet.</p>
                  ) : null}
                  {(attempts[item.id] || []).map((a) => (
                    <div className="adminSubmissionRow adminQuizAttemptRow" key={a.id}>
                      <div className="adminSubmissionInfo">
                        <strong>{a.studentName}</strong>
                        <small>{a.studentEmail}</small>
                        <small>Submitted {new Date(a.submittedAt).toLocaleString()}</small>
                      </div>
                      <div>
                        <span className={a.passed ? 'statusBadge paid' : 'statusBadge pending'}>
                          {a.score} / {a.totalMarks} &middot; {a.percent}% &middot; {a.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
