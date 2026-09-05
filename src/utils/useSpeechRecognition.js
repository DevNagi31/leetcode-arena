import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Dictation via the browser's built-in SpeechRecognition.
 *
 * Runs entirely in the browser: no API key, no per-minute cost, and the audio
 * never touches our server — which is also why it scales for free. The
 * trade-off is coverage (Chrome, Edge and Safari; not Firefox) and shakier
 * accuracy on jargon like "memoization" or "O(n log n)", so the transcript is
 * always handed back for review rather than saved directly.
 *
 * `onResult(text)` fires with each finalised phrase. Interim words are exposed
 * separately as `interim` so the UI can show speech landing live without
 * committing it.
 */

const SpeechRecognition =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export const isSpeechSupported = Boolean(SpeechRecognition);

export default function useSpeechRecognition({ onResult, lang = 'en-US' } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  // Distinguishes a user-initiated stop from the engine timing out on silence.
  const wantsToListenRef = useRef(false);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onResultRef.current?.(text);
        } else {
          pending += result[0].transcript;
        }
      }
      setInterim(pending);
    };

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are routine, not worth alarming anyone over.
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked. Allow it in your browser settings to dictate.'
          : `Dictation stopped: ${event.error}`
      );
      wantsToListenRef.current = false;
      setListening(false);
    };

    recognition.onend = () => {
      // Chrome ends the session after a stretch of silence even in continuous
      // mode; restart so a pause mid-thought doesn't end dictation.
      if (wantsToListenRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          /* already restarting — fall through and stop */
        }
      }
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;

    return () => {
      wantsToListenRef.current = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.stop(); } catch { /* never started */ }
    };
  }, [lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || wantsToListenRef.current) return;
    setError(null);
    setInterim('');
    wantsToListenRef.current = true;
    try {
      recognition.start();
      setListening(true);
    } catch {
      wantsToListenRef.current = false;
    }
  }, []);

  const stop = useCallback(() => {
    wantsToListenRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* not running */ }
    setListening(false);
    setInterim('');
  }, []);

  const toggle = useCallback(() => {
    if (wantsToListenRef.current) stop();
    else start();
  }, [start, stop]);

  return { supported: isSpeechSupported, listening, interim, error, start, stop, toggle };
}
