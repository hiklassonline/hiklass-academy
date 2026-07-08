import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardList, FileText, Pencil, Save, Trash2, UserSearch } from 'lucide-react';
import { getStoredAdminToken } from '../../services/authService';
import { adminApi } from '../../services/adminContentApi';
import { courses as catalog } from '../../data/courses';
import API_URL from '../../utils/apiBaseUrl';
import './AdminAssignmentsManager.css';

const EMPTY_FORM = { title: '', instructions: '', dueDate: '', maxScore: 100 };

function GradeForm({ submission, maxScore, onDraftChange, onSave, saving }) {
  return (
    <div className="adminGradeForm">
      <input
        type="number"
        min="0"
        max={maxScore}
        placeholder={`/ ${maxScore}`}
        defaultValue={submission.grade ?? ''}
        onChange={(event) => onDraftChange({ grade: event.target.value })}
      />
      <textarea
        rows={2}
        placeholder="Feedback for the student"
        defaultValue={submission.feedback || ''}
        onChange={(event) => onDraftChange({ feedback: event.target.value })}
      />
      <button type="button" onClick={onSave} disabled={saving}>
        {saving ? 'Saving...' : submission.status === 'graded' ? 'Update grade' : 'Save grade'}
      </button>
    </div>
  );
}

export default function AdminAssignmentsManager({ studentAccounts = [] }) {
  const token = getStoredAdminToken();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const [selectedCourse, setSelectedCourse] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState('');
  const [submissions, setSubmissions] = useState({});
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [gradeDrafts, setGradeDrafts] = useState({});
  const [savingGradeId, setSavingGradeId] = useState('');

  const [lookupStudentId, setLookupStudentId] = useState('');
  const [lookupCourse, setLookupCourse] = useState('');
  const [lookupAssignments, setLookupAssignments] = useState([]);
  const [loadingLookup, setLoadingLookup] = useState(false);

  async function loadAssignments() {
    setLoading(true);
    try {
      const data = await adminApi(token, 'GET', '/api/admin/assignments');
      setAssignments(data.assignments || []);
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssignments(); }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId('');
  }

  function startEdit(item) {
    setSelectedCourse(item.courseTitle);
    setForm({ title: item.title, instructions: item.instructions || '', dueDate: item.dueDate || '', maxScore: item.maxScore || 100 });
    setEditingId(item.id);
  }

  async function saveAssignment(event) {
    event.preventDefault();
    if (!selectedCourse) { setStatus({ type: 'error', text: 'Choose a course first.' }); return; }
    if (!form.title.trim()) { setStatus({ type: 'error', text: 'Enter an assignment title.' }); return; }
    setSaving(true);
    setStatus(null);
    try {
      const payload = { courseTitle: selectedCourse, ...form, maxScore: Number(form.maxScore) || 100 };
      if (editingId) await adminApi(token, 'PUT', `/api/admin/assignments/${editingId}`, payload);
      else await adminApi(token, 'POST', '/api/admin/assignments', payload);
      setStatus({ type: 'success', text: `Assignment ${editingId ? 'updated' : 'created'}.` });
      resetForm();
      await loadAssignments();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment(id) {
    if (!window.confirm('Delete this assignment and all student submissions?')) return;
    try {
      await adminApi(token, 'DELETE', `/api/admin/assignments/${id}`);
      setStatus({ type: 'success', text: 'Assignment deleted.' });
      if (editingId === id) resetForm();
      await loadAssignments();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function toggleSubmissions(id) {
    if (expandedId === id) { setExpandedId(''); return; }
    setExpandedId(id);
    if (submissions[id]) return;
    setLoadingSubs(true);
    try {
      const data = await adminApi(token, 'GET', `/api/admin/assignments/${id}/submissions`);
      setSubmissions((current) => ({ ...current, [id]: data.submissions || [] }));
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoadingSubs(false);
    }
  }

  function updateGradeDraft(subId, patch) {
    setGradeDrafts((current) => ({ ...current, [subId]: { ...current[subId], ...patch } }));
  }

  async function gradeSubmission(sub) {
    const draft = gradeDrafts[sub.id] || {};
    setSavingGradeId(sub.id);
    setStatus(null);
    try {
      const data = await adminApi(token, 'PUT', `/api/admin/assignment-submissions/${sub.id}`, {
        grade: draft.grade !== undefined ? draft.grade : sub.grade,
        feedback: draft.feedback !== undefined ? draft.feedback : sub.feedback,
      });
      setStatus({ type: 'success', text: 'Grade saved. The student will see it immediately.' });
      return data.submission;
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
      return null;
    } finally {
      setSavingGradeId('');
    }
  }

  async function saveGrade(assignmentId, sub) {
    const updated = await gradeSubmission(sub);
    if (!updated) return;
    setSubmissions((current) => ({
      ...current,
      [assignmentId]: (current[assignmentId] || []).map((item) => (item.id === sub.id ? updated : item)),
    }));
    await loadAssignments();
  }

  async function saveLookupGrade(assignmentId, sub) {
    const updated = await gradeSubmission(sub);
    if (!updated) return;
    setLookupAssignments((current) => current.map((item) => (item.id === assignmentId ? { ...item, submission: updated } : item)));
    await loadAssignments();
  }

  useEffect(() => {
    if (!lookupStudentId || !lookupCourse) { setLookupAssignments([]); return; }
    let cancelled = false;
    setLoadingLookup(true);
    adminApi(token, 'GET', `/api/admin/student-assignments/${lookupStudentId}/${encodeURIComponent(lookupCourse)}`)
      .then((data) => { if (!cancelled) setLookupAssignments(data.assignments || []); })
      .catch((error) => { if (!cancelled) setStatus({ type: 'error', text: error.message }); })
      .finally(() => { if (!cancelled) setLoadingLookup(false); });
    return () => { cancelled = true; };
  }, [lookupStudentId, lookupCourse]);

  const catalogTitles = catalog.map((course) => course.title);
  const courseAssignments = assignments.filter((item) => !selectedCourse || item.courseTitle === selectedCourse);
  const assignmentCourseTitles = [...new Set(assignments.map((item) => item.courseTitle))].sort();

  return (
    <section className="adminContentCard adminAssignmentsCard">
      <h2><ClipboardList size={18} /> Assignments</h2>
      <p className="adminContentHint">
        Create assignments per course. Students upload a file and notes from their dashboard under "Assignments" —
        review and grade submissions below; grades and feedback appear on the student's dashboard immediately.
      </p>

      {status ? <div className={`adminContentStatus ${status.type}`}>{status.text}</div> : null}

      <select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>
        <option value="">Choose a course...</option>
        {catalogTitles.map((title) => <option key={title} value={title}>{title}</option>)}
      </select>

      {selectedCourse ? (
        <form className="adminContentForm" onSubmit={saveAssignment}>
          <input
            placeholder="Assignment title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <textarea
            placeholder="Instructions for students"
            rows={3}
            value={form.instructions}
            onChange={(event) => setForm({ ...form, instructions: event.target.value })}
          />
          <div className="adminFormGrid">
            <input
              placeholder="Due date (e.g. 2026-08-01)"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
            <input
              type="number"
              min="0"
              placeholder="Max score"
              value={form.maxScore}
              onChange={(event) => setForm({ ...form, maxScore: event.target.value })}
            />
          </div>
          <div className="adminContentFormActions">
            <button type="submit" disabled={saving}><Save size={15} /> {editingId ? 'Save changes' : 'Add assignment'}</button>
            {editingId ? <button type="button" className="ghost" onClick={resetForm}>Cancel edit</button> : null}
          </div>
        </form>
      ) : (
        <p className="adminContentHint">Choose a course above to add an assignment for it.</p>
      )}

      {loading ? <p>Loading assignments...</p> : null}
      {!loading && !courseAssignments.length ? <p className="adminContentEmpty">No assignments yet.</p> : null}

      <ul className="adminContentList">
        {courseAssignments.map((item) => (
          <li key={item.id} className={editingId === item.id ? 'editing adminAssignmentItem' : 'adminAssignmentItem'}>
            <div className="adminAssignmentItemBody">
              <div className="adminAssignmentItemHead">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.courseTitle}{item.dueDate ? ` • Due ${item.dueDate}` : ''} • {item.maxScore} pts</p>
                </div>
                <div className="adminContentListActions">
                  <button type="button" onClick={() => startEdit(item)} aria-label="Edit assignment"><Pencil size={16} /></button>
                  <button type="button" className="danger" onClick={() => deleteAssignment(item.id)} aria-label="Delete assignment"><Trash2 size={16} /></button>
                </div>
              </div>

              <button type="button" className="adminAddRow" onClick={() => toggleSubmissions(item.id)}>
                {expandedId === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {item.submissionCount} submission{item.submissionCount === 1 ? '' : 's'} ({item.gradedCount} graded)
              </button>

              {expandedId === item.id ? (
                <div className="adminSubmissionList">
                  {loadingSubs ? <p>Loading submissions...</p> : null}
                  {!loadingSubs && !(submissions[item.id] || []).length ? (
                    <p className="adminContentEmpty">No submissions yet.</p>
                  ) : null}
                  {(submissions[item.id] || []).map((sub) => (
                    <div className="adminSubmissionRow" key={sub.id}>
                      <div className="adminSubmissionInfo">
                        <strong>{sub.studentName}</strong>
                        <small>{sub.studentEmail}</small>
                        {sub.fileUrl ? (
                          <a href={`${API_URL}${sub.fileUrl}`} target="_blank" rel="noreferrer">
                            <FileText size={14} /> {sub.fileName || 'Submitted file'}
                          </a>
                        ) : null}
                        {sub.notes ? <p>{sub.notes}</p> : null}
                        <small>Submitted {new Date(sub.submittedAt).toLocaleString()}</small>
                      </div>
                      <GradeForm
                        submission={sub}
                        maxScore={item.maxScore}
                        onDraftChange={(patch) => updateGradeDraft(sub.id, patch)}
                        onSave={() => saveGrade(item.id, sub)}
                        saving={savingGradeId === sub.id}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <h3 className="adminFormSectionTitle"><UserSearch size={16} /> Student Assignment Lookup</h3>
      <p className="adminContentHint">
        Pick a student and a course to connect them with their assignments — see submission status and grade
        directly, without hunting through every assignment.
      </p>

      <div className="adminFormGrid">
        <select value={lookupStudentId} onChange={(event) => setLookupStudentId(event.target.value)}>
          <option value="">Choose a student...</option>
          {studentAccounts.map((account) => (
            <option key={account.id} value={account.id}>{account.name} ({account.email})</option>
          ))}
        </select>
        <select value={lookupCourse} onChange={(event) => setLookupCourse(event.target.value)} disabled={!assignmentCourseTitles.length}>
          <option value="">Choose a course...</option>
          {assignmentCourseTitles.map((title) => <option key={title} value={title}>{title}</option>)}
        </select>
      </div>

      {loadingLookup ? <p>Loading assignments...</p> : null}
      {!loadingLookup && lookupStudentId && lookupCourse && !lookupAssignments.length ? (
        <p className="adminContentEmpty">This course has no assignments yet.</p>
      ) : null}

      {!loadingLookup && lookupAssignments.length ? (
        <div className="adminSubmissionList">
          {lookupAssignments.map((item) => (
            <div className="adminSubmissionRow" key={item.id}>
              <div className="adminSubmissionInfo">
                <strong>{item.title}</strong>
                <small>{item.dueDate ? `Due ${item.dueDate}` : 'No due date'} • {item.maxScore} pts</small>
                {item.submission ? (
                  <>
                    {item.submission.fileUrl ? (
                      <a href={`${API_URL}${item.submission.fileUrl}`} target="_blank" rel="noreferrer">
                        <FileText size={14} /> {item.submission.fileName || 'Submitted file'}
                      </a>
                    ) : null}
                    {item.submission.notes ? <p>{item.submission.notes}</p> : null}
                    <small>Submitted {new Date(item.submission.submittedAt).toLocaleString()}</small>
                  </>
                ) : (
                  <p>Not submitted yet.</p>
                )}
              </div>
              {item.submission ? (
                <GradeForm
                  submission={item.submission}
                  maxScore={item.maxScore}
                  onDraftChange={(patch) => updateGradeDraft(item.submission.id, patch)}
                  onSave={() => saveLookupGrade(item.id, item.submission)}
                  saving={savingGradeId === item.submission.id}
                />
              ) : (
                <div className="adminGradeForm">
                  <small className="adminContentEmpty">Grading available once the student submits.</small>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
