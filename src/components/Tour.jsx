import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * A first-run product tour: dims the page, spotlights one element at a time,
 * and explains it in an anchored tooltip.
 *
 * Steps are `{ selector, title, body }`. A step whose selector matches nothing
 * is skipped rather than rendered against a zero-size box, so the tour stays
 * usable if the UI changes underneath it.
 */

const PAD = 8;          // breathing room around the spotlit element
const GAP = 14;         // spotlight-to-tooltip distance
const TOOLTIP_W = 300;
const MOBILE_MAX = 640; // below this the tooltip docks to the bottom instead

export default function Tour({ steps, onClose }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [tipPos, setTipPos] = useState(null);
  const tipRef = useRef(null);

  const step = steps[index];
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX;

  // 'completed'  — reached the end, or dismissed on purpose
  // 'unavailable' — nothing left to point at; don't burn the user's one
  //                 showing on a tour they never actually saw
  const finish = useCallback((reason = 'completed') => onClose(reason), [onClose]);

  const goTo = useCallback((next, reason = 'completed') => {
    if (next < 0) return;
    if (next >= steps.length) return finish(reason);
    setIndex(next);
  }, [steps.length, finish]);

  // Measure the current target. Re-runs on resize/scroll so the spotlight
  // tracks the element rather than drifting away from it.
  useLayoutEffect(() => {
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(step.selector);
      if (!el) {
        // Nothing to point at — don't render an empty box, just move on.
        // If every remaining step is missing the tour ends as 'unavailable',
        // so it can be shown again rather than being marked as seen.
        setRect(null);
        goTo(index + 1, 'unavailable');
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    // Horizontally scrollable tab strips can park the target off-screen.
    const el = document.querySelector(step.selector);
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'center' });

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step.selector, index, goTo]);

  // Place the tooltip once its real height is known: below the target when
  // there's room, above when there isn't, clamped to the viewport.
  useLayoutEffect(() => {
    if (!rect || isMobile) return;
    const h = tipRef.current?.offsetHeight || 160;
    const below = rect.top + rect.height + PAD + GAP;
    const above = rect.top - PAD - GAP - h;
    const top = below + h <= window.innerHeight - 12 || above < 12 ? below : above;
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - TOOLTIP_W / 2),
      window.innerWidth - TOOLTIP_W - 12
    );
    setTipPos({ top, left });
  }, [rect, isMobile, index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, goTo, finish]);

  if (!rect) return null;

  const isLast = index === steps.length - 1;

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label={`Walkthrough step ${index + 1} of ${steps.length}`}>
      {/* Swallows clicks so the app underneath can't be operated mid-tour. */}
      <div className="tour-overlay" onClick={() => finish()} />

      <div
        className="tour-spotlight"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
        }}
      />

      <div
        ref={tipRef}
        className={`tour-tip ${isMobile ? 'tour-tip-docked' : ''}`}
        style={isMobile ? undefined : { top: tipPos?.top ?? 0, left: tipPos?.left ?? 0 }}
      >
        <button className="tour-close" onClick={() => finish()} aria-label="Close walkthrough">
          <X size={15} />
        </button>

        <h4 className="tour-title">{step.title}</h4>
        <p className="tour-body">{step.body}</p>

        <div className="tour-footer">
          <div className="tour-dots" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.selector} className={`tour-dot ${i === index ? 'active' : ''}`} />
            ))}
          </div>

          <div className="tour-actions">
            {index > 0 && (
              <button className="tour-btn" onClick={() => goTo(index - 1)}>
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button className="tour-btn tour-btn-primary" onClick={() => goTo(index + 1)}>
              {isLast ? 'Done' : <>Next <ChevronRight size={14} /></>}
            </button>
          </div>
        </div>

        {!isLast && (
          <button className="tour-skip" onClick={() => finish()}>Skip walkthrough</button>
        )}
      </div>
    </div>
  );
}
