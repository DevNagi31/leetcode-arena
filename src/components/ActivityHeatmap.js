import React from 'react';

export default function ActivityHeatmap({ activityDates }) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const year = now.getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const activityMap = {};
  (activityDates || []).forEach(a => { activityMap[a.date] = a.problemsSolved; });

  const weeks = [];
  const cursor = new Date(startDate);
  cursor.setDate(cursor.getDate() - cursor.getDay());

  while (cursor <= endDate) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
      const isBeforeYear = cursor < startDate;
      const isAfterYear = cursor > endDate;
      const isFuture = dateStr > todayStr;
      week.push({
        date: dateStr,
        count: activityMap[dateStr] || 0,
        isFuture,
        isOutOfRange: isBeforeYear || isAfterYear,
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
    if (week[0].month !== prevMonth && !week[0].isOutOfRange) {
      monthLabels[wi] = months[week[0].month];
    }
  });

  return (
    <div className="custom-heatmap">
      <div style={{ display: 'flex', width: '100%' }}>
        <div className="heatmap-day-labels">
          <div style={{ height: '20px' }} />
          {days.map(day => (
            <div key={day} className="heatmap-day-label">{day}</div>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
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
