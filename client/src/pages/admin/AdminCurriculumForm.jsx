import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

function textToList(text) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

function textToTopics(text) {
  return text.split(',').map((item) => item.trim()).filter(Boolean);
}

function ListField({ label, value, onChange, rows = 3 }) {
  return (
    <label className="adminFormField">
      <span>{label} <small>(one per line)</small></span>
      <textarea rows={rows} value={(value || []).join('\n')} onChange={(event) => onChange(textToList(event.target.value))} />
    </label>
  );
}

export default function AdminCurriculumForm({ value, onChange }) {
  function set(key, next) {
    onChange({ ...value, [key]: next });
  }

  function updateModule(index, patch) {
    set('modules', (value.modules || []).map((module, i) => (i === index ? { ...module, ...patch } : module)));
  }

  function addModule() {
    const nextId = String((value.modules?.length || 0) + 1);
    set('modules', [...(value.modules || []), { id: nextId, title: '', duration: '', lessons: [], modulePractical: [] }]);
  }

  function removeModule(index) {
    if (!window.confirm('Remove this module and all its lessons?')) return;
    set('modules', (value.modules || []).filter((_, i) => i !== index));
  }

  function updateLesson(moduleIndex, lessonIndex, patch) {
    const module = value.modules[moduleIndex];
    const lessons = (module.lessons || []).map((lesson, i) => (i === lessonIndex ? { ...lesson, ...patch } : lesson));
    updateModule(moduleIndex, { lessons });
  }

  function addLesson(moduleIndex) {
    const module = value.modules[moduleIndex];
    const nextNumber = (module.lessons?.length || 0) + 1;
    const newLesson = { id: `${module.id || moduleIndex + 1}.${nextNumber}`, title: '', topics: [], practical: '' };
    updateModule(moduleIndex, { lessons: [...(module.lessons || []), newLesson] });
  }

  function removeLesson(moduleIndex, lessonIndex) {
    const module = value.modules[moduleIndex];
    updateModule(moduleIndex, { lessons: (module.lessons || []).filter((_, i) => i !== lessonIndex) });
  }

  function updateAssessmentRow(index, patch) {
    set('assessment', (value.assessment || []).map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addAssessmentRow() {
    set('assessment', [...(value.assessment || []), { label: '', weight: 0 }]);
  }

  function removeAssessmentRow(index) {
    set('assessment', (value.assessment || []).filter((_, i) => i !== index));
  }

  return (
    <div className="adminCurriculumForm">
      <div className="adminFormGrid">
        <label className="adminFormField"><span>Course Code</span><input value={value.courseCode || ''} onChange={(e) => set('courseCode', e.target.value)} placeholder="HKA-XXX-000" /></label>
        <label className="adminFormField"><span>Level</span><input value={value.level || ''} onChange={(e) => set('level', e.target.value)} placeholder="Beginner" /></label>
        <label className="adminFormField"><span>Duration</span><input value={value.duration || ''} onChange={(e) => set('duration', e.target.value)} placeholder="4 Weeks (40-60 Hours)" /></label>
        <label className="adminFormField"><span>Mode</span><input value={value.mode || ''} onChange={(e) => set('mode', e.target.value)} placeholder="Physical | Online | Hybrid" /></label>
        <label className="adminFormField"><span>Prerequisite</span><input value={value.prerequisite || ''} onChange={(e) => set('prerequisite', e.target.value)} placeholder="None" /></label>
        <label className="adminFormField"><span>Certification</span><input value={value.certification || ''} onChange={(e) => set('certification', e.target.value)} placeholder="HIKLASS Academy Certificate in..." /></label>
      </div>

      <label className="adminFormField">
        <span>Description</span>
        <textarea rows={4} value={value.description || ''} onChange={(e) => set('description', e.target.value)} />
      </label>

      <ListField label="Objectives" value={value.objectives} onChange={(v) => set('objectives', v)} />
      <ListField label="Learning Outcomes" value={value.learningOutcomes} onChange={(v) => set('learningOutcomes', v)} />

      <h4 className="adminFormSectionTitle">Modules</h4>
      {(value.modules || []).map((module, mi) => (
        <div className="adminModuleEditor" key={mi}>
          <div className="adminModuleEditorHead">
            <input className="adminModuleIdInput" value={module.id} onChange={(e) => updateModule(mi, { id: e.target.value })} placeholder="ID" />
            <input value={module.title} onChange={(e) => updateModule(mi, { title: e.target.value })} placeholder="Module title" />
            <input value={module.duration || ''} onChange={(e) => updateModule(mi, { duration: e.target.value })} placeholder="Week 1" />
            <button type="button" className="adminIconDanger" onClick={() => removeModule(mi)} aria-label="Remove module"><Trash2 size={14} /></button>
          </div>

          {(module.lessons || []).map((lesson, li) => (
            <div className="adminLessonEditor" key={li}>
              <input className="adminModuleIdInput" value={lesson.id} onChange={(e) => updateLesson(mi, li, { id: e.target.value })} placeholder="1.1" />
              <input value={lesson.title} onChange={(e) => updateLesson(mi, li, { title: e.target.value })} placeholder="Lesson title" />
              <button type="button" className="adminIconDanger" onClick={() => removeLesson(mi, li)} aria-label="Remove lesson"><Trash2 size={13} /></button>
              <input
                className="adminLessonWide"
                value={(lesson.topics || []).join(', ')}
                onChange={(e) => updateLesson(mi, li, { topics: textToTopics(e.target.value) })}
                placeholder="Topics, comma, separated"
              />
              <input
                className="adminLessonWide"
                value={lesson.practical || ''}
                onChange={(e) => updateLesson(mi, li, { practical: e.target.value })}
                placeholder="Practical exercise (optional)"
              />
            </div>
          ))}
          <button type="button" className="adminAddRow" onClick={() => addLesson(mi)}><Plus size={13} /> Add lesson</button>

          <ListField label="Module practical / projects" value={module.modulePractical} onChange={(v) => updateModule(mi, { modulePractical: v })} rows={2} />
        </div>
      ))}
      <button type="button" className="adminAddRow" onClick={addModule}><Plus size={15} /> Add module</button>

      <ListField label="Practical Projects" value={value.practicalProject} onChange={(v) => set('practicalProject', v)} />
      <ListField label="Capstone Project" value={value.capstoneProject} onChange={(v) => set('capstoneProject', v)} />

      <h4 className="adminFormSectionTitle">Assessment</h4>
      {(value.assessment || []).map((row, i) => (
        <div className="adminAssessmentRow" key={i}>
          <input value={row.label} onChange={(e) => updateAssessmentRow(i, { label: e.target.value })} placeholder="Continuous Assessment" />
          <input type="number" min="0" max="100" value={row.weight} onChange={(e) => updateAssessmentRow(i, { weight: Number(e.target.value) })} placeholder="%" />
          <button type="button" className="adminIconDanger" onClick={() => removeAssessmentRow(i)} aria-label="Remove row"><Trash2 size={13} /></button>
        </div>
      ))}
      <button type="button" className="adminAddRow" onClick={addAssessmentRow}><Plus size={15} /> Add assessment row</button>

      <ListField label="Certification Requirements" value={value.certificationRequirements} onChange={(v) => set('certificationRequirements', v)} />
      <ListField label="Software & Tools" value={value.softwareTools} onChange={(v) => set('softwareTools', v)} />
      <ListField label="Career Opportunities" value={value.careerOpportunities} onChange={(v) => set('careerOpportunities', v)} />

      <label className="adminFormField">
        <span>What's Next <small>(optional closing note about advanced programs)</small></span>
        <textarea rows={2} value={value.nextSteps || ''} onChange={(e) => set('nextSteps', e.target.value)} />
      </label>
    </div>
  );
}
