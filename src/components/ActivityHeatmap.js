import React, { useState, useEffect } from 'react';

export default function ActivityHeatmap({ activityDates }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 768
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const activityMap = {};
  (activityDates || []).forEach(a => { activityMap[a.date] = a.problemsSolved; });

  // On mobile: show last ~17 weeks (4 months rolling window) so cells stay legible.
  // On desktop: show full current year.
  let startDate;
  let endDate;
  if (isMobile) {
    endDate = new Date(now);
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 17 * 7);
  } else {
    const year = now.getFullYear();
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31);
  }

  const weeks = [];
  const cursor = new Date(startDate);
  cursor.setDate(cursor.getDate() - cursor.getDay());

  while (cursor <= endDate) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
      const isBeforeStart = cursor < startDate;
      const isAfterEnd = cursor > endDate;
      const isFuture = dateStr > todayStr;
      week.push({
        date: dateStr,
        count: activityMap[dateStr] || 0,
        isFuture,
        isOutOfRange: isBeforeStart || isAfterEnd,
        month: cursor.getMonth(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const getColor = (count, isFuture, isOutOfRange) => {
    if (isOutOfRange) return 'transparent';
    if (isFuture) return 'var(--heatmap-empty, #ebedf0)';
    if (count === 0) return 'var(--heatmap-empty, #ebedf0)';
    if (count === 1) return '#93c5fd';
    if (count === 2) return '#60a5fa';
    if (count <= 4) return '#3b82f6';
    return '#1d4ed8';
  };

  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const prevMonth = wi > 0 ? weeks[wi-1][0].month : -1;
    const firstInRange = week.find(d => !d.isOutOfRange);
    if (firstInRange && firstInRange.month !== prevMonth) {
      monthLabels[wi] = months[firstInRange.month];
    }
  });

  return (
    <div className="custom-heatmap">
      <div className="heatmap-row">
        <div className="heatmap-day-labels">
          <div className="heatmap-month-spacer" />
          {days.map(day => (
            <div key={day} className="heatmap-day-label">{day}</div>
          ))}
        </div>
        <div className="heatmap-inner">
          <div className="heatmap-months-row">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-month-cell">{monthLabels[wi] || ''}</div>
            ))}
          </div>
          <div className="heatmap-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="heatmap-cell"
                    style={{ background: getColor(day.count, day.isFuture, day.isOutOfRange) }}
                    title={!day.isFuture && !day.isOutOfRange ? `${day.date}: ${day.count} problem${day.count !== 1 ? 's' : ''}` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        {['#ebedf0','#93c5fd','#60a5fa','#3b82f6','#1d4ed8'].map((c,i) => (
          <div key={i} className="legend-cell" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
