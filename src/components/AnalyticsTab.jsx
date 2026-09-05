import React, { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Activity,
  Rocket, Award, Zap, Target, BarChart3, Calendar, Flame, Clock
} from 'lucide-react';
import ActivityHeatmap from './ActivityHeatmap';

export default function AnalyticsTab({ user, weeklyGoal, editingGoal, weeklyGoalTarget, onToggleEditGoal, onGoalTargetChange, onSaveGoal }) {
  const analytics = useMemo(() => {
    const easy = user.easy || 0;
    const medium = user.medium || 0;
    const hard = user.hard || 0;
    const total = user.problems || 0;
    const activityDates = user.activityDates || [];
    const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
    const now = new Date();

    // --- Donut chart ---
    const donutTotal = easy + medium + hard || 1;
    const easyPct = (easy / donutTotal) * 100;
    const medPct = (medium / donutTotal) * 100;
    const hardPct = (hard / donutTotal) * 100;

    // --- Quick Stats ---
    const accountAgeDays = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));
    const problemsPerDay = total / accountAgeDays;

    // Total submissions from activity
    const totalSubmissions = activityDates.reduce((s, a) => s + a.problemsSolved, 0);
    // activityDates is the last year; activeDaysCount is lifetime.
    const totalActiveDays = user.activeDaysCount ?? activityDates.length;

    // --- This Week ---
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const thisWeekActivity = daysOfWeek.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      const dateStr = toDateStr(date);
      const activity = activityDates.find(a => a.date === dateStr);
      return { day, solved: activity?.problemsSolved || 0, active: !!activity };
    });

    // --- Solving Velocity (last 8 weeks) ---
    const weeklyData = [];
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      const weekStartStr = toDateStr(weekStart);
      const weekEndStr = toDateStr(weekEnd);

      let count = 0;
      activityDates.forEach(a => {
        if (a.date >= weekStartStr && a.date <= weekEndStr) {
          count += a.problemsSolved;
        }
      });
      weeklyData.push({ count, label: formatWeekLabel(weekStart) });
    }

    const weeklyAvg = weeklyData.length > 0
      ? weeklyData.reduce((s, w) => s + w.count, 0) / weeklyData.length
      : 0;

    const recentHalf = weeklyData.slice(4);
    const olderHalf = weeklyData.slice(0, 4);
    const recentAvg = recentHalf.reduce((s, w) => s + w.count, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((s, w) => s + w.count, 0) / olderHalf.length;
    const velocityTrend = olderAvg === 0 && recentAvg === 0
      ? 'steady'
      : recentAvg > olderAvg * 1.15
        ? 'improving'
        : recentAvg < olderAvg * 0.85
          ? 'declining'
          : 'steady';

    // --- Difficulty Trend (recent 30 days vs older) ---
    const thirtyDaysAgo = toDateStr(new Date(now.getTime() - 30 * 86400000));
    const sixtyDaysAgo = toDateStr(new Date(now.getTime() - 60 * 86400000));

    let recentEasy = 0, recentMed = 0, recentHard = 0;
    let olderEasy = 0, olderMed = 0, olderHard = 0;
    activityDates.forEach(a => {
      if (a.date >= thirtyDaysAgo) {
        recentEasy += a.easy || 0;
        recentMed += a.medium || 0;
        recentHard += a.hard || 0;
      } else if (a.date >= sixtyDaysAgo) {
        olderEasy += a.easy || 0;
        olderMed += a.medium || 0;
        olderHard += a.hard || 0;
      }
    });

    const recentTotal = recentEasy + recentMed + recentHard;
    const olderTotal = olderEasy + olderMed + olderHard;
    const recentHardPct = recentTotal > 0 ? Math.round(((recentMed + recentHard) / recentTotal) * 100) : 0;
    const olderHardPct = olderTotal > 0 ? Math.round(((olderMed + olderHard) / olderTotal) * 100) : 0;
    const difficultyShift = recentHardPct - olderHardPct;

    // --- Consistency Score ---
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const dayOfMonth = now.getDate();

    const activeDaysThisMonth = activityDates.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const activeRatio = dayOfMonth > 0 ? activeDaysThisMonth / dayOfMonth : 0;

    let consistencyGrade, consistencyColor;
    if (activeRatio >= 0.9) { consistencyGrade = 'A+'; consistencyColor = '#22c55e'; }
    else if (activeRatio >= 0.75) { consistencyGrade = 'A'; consistencyColor = '#22c55e'; }
    else if (activeRatio >= 0.6) { consistencyGrade = 'B+'; consistencyColor = '#84cc16'; }
    else if (activeRatio >= 0.45) { consistencyGrade = 'B'; consistencyColor = '#eab308'; }
    else if (activeRatio >= 0.3) { consistencyGrade = 'C'; consistencyColor = '#eab308'; }
    else if (activeRatio >= 0.15) { consistencyGrade = 'D'; consistencyColor = '#ef4444'; }
    else { consistencyGrade = 'F'; consistencyColor = '#ef4444'; }

    // Avg gap
    const sortedDates = activityDates.map(a => a.date).sort();
    let totalGap = 0, gapCount = 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = daysBetween(sortedDates[i - 1], sortedDates[i]);
      if (diff > 1) { totalGap += diff - 1; gapCount++; }
    }
    const avgGap = gapCount > 0 ? (totalGap / gapCount).toFixed(1) : 0;

    // --- Best Days of the Week ---
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    activityDates.forEach(a => {
      const dayIdx = new Date(a.date).getDay();
      dayTotals[dayIdx] += a.problemsSolved;
      dayCounts[dayIdx]++;
    });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats = dayNames.map((name, i) => ({
      name,
      total: dayTotals[i],
      avg: dayCounts[i] > 0 ? (dayTotals[i] / dayCounts[i]).toFixed(1) : '0',
    }));
    const maxDayTotal = Math.max(...dayTotals, 1);
    const bestDayOfWeek = dayStats.reduce((best, d) => d.total > best.total ? d : best, dayStats[0]);

    // --- Projected Growth ---
    const recentWeeklyAvg = recentHalf.reduce((s, w) => s + w.count, 0) / recentHalf.length;
    const recentDailyRate = recentWeeklyAvg / 7;
    const milestones = [100, 200, 500, 1000].filter(m => m > total);
    const projections = milestones.map(m => {
      const daysNeeded = recentDailyRate > 0 ? Math.ceil((m - total) / recentDailyRate) : null;
      const targetDate = daysNeeded ? new Date(now.getTime() + daysNeeded * 86400000) : null;
      return { milestone: m, daysNeeded, targetDate };
    });

    // --- Personal Records ---
    const weeklyTotals = {};
    activityDates.forEach(a => {
      const d = new Date(a.date);
      const weekKey = getWeekKey(d);
      weeklyTotals[weekKey] = (weeklyTotals[weekKey] || 0) + a.problemsSolved;
    });
    const bestWeek = Object.entries(weeklyTotals).reduce(
      (best, [key, count]) => count > best.count ? { key, count } : best,
      { key: null, count: 0 }
    );
    const bestDay = activityDates.reduce(
      (best, a) => a.problemsSolved > best.count ? { date: a.date, count: a.problemsSolved } : best,
      { date: null, count: 0 }
    );

    return {
      total, easy, medium, hard,
      easyPct, medPct, hardPct,
      accountAgeDays, problemsPerDay,
      totalSubmissions, totalActiveDays,
      thisWeekActivity,
      weeklyData, weeklyAvg, velocityTrend,
      recentHardPct, olderHardPct, difficultyShift, recentTotal, olderTotal,
      activeDaysThisMonth, dayOfMonth, activeRatio,
      consistencyGrade, consistencyColor, avgGap,
      dayStats, maxDayTotal, bestDayOfWeek,
      projections, recentDailyRate,
      bestWeek, bestDay,
      longestStreak: user.longestStreak || 0,
      currentStreak: user.currentStreak || 0,
    };
  }, [user]);

  const maxWeekly = Math.max(...analytics.weeklyData.map(w => w.count), 1);

  const weeklyProgress = weeklyGoal?.current || 0;
  const weeklyTarget = weeklyGoal?.target || 5;
  const weeklyPct = Math.min(100, Math.round((weeklyProgress / weeklyTarget) * 100));

  // SVG donut
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const easyArc = (analytics.easyPct / 100) * circumference;
  const medArc = (analytics.medPct / 100) * circumference;
  const hardArc = (analytics.hardPct / 100) * circumference;
  const gap = analytics.total === 0 ? 0 : 4;

  return (
    <div className="analytics-tab">

      {/* === Solved Problems (LeetCode-style) === */}
      <div className="solved-hero">
        <div className="solved-donut-section">
          <div className="solved-donut">
            <svg viewBox="0 0 180 180" className="donut-svg">
              <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
              {analytics.total > 0 && (
                <>
                  <circle
                    cx="90" cy="90" r={radius}
                    fill="none" stroke="#22c55e" strokeWidth="10"
                    strokeDasharray={`${easyArc - gap} ${circumference - easyArc + gap}`}
                    strokeDashoffset={circumference * 0.25}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="90" cy="90" r={radius}
                    fill="none" stroke="#eab308" strokeWidth="10"
                    strokeDasharray={`${medArc - gap} ${circumference - medArc + gap}`}
                    strokeDashoffset={circumference * 0.25 - easyArc}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="90" cy="90" r={radius}
                    fill="none" stroke="#ef4444" strokeWidth="10"
                    strokeDasharray={`${hardArc - gap} ${circumference - hardArc + gap}`}
                    strokeDashoffset={circumference * 0.25 - easyArc - medArc}
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
            <div className="donut-center">
              <span className="donut-total">{analytics.total}</span>
              <span className="donut-label">Solved</span>
            </div>
          </div>
          <div className="solved-breakdown">
            <div className="solved-diff-row">
              <span className="solved-diff-dot" style={{ background: '#22c55e' }} />
              <span className="solved-diff-name">Easy</span>
              <strong className="solved-diff-count" style={{ color: 'var(--diff-easy)' }}>{analytics.easy}</strong>
            </div>
            <div className="solved-diff-row">
              <span className="solved-diff-dot" style={{ background: '#eab308' }} />
              <span className="solved-diff-name">Medium</span>
              <strong className="solved-diff-count" style={{ color: 'var(--diff-medium)' }}>{analytics.medium}</strong>
            </div>
            <div className="solved-diff-row">
              <span className="solved-diff-dot" style={{ background: '#ef4444' }} />
              <span className="solved-diff-name">Hard</span>
              <strong className="solved-diff-count" style={{ color: 'var(--diff-hard)' }}>{analytics.hard}</strong>
            </div>
          </div>
        </div>

        <div className="solved-stats-col">
          <div className="solved-stat-item">
            <Flame size={18} style={{ color: '#FF6B35' }} />
            <div>
              <strong>{analytics.currentStreak}</strong>
              <span>current streak</span>
            </div>
          </div>
          <div className="solved-stat-item">
            <Zap size={18} />
            <div>
              <strong>{analytics.longestStreak}</strong>
              <span>longest streak</span>
            </div>
          </div>
          <div className="solved-stat-item">
            <Calendar size={18} />
            <div>
              <strong>{analytics.totalActiveDays}</strong>
              <span>active days</span>
            </div>
          </div>
          <div className="solved-stat-item">
            <TrendingUp size={18} />
            <div>
              <strong>{analytics.problemsPerDay.toFixed(1)}</strong>
              <span>problems / day</span>
            </div>
          </div>
        </div>
      </div>

      {/* === Activity Heatmap === */}
      <div className="section-card">
        <div className="heatmap-header">
          <h2 className="section-title" style={{ margin: 0 }}>
            <strong>{analytics.totalSubmissions}</strong> submissions this year
          </h2>
          <div className="heatmap-header-stats">
            <span>Active days: <strong>{analytics.totalActiveDays}</strong></span>
            <span>Max streak: <strong>{analytics.longestStreak}</strong></span>
          </div>
        </div>
        <ActivityHeatmap activityDates={user.activityDates || []} />
      </div>

      {/* === This Week + Weekly Goal === */}
      <div className="analytics-two-col">
        <div className="section-card">
          <h2 className="section-title"><Calendar size={18} /> This Week</h2>
          <div className="week-grid">
            {analytics.thisWeekActivity.map(({ day, solved, active }) => (
              <div key={day} className={`week-day ${active ? 'active' : ''}`}>
                <div className="week-day-name">{day}</div>
                <div className="week-day-circle">{active ? '✓' : ''}</div>
                <div className="week-day-count">{solved > 0 ? solved : '-'}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="section-card">
          <h2 className="section-title">
            <Target size={18} /> Weekly Goal
            {onToggleEditGoal && (
              <button className="link-button" style={{ marginLeft: 'auto', fontSize: '12px' }} onClick={onToggleEditGoal}>
                {editingGoal ? 'Cancel' : 'Edit'}
              </button>
            )}
          </h2>
          {editingGoal ? (
            <div className="goal-edit-inline">
              <input
                type="number"
                className="pixel-input"
                value={weeklyGoalTarget}
                onChange={(e) => onGoalTargetChange(Number(e.target.value))}
                min="1" max="50"
                style={{ width: '80px' }}
              />
              <span>problems / week</span>
              <button className="pixel-button primary" onClick={onSaveGoal}>Save</button>
            </div>
          ) : (
            <>
              <div className="weekly-goal-ring-wrap">
                <svg viewBox="0 0 120 120" className="goal-ring-svg">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke={weeklyPct >= 100 ? '#22c55e' : '#3b82f6'}
                    strokeWidth="8"
                    strokeDasharray={`${(weeklyPct / 100) * 314} 314`}
                    strokeDashoffset={314 * 0.25}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="goal-ring-center">
                  <strong>{weeklyProgress}</strong>
                  <span>/ {weeklyTarget}</span>
                </div>
              </div>
              <div className="goal-status-text">
                {weeklyPct >= 100
                  ? <span style={{ color: 'var(--diff-easy)', fontWeight: 600 }}>Goal achieved!</span>
                  : <span>{weeklyTarget - weeklyProgress} more to go</span>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* === Weekly Activity Chart === */}
      <div className="section-card">
        <h2 className="section-title">
          <BarChart3 size={18} /> Weekly Activity
          <span className="analytics-trend-pill" data-trend={analytics.velocityTrend}>
            {analytics.velocityTrend === 'improving' && <><TrendingUp size={13} /> up</>}
            {analytics.velocityTrend === 'declining' && <><TrendingDown size={13} /> down</>}
            {analytics.velocityTrend === 'steady' && <><Minus size={13} /> steady</>}
          </span>
        </h2>
        <div className="analytics-bar-chart">
          {analytics.weeklyData.map((week, i) => (
            <div key={i} className="analytics-bar-col">
              <div className="analytics-bar-value">{week.count || ''}</div>
              <div className="analytics-bar-track">
                <div
                  className="analytics-bar-fill"
                  style={{ height: `${(week.count / maxWeekly) * 100}%` }}
                />
              </div>
              <div className="analytics-bar-label">{week.label}</div>
            </div>
          ))}
        </div>
        <p className="analytics-small-stat">
          Avg: <strong>{analytics.weeklyAvg.toFixed(1)}</strong> / week
        </p>
      </div>

      {/* === Consistency + Difficulty Trend === */}
      <div className="analytics-two-col">
        <div className="section-card">
          <h2 className="section-title"><Activity size={18} /> Consistency</h2>
          <div className="analytics-consistency-grid">
            <div className="analytics-consistency-grade" style={{ color: analytics.consistencyColor }}>
              {analytics.consistencyGrade}
            </div>
            <div className="analytics-consistency-details">
              <div className="analytics-consistency-row">
                <Calendar size={14} />
                <span>Active days</span>
                <strong>{analytics.activeDaysThisMonth} / {analytics.dayOfMonth}</strong>
              </div>
              <div className="analytics-consistency-row">
                <Clock size={14} />
                <span>Avg gap</span>
                <strong>{analytics.avgGap === 0 ? 'none' : `${analytics.avgGap}d`}</strong>
              </div>
              <div className="analytics-consistency-row">
                <Flame size={14} />
                <span>Current streak</span>
                <strong>{analytics.currentStreak}d</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="section-card">
          <h2 className="section-title"><TrendingUp size={18} /> Difficulty Trend</h2>
          <div className="analytics-diff-trend">
            <div className="analytics-diff-trend-comparison">
              <div className="analytics-diff-period">
                <span className="analytics-diff-period-label">Last 30d</span>
                <span className="analytics-diff-period-value">{analytics.recentHardPct}%</span>
                <span className="analytics-diff-period-sub">med + hard</span>
              </div>
              <div className="analytics-diff-arrow">
                {analytics.difficultyShift > 3
                  ? <TrendingUp size={20} style={{ color: 'var(--diff-easy)' }} />
                  : analytics.difficultyShift < -3
                    ? <TrendingDown size={20} style={{ color: 'var(--diff-hard)' }} />
                    : <Minus size={20} style={{ color: 'var(--text-tertiary)' }} />}
              </div>
              <div className="analytics-diff-period">
                <span className="analytics-diff-period-label">Prior 30d</span>
                <span className="analytics-diff-period-value">{analytics.olderHardPct}%</span>
                <span className="analytics-diff-period-sub">med + hard</span>
              </div>
            </div>
            <p className="analytics-diff-insight">
              {analytics.recentTotal === 0
                ? 'No recent activity to compare.'
                : analytics.olderTotal === 0
                  ? 'Not enough history for a trend.'
                  : analytics.difficultyShift > 5
                    ? 'Pushing harder problems lately.'
                    : analytics.difficultyShift < -5
                      ? 'More easy problems recently.'
                      : 'Difficulty level is steady.'}
            </p>
          </div>
        </div>
      </div>

      {/* === Best Days to Code === */}
      <div className="section-card">
        <h2 className="section-title"><Calendar size={18} /> Most Productive Days</h2>
        <div className="analytics-day-chart">
          {analytics.dayStats.map((d) => (
            <div key={d.name} className={`analytics-day-col ${d.name === analytics.bestDayOfWeek.name ? 'best' : ''}`}>
              <div className="analytics-day-bar-track">
                <div
                  className="analytics-day-bar-fill"
                  style={{ height: `${(d.total / analytics.maxDayTotal) * 100}%` }}
                />
              </div>
              <div className="analytics-day-label">{d.name}</div>
              <div className="analytics-day-count">{d.total}</div>
            </div>
          ))}
        </div>
      </div>

      {/* === Milestones + Records === */}
      <div className="analytics-two-col">
        {analytics.projections.length > 0 && (
          <div className="section-card">
            <h2 className="section-title"><Rocket size={18} /> Next Milestones</h2>
            <div className="analytics-projections">
              {analytics.projections.slice(0, 3).map(({ milestone, daysNeeded, targetDate }) => (
                <div key={milestone} className="analytics-projection-row">
                  <div className="analytics-milestone">
                    <Target size={14} />
                    <strong>{milestone}</strong> problems
                  </div>
                  <div className="analytics-projection-date">
                    {daysNeeded
                      ? <>
                          <span className="analytics-days-away">~{daysNeeded}d</span>
                          <span className="analytics-target-date">
                            {targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        </>
                      : <span className="analytics-target-date">--</span>
                    }
                  </div>
                </div>
              ))}
            </div>
            <p className="analytics-small-stat">
              Based on ~{analytics.recentDailyRate.toFixed(1)} problems/day
            </p>
          </div>
        )}

        <div className="section-card">
          <h2 className="section-title"><Award size={18} /> Personal Records</h2>
          <div className="analytics-records">
            <div className="analytics-record">
              <Zap size={18} />
              <div>
                <strong>{analytics.bestDay.count}</strong>
                <span>best day{analytics.bestDay.date ? ` (${formatShortDate(analytics.bestDay.date)})` : ''}</span>
              </div>
            </div>
            <div className="analytics-record">
              <BarChart3 size={18} />
              <div>
                <strong>{analytics.bestWeek.count}</strong>
                <span>best week</span>
              </div>
            </div>
            <div className="analytics-record">
              <Flame size={18} style={{ color: '#FF6B35' }} />
              <div>
                <strong>{analytics.longestStreak}d</strong>
                <span>longest streak</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Utility functions ---

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatWeekLabel(date) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return toDateStr(d);
}

function daysBetween(dateStr1, dateStr2) {
  return Math.round(Math.abs(new Date(dateStr2) - new Date(dateStr1)) / 86400000);
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
