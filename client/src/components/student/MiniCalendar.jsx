import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MiniCalendar({ items = [] }) {
  const today = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = useState(0);

  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const markedDays = useMemo(() => {
    const set = new Set();
    for (const item of items) {
      const date = new Date(item.date);
      if (date.getFullYear() === year && date.getMonth() === month) set.add(date.getDate());
    }
    return set;
  }, [items, year, month]);

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="studentMiniCalendar">
      <div className="studentMiniCalendarHead">
        <strong>{viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
        <div>
          <button type="button" onClick={() => setMonthOffset((value) => value - 1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setMonthOffset((value) => value + 1)} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="studentMiniCalendarGrid">
        {WEEKDAYS.map((day) => <span key={day} className="studentMiniCalendarWeekday">{day}</span>)}
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;
          const isToday = isCurrentMonth && day === today.getDate();
          return (
            <span key={day} className={isToday ? 'studentMiniCalendarDay today' : 'studentMiniCalendarDay'}>
              {day}
              {markedDays.has(day) ? <em /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
