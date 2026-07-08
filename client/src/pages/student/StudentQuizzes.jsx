import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Clock3, HelpCircle, ListChecks, XCircle } from 'lucide-react';
import { fetchStudentQuizzes } from '../../services/studentAuthService';
import './StudentQuizzes.css';

export default function StudentQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStudentQuizzes()
      .then((list) => { if (!cancelled) setQuizzes(list); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="studentPageHeader">
        <h2>Quizzes</h2>
        <p>Auto-graded quizzes from every course you're enrolled in — take a quiz and see your score instantly.</p>
      </div>

      {loading ? <p className="studentEmptyState">Loading quizzes...</p> : null}
      {!loading && error ? <div className="studentAssignmentError">{error}</div> : null}

      {!loading && !quizzes.length ? (
        <div className="studentEmptyState">
          <HelpCircle size={40} />
          <h2>No quizzes yet</h2>
          <p>Once your instructors post a quiz for a course you're enrolled and paid up in, it'll show up here.</p>
        </div>
      ) : null}

      {!loading && quizzes.length ? (
        <div className="studentAssignmentList">
          {quizzes.map((quiz) => {
            const attempt = quiz.attempt;
            return (
              <div className="studentCard studentQuizCard" key={quiz.id}>
                <div className="studentAssignmentHead">
                  <div>
                    <span className="studentAssignmentCourseLabel">{quiz.courseTitle}</span>
                    <h3>{quiz.title}</h3>
                    <div className="studentQuizMetaRow">
                      <span><Clock3 size={14} /> {quiz.duration || 'Untimed'}</span>
                      <span><ListChecks size={14} /> {quiz.questionCount} Questions</span>
                      <span><Award size={14} /> {quiz.totalMarks} Marks &middot; Pass {quiz.passingScore}%</span>
                    </div>
                  </div>
                  {attempt ? (
                    <span className={`studentStatusBadge ${attempt.passed ? 'completed' : 'cancelled'}`}>
                      {attempt.passed ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {attempt.percent}% &middot; {attempt.grade}
                    </span>
                  ) : (
                    <span className="studentStatusBadge pending">Not Attempted</span>
                  )}
                </div>
                <a className="studentBtnPrimary studentQuizCta" href={`/student/quizzes/${encodeURIComponent(quiz.id)}`}>
                  {attempt ? 'Review / Retake Quiz' : 'Take Quiz'}
                </a>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
