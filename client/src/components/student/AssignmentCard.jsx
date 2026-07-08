import React, { useState } from 'react';
import { Clock3, FileText, Paperclip } from 'lucide-react';
import API_URL from '../../utils/apiBaseUrl';

export default function AssignmentCard({ assignment, submitting, onSubmit, courseLabel }) {
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const submission = assignment.submission;
  const status = submission?.status === 'graded' ? 'completed' : submission ? 'inprogress' : 'pending';
  const statusLabel = submission?.status === 'graded' ? 'Graded' : submission ? 'Pending Review' : 'Not Submitted';

  function handleSubmit(event) {
    event.preventDefault();
    if (!file && !notes.trim()) return;
    onSubmit(assignment.id, file, notes.trim());
    setFile(null);
    setNotes('');
    event.target.reset();
  }

  return (
    <div className="studentCard studentAssignmentCard">
      <div className="studentAssignmentHead">
        <div>
          {courseLabel ? <span className="studentAssignmentCourseLabel">{courseLabel}</span> : null}
          <h3>{assignment.title}</h3>
          {assignment.dueDate ? <span className="studentAssignmentDue"><Clock3 size={14} /> Due {assignment.dueDate}</span> : null}
        </div>
        <span className={`studentStatusBadge ${status}`}>{statusLabel}</span>
      </div>

      {assignment.instructions ? <p className="studentAssignmentInstructions">{assignment.instructions}</p> : null}

      {submission?.status === 'graded' ? (
        <div className="studentAssignmentGrade">
          <strong>{submission.grade ?? '—'} / {assignment.maxScore}</strong>
          <p>{submission.feedback || 'No written feedback provided.'}</p>
        </div>
      ) : null}

      {submission ? (
        <div className="studentAssignmentSubmission">
          {submission.fileUrl ? (
            <a href={`${API_URL}${submission.fileUrl}`} target="_blank" rel="noreferrer">
              <FileText size={15} /> {submission.fileName || 'Submitted file'}
            </a>
          ) : null}
          {submission.notes ? <p>{submission.notes}</p> : null}
          <small>Submitted {new Date(submission.submittedAt).toLocaleString()}</small>
        </div>
      ) : null}

      {submission?.status !== 'graded' ? (
        <form className="studentAssignmentForm" onSubmit={handleSubmit}>
          <label className="studentAssignmentFileInput">
            <Paperclip size={15} />
            {file ? file.name : 'Choose a file (PDF, Word, Excel, PowerPoint, ZIP, or image)'}
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <textarea
            rows={2}
            placeholder="Add notes for your instructor (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <button type="submit" className="studentBtnPrimary" disabled={submitting}>
            {submitting ? 'Submitting...' : submission ? 'Resubmit Assignment' : 'Submit Assignment'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
