import React, { useEffect, useState } from 'react';
import { Award, BookOpen, CheckCircle2, Clock3, ListChecks, Lock, XCircle } from 'lucide-react';
import { fetchStudentQuiz, submitStudentQuiz } from '../../services/studentAuthService';
import './StudentQuizzes.css';

function ResultView({ quiz, attempt, onRetake }) {
  return (
    <div>
      <div className={`studentQuizResultBanner ${attempt.passed ? 'pass' : 'fail'}`}>
        {attempt.passed ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
        <div>
          <strong>{attempt.passed ? 'You passed!' : 'You did not pass this time.'}</strong>
          <p>{attempt.score} / {attempt.totalMarks} marks &middot; {attempt.percent}% &middot; {attempt.grade}</p>
        </div>
      </div>

      <div className="studentCard">
        <h3>Question Review</h3>
        <div className="studentQuizReviewList">
          {(attempt.breakdown || []).map((q, i) => (
            <div className={`studentQuizReviewItem ${q.correct ? 'correct' : 'incorrect'}`} key={q.id}>
              <p className="studentQuizReviewQuestion">
                {q.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {i + 1}. {q.text}
              </p>
              <div className="studentQuizReviewOptions">
                {q.options.map((opt, optIndex) => {
                  const isCorrect = optIndex === q.correctIndex;
                  const isSelected = optIndex === q.selectedIndex;
                  const cls = isCorrect ? 'correctOption' : isSelected ? 'wrongOption' : '';
                  return (
                    <span className={cls} key={opt + optIndex}>
                      {opt}{isSelected && !isCorrect ? ' (your answer)' : ''}{isCorrect ? ' ✓' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="button" className="studentBtnPrimary" onClick={onRetake}>Retake Quiz</button>
    </div>
  );
}

function QuizForm({ quiz, submitting, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);

  function selectAnswer(questionId, optionIndex) {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  }

  return (
    <div>
      {quiz.learningOutcomes?.length ? (
        <div className="studentCard">
          <h3>What You'll Demonstrate</h3>
          <ul className="studentCurriculumList check">
            {quiz.learningOutcomes.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="studentQuizQuestionList">
        {quiz.questions.map((q, i) => (
          <div className="studentCard studentQuizQuestionCard" key={q.id}>
            <p className="studentQuizQuestionText">{i + 1}. {q.text} <small>({q.marks} marks)</small></p>
            <div className="studentQuizOptionList">
              {q.options.map((opt, optIndex) => (
                <label key={opt + optIndex} className={answers[q.id] === optIndex ? 'selected' : ''}>
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === optIndex}
                    onChange={() => selectAnswer(q.id, optIndex)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="studentBtnPrimary"
        disabled={!allAnswered || submitting}
        onClick={() => onSubmit(answers)}
      >
        {submitting ? 'Submitting...' : allAnswered ? 'Submit Quiz' : `Answer all ${quiz.questions.length} questions to submit`}
      </button>
    </div>
  );
}

export default function StudentQuizTake({ quizId }) {
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchStudentQuiz(quizId)
      .then((res) => {
        if (cancelled) return;
        setQuiz(res.quiz);
        setAttempt(res.attempt);
        setShowForm(!res.attempt);
      })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [quizId]);

  async function handleSubmit(answers) {
    setSubmitting(true);
    try {
      const result = await submitStudentQuiz(quizId, answers);
      setAttempt(result);
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Could not submit your quiz.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="studentEmptyState">Loading quiz...</p>;
  if (error && typeof error === 'object') {
    const Icon = error.reason === 'pending_payment' ? Clock3 : error.reason === 'not_enrolled' ? Lock : BookOpen;
    const heading = error.reason === 'pending_payment'
      ? 'Payment awaiting confirmation'
      : error.reason === 'cancelled'
        ? 'Enrollment cancelled'
        : error.reason === 'not_enrolled'
          ? 'Not enrolled'
          : 'Quiz not available';
    return (
      <div className="studentEmptyState">
        <Icon size={36} />
        <h2>{heading}</h2>
        <p>{error.message}</p>
        <a href="/student/quizzes">Back to Quizzes</a>
      </div>
    );
  }
  if (!quiz) return null;

  return (
    <div>
      <a className="studentCurriculumBack" href="/student/quizzes">&larr; Back to Quizzes</a>

      <div className="studentQuizBanner">
        <span className="studentAssignmentCourseLabel">{quiz.courseTitle}</span>
        <h1>{quiz.title}</h1>
        <div className="studentQuizMetaRow">
          <span><Clock3 size={14} /> {quiz.duration || 'Untimed'}</span>
          <span><ListChecks size={14} /> {quiz.questions?.length ?? quiz.questionCount} Questions</span>
          <span><Award size={14} /> {quiz.totalMarks} Marks &middot; Pass {quiz.passingScore}%</span>
        </div>
      </div>

      {typeof error === 'string' && error ? <div className="studentAssignmentError">{error}</div> : null}

      {showForm ? (
        <QuizForm quiz={quiz} submitting={submitting} onSubmit={handleSubmit} />
      ) : (
        <ResultView quiz={quiz} attempt={attempt} onRetake={() => setShowForm(true)} />
      )}
    </div>
  );
}
