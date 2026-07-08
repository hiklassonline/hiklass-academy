import React, { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { fetchAllStudentAssignments, submitStudentAssignment } from '../../services/studentAuthService';
import AssignmentCard from '../../components/student/AssignmentCard';
import './StudentCourseCurriculum.css';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchAllStudentAssignments()
      .then((list) => { if (!cancelled) setAssignments(list); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(assignmentId, file, notes) {
    setSubmittingId(assignmentId);
    setError('');
    try {
      const submission = await submitStudentAssignment(assignmentId, { file, notes });
      setAssignments((current) => current.map((item) => (item.id === assignmentId ? { ...item, submission } : item)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingId('');
    }
  }

  return (
    <div>
      <div className="studentPageHeader">
        <h2>Assignments</h2>
        <p>Assignments from every course you're enrolled in — submit files and notes, and see grades as soon as your instructor reviews them.</p>
      </div>

      {loading ? <p className="studentEmptyState">Loading assignments...</p> : null}
      {!loading && error ? <div className="studentAssignmentError">{error}</div> : null}

      {!loading && !assignments.length ? (
        <div className="studentEmptyState">
          <ClipboardList size={40} />
          <h2>No assignments yet</h2>
          <p>Once your instructors post assignments for a course you're enrolled and paid up in, they'll show up here.</p>
        </div>
      ) : null}

      {!loading && assignments.length ? (
        <div className="studentAssignmentList">
          {assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              courseLabel={assignment.courseTitle}
              submitting={submittingId === assignment.id}
              onSubmit={handleSubmit}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
