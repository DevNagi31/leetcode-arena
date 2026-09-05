import { useCallback, useEffect, useRef } from 'react';

/**
 * Everything a modal needs to be usable without a mouse.
 *
 * The dialogs in this app previously left focus on the button behind them, so
 * Tab walked the page underneath instead of the dialog, Escape did nothing,
 * and screen readers were never told a dialog had opened. This supplies all of
 * it in one place:
 *
 *   - moves focus into the dialog on open
 *   - traps Tab inside it (WCAG 2.1.2, No Keyboard Trap, requires a way out —
 *     Escape and the close button provide it)
 *   - restores focus to whatever opened it on close
 *   - closes on Escape
 *   - locks background scroll, refcounted so nested dialogs behave
 *
 * Usage:
 *   const dialog = useDialog({ onClose, label: 'Edit profile' });
 *   <div {...dialog.props}> ... </div>
 */

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Nested dialogs (the photo lightbox opens over the solution viewer), so the
// lock is counted rather than a boolean.
let lockCount = 0;
let previousOverflow = '';

function lockScroll() {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = previousOverflow;
}

export default function useDialog({ onClose, label, labelledBy } = {}) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const focusables = useCallback(
    () => Array.from(ref.current?.querySelectorAll(FOCUSABLE) || [])
      .filter((el) => el.offsetParent !== null || el === document.activeElement),
    []
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    // Remember where focus came from so it can be handed back.
    const opener = document.activeElement;

    lockScroll();

    // Focus the dialog itself rather than its first control. Screen readers
    // then announce the dialog and its name, Tab reaches the first control
    // immediately, and we avoid dumping focus onto whatever happens to be
    // first — which in the solution viewer is a link that navigates away.
    node.focus({ preventScroll: true });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];

      // Wrap at both ends, and pull focus back in if it has escaped.
      if (e.shiftKey && (document.activeElement === firstEl || !node.contains(document.activeElement))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (document.activeElement === lastEl || !node.contains(document.activeElement))) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    node.addEventListener('keydown', onKeyDown);

    return () => {
      node.removeEventListener('keydown', onKeyDown);
      unlockScroll();

      // Hand focus back to whatever opened the dialog, otherwise it falls to
      // <body> and the next Tab restarts from the top of the page.
      //
      // By cleanup time the dialog is already detached, so the active element
      // is usually <body> — checking `node.contains(active)` alone therefore
      // never matched. Restore whenever focus was lost, and leave it alone
      // only if something outside deliberately took it.
      const active = document.activeElement;
      const focusWasLost = !active || active === document.body || node.contains(active);
      if (focusWasLost && opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus({ preventScroll: true });
      }
    };
  }, [focusables]);

  return {
    ref,
    props: {
      ref,
      role: 'dialog',
      'aria-modal': 'true',
      ...(labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': label }),
      tabIndex: -1,
    },
  };
}
