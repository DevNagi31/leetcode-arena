import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Code, Search, ChevronDown, Trash2, Edit3, Eye, ExternalLink, Star, X, Clock, Cpu, CheckCircle2, RefreshCw, Camera, Mic, MicOff, ImageIcon, Loader2 } from 'lucide-react';
import { CardSkeleton } from './LoadingSkeleton';
import { authGet, authPost, authPut, authDelete } from '../utils/api';
import { compressImage, formatBytes, MAX_IMAGES } from '../utils/image';
import useSpeechRecognition from '../utils/useSpeechRecognition';
import useDialog from '../utils/useDialog';
import ConfirmDialog from './ConfirmDialog';

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++', 'C', 'Go', 'Rust', 'TypeScript', 'Ruby', 'Swift', 'Kotlin', 'Other'];
const RATING_LABELS = ['', 'Trivial', 'Easy', 'Medium', 'Hard', 'Brutal'];

/**
 * Wrapper that gives any of this file's modals focus management, Escape, a
 * focus trap and a scroll lock. Kept as a component because hooks can't be
 * called conditionally, and these render behind `&&` guards.
 */
function Dialog({ onClose, label, labelledBy, className, overlayClass = 'modal-overlay', children }) {
  const dialog = useDialog({ onClose, label, labelledBy });
  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={className} onClick={(e) => e.stopPropagation()} {...dialog.props}>
        {children}
      </div>
    </div>
  );
}

function RatingStars({ value, onChange }) {
  // Read-only stars are a picture of a value, not controls. Rendering them as
  // buttons put six unnamed, focusable elements in front of keyboard users on
  // every card. Interactive stars stay buttons, and get real names.
  const readOnly = !onChange;

  if (readOnly) {
    return (
      <div className="solutions-rating" role="img"
        aria-label={`Difficulty ${value} out of 5${RATING_LABELS[value] ? ` — ${RATING_LABELS[value]}` : ''}`}>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`solutions-star ${i <= value ? 'active' : ''}`} aria-hidden="true">
            <Star size={16} fill={i <= value ? 'currentColor' : 'none'} />
          </span>
        ))}
        <span className="solutions-rating-label">{RATING_LABELS[value] || ''}</span>
      </div>
    );
  }

  return (
    <div className="solutions-rating" role="radiogroup" aria-label="How hard was it for you?">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={i === value}
          aria-label={`${i} out of 5${RATING_LABELS[i] ? ` — ${RATING_LABELS[i]}` : ''}`}
          className={`solutions-star ${i <= value ? 'active' : ''}`}
          onClick={() => onChange(i)}
          style={{ cursor: 'pointer' }}
        >
          <Star size={16} fill={i <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
      <span className="solutions-rating-label">{RATING_LABELS[value] || ''}</span>
    </div>
  );
}

export default function MySolutionsTab({ showToast, user }) {
  const [section, setSection] = useState('solved');
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [solvedLoading, setSolvedLoading] = useState(false);
  const [solvedLoaded, setSolvedLoaded] = useState(false);
  const [solvedError, setSolvedError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingSolution, setViewingSolution] = useState(null);
  // Which pane is showing on phones, where the two can't sit side by side.
  // Defaults to the solution: that's what you opened the card to see, and the
  // problem is one tap away.
  const [viewPane, setViewPane] = useState('solution');
  const [splitPct, setSplitPct] = useState(() => {
    const saved = Number(localStorage.getItem('solutionSplitPct'));
    return saved >= 25 && saved <= 75 ? saved : 45;
  });
  const splitRef = useRef(null);
  const [problemInput, setProblemInput] = useState('');
  const [fetchingProblem, setFetchingProblem] = useState(false);
  const [problemData, setProblemData] = useState(null);
  const [editingSnippetId, setEditingSnippetId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [solutionData, setSolutionData] = useState({
    code: '',
    language: 'Python',
    runtime: '',
    memory: '',
    notes: '',
    personalRating: 3
  });
  // Photos of handwritten notes. Existing ones carry only an _id (the bytes
  // stay on the server); newly added ones carry base64 `data`.
  const [photos, setPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [viewingPhotos, setViewingPhotos] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const fileInputRef = useRef(null);

  // Dictated phrases are appended to the notes field so they can be corrected
  // before saving — the browser's recogniser is unreliable on jargon.
  const appendDictation = useCallback((text) => {
    setSolutionData((prev) => {
      const sep = !prev.notes || /\s$/.test(prev.notes) ? '' : ' ';
      return { ...prev, notes: `${prev.notes}${sep}${text} ` };
    });
  }, []);

  const speech = useSpeechRecognition({ onResult: appendDictation });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSolutions(); }, []);

  useEffect(() => {
    if (section === 'solved' && !solvedLoaded && !solvedLoading) fetchSolved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const fetchSolved = async () => {
    setSolvedLoading(true);
    setSolvedError(null);
    try {
      const res = await authGet('/leetcode/solved?limit=20');
      setSolvedProblems(res.data.problems || []);
      setSolvedLoaded(true);
    } catch (e) {
      const msg = e.response?.status === 404
        ? 'No LeetCode username on your account'
        : 'Could not load problems from LeetCode';
      setSolvedError(msg);
    } finally {
      setSolvedLoading(false);
    }
  };

  const handleAddFromSolved = async (problem) => {
    resetForm();
    setProblemInput(`https://leetcode.com/problems/${problem.titleSlug}/`);
    setShowModal(true);
    setFetchingProblem(true);
    try {
      const response = await authPost('/leetcode/problem', { titleSlug: problem.titleSlug });
      setProblemData(response.data);
    } catch (error) {
      showToast('Could not load problem details', 'error');
    } finally {
      setFetchingProblem(false);
    }
  };

  const formatRelative = (timestamp) => {
    const ts = parseInt(timestamp, 10);
    if (!ts) return '';
    const diffSec = Math.max(0, Math.floor(Date.now() / 1000 - ts));
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}d ago`;
    return `${Math.floor(diffSec / 2592000)}mo ago`;
  };

  const solvedSlugSet = new Set(solutions.flatMap(s => {
    const slugs = [];
    if (s.snippet?.link) {
      const m = s.snippet.link.match(/leetcode\.com\/problems\/([^/]+)/);
      if (m) slugs.push(m[1]);
    }
    return slugs;
  }));

  const fetchSolutions = async () => {
    try {
      const [snippetsRes, notesRes] = await Promise.all([
        authGet('/snippets'),
        authGet('/notes')
      ]);
      const snippets = snippetsRes.data.snippets || snippetsRes.data || [];
      const notes = notesRes.data.notes || notesRes.data || [];

      // Both lists arrive newest-first. Keep the first entry seen for each
      // problem — assigning unconditionally meant the OLDEST record won, so a
      // newer note (and anything attached to it) silently disappeared.
      const combined = {};
      snippets.forEach(s => {
        if (!combined[s.problemName]) combined[s.problemName] = {};
        if (!combined[s.problemName].snippet) combined[s.problemName].snippet = s;
      });
      notes.forEach(n => {
        if (!combined[n.problemName]) combined[n.problemName] = {};
        if (!combined[n.problemName].note) combined[n.problemName].note = n;
      });

      setSolutions(Object.entries(combined).map(([name, data]) => ({
        problemName: name,
        ...data,
        difficulty: data.snippet?.difficulty || data.note?.difficulty,
        topics: data.snippet?.topics || data.note?.topics || []
      })));
    } catch (e) {
      const status = e.response?.status;
      const msg = status === 401 ? 'Session expired — please log in again'
        : status ? `Failed to load solutions (${status})`
        : 'Network error loading solutions';
      showToast(msg, 'error');
    } finally { setLoading(false); }
  };

  const extractTitleSlug = (input) => {
    const urlMatch = input.match(/leetcode\.com\/problems\/([^/]+)/);
    if (urlMatch) return urlMatch[1];
    // Slugify a typed title the way LeetCode does: drop punctuation, then
    // hyphenate. Leaving punctuation in produced slugs the API always 404s on.
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const handleFetchProblem = async () => {
    if (!problemInput.trim()) return;
    setFetchingProblem(true);
    try {
      const titleSlug = extractTitleSlug(problemInput);
      const response = await authPost('/leetcode/problem', { titleSlug });
      setProblemData(response.data);

      // If this problem is already saved, edit that record rather than adding
      // a second one. Duplicates were being created silently, and only one of
      // them was ever visible in the list.
      const existing = solutions.find((s) => s.problemName === response.data.title);
      if (existing) {
        await loadIntoForm(existing);
        showToast('You already saved this one — loaded it for editing.', 'info');
      } else {
        showToast('Problem loaded!', 'success');
      }
    } catch (error) {
      showToast('Problem not found', 'error');
      setProblemData(null);
    } finally {
      setFetchingProblem(false);
    }
  };

  const handleSaveSolution = async () => {
    if (!problemData) return;
    if (!solutionData.code.trim() && !solutionData.notes.trim() && photos.length === 0) {
      showToast('Add some code, notes or a photo before saving', 'error');
      return;
    }
    const topics = (problemData.topicTags || []).map(t => t.name);
    try {
      if (solutionData.code.trim()) {
        const snippetData = {
          problemName: problemData.title,
          difficulty: problemData.difficulty,
          language: solutionData.language,
          code: solutionData.code,
          runtime: solutionData.runtime,
          memory: solutionData.memory,
          topics,
          link: `https://leetcode.com/problems/${problemData.titleSlug}/`
        };
        if (editingSnippetId) {
          await authPut(`/snippets/${editingSnippetId}`, snippetData);
        } else {
          await authPost('/snippets', snippetData);
        }
      }

      // A note is worth saving if it has text OR photos.
      if (solutionData.notes.trim() || photos.length > 0) {
        const noteData = {
          problemName: problemData.title,
          difficulty: problemData.difficulty,
          // The model requires content, so a photo-only note gets a stand-in.
          content: solutionData.notes.trim() || '(handwritten notes attached)',
          personalRating: solutionData.personalRating,
          topics,
          // Existing photos go back as bare ids so their bytes aren't re-sent.
          images: photos.map((p) => (p._id ? { _id: p._id } : p))
        };
        if (editingNoteId) {
          await authPut(`/notes/${editingNoteId}`, noteData);
        } else {
          await authPost('/notes', noteData);
        }
      }

      showToast(editingSnippetId || editingNoteId ? 'Solution updated!' : 'Solution saved!', 'success');
      setShowModal(false);
      resetForm();
      fetchSolutions();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to save', 'error');
    }
  };

  const handleView = async (solution) => {
    setViewingPhotos([]);
    if (solution.note?._id && solution.note.images?.length) {
      authGet(`/notes/${solution.note._id}/images`)
        .then((res) => setViewingPhotos(res.data.images || []))
        .catch(() => setViewingPhotos([]));
    }
    try {
      const titleSlug = solution.snippet?.link
        ? extractTitleSlug(solution.snippet.link)
        : extractTitleSlug(solution.problemName);
      const response = await authPost('/leetcode/problem', { titleSlug });
      setViewingSolution({ ...solution, problemDetails: response.data });
    } catch (error) {
      setViewingSolution(solution);
    }
    setViewPane(solution.snippet || solution.note ? 'solution' : 'problem');
    setShowViewModal(true);
  };

  /** Populate the form from an existing saved solution. */
  const loadIntoForm = async (solution) => {
    setSolutionData({
      code: solution.snippet?.code || '',
      language: solution.snippet?.language || 'Python',
      runtime: solution.snippet?.runtime || '',
      memory: solution.snippet?.memory || '',
      notes: solution.note?.content || '',
      personalRating: solution.note?.personalRating || 3
    });
    setEditingSnippetId(solution.snippet?._id || null);
    setEditingNoteId(solution.note?._id || null);

    // Carry existing photos as ids only — enough to render thumbnails and to
    // tell the server to keep them, without shipping the bytes both ways.
    if (solution.note?._id && solution.note.images?.length) {
      try {
        const res = await authGet(`/notes/${solution.note._id}/images`);
        setPhotos(res.data.images || []);
      } catch {
        setPhotos([]);
      }
    } else {
      setPhotos([]);
    }
  };

  const handleEdit = async (solution) => {
    try {
      const titleSlug = solution.snippet?.link ?
        extractTitleSlug(solution.snippet.link) :
        extractTitleSlug(solution.problemName);
      const response = await authPost('/leetcode/problem', { titleSlug });
      setProblemData(response.data);
    } catch (error) {
      showToast('Could not load problem details', 'error');
      return;
    }

    await loadIntoForm(solution);
    setShowModal(true);
  };

  const handleDelete = async (solution) => {
    try {
      if (solution.snippet) {
        await authDelete(`/snippets/${solution.snippet._id}`);
      }
      if (solution.note) {
        await authDelete(`/notes/${solution.note._id}`);
      }
      showToast('Solution deleted', 'info');
      fetchSolutions();
    } catch (e) {
      showToast('Failed to delete', 'error');
    } finally {
      setPendingDelete(null);
    }
  };

  const handleAddPhotos = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';            // let the same file be picked again
    if (files.length === 0) return;

    const room = MAX_IMAGES - photos.length;
    if (room <= 0) {
      setPhotoError(`You can attach at most ${MAX_IMAGES} photos.`);
      return;
    }

    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const added = [];
      for (const file of files.slice(0, room)) {
        try {
          added.push(await compressImage(file));
        } catch (e) {
          setPhotoError(e.message);
        }
      }
      if (added.length) setPhotos((prev) => [...prev, ...added]);
      if (files.length > room) {
        setPhotoError(`Only the first ${room} photo${room === 1 ? '' : 's'} were added — the limit is ${MAX_IMAGES}.`);
      }
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = (idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  /**
   * Drag the divider between the two panes. Code lines vary wildly in length,
   * so a fixed split is wrong for someone as often as it's right; the chosen
   * ratio is remembered.
   */
  const startDrag = (e) => {
    const container = splitRef.current;
    if (!container) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();

    const onMove = (ev) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(75, Math.max(25, pct)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      setSplitPct((pct) => {
        try { localStorage.setItem('solutionSplitPct', String(Math.round(pct))); } catch { /* private mode */ }
        return pct;
      });
    };

    // Without this the drag selects the problem text as it passes over it.
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const photoSrc = (p) => (p.data ? `data:${p.mimeType};base64,${p.data}` : p.src);

  /**
   * LeetCode's problem HTML ships <pre> example blocks that overflow. A
   * scrollable region that can't be focused is unreachable by keyboard, so
   * give each one a tab stop once the sanitized markup is in the DOM.
   */
  const makeScrollablesFocusable = useCallback((node) => {
    if (!node) return;
    node.querySelectorAll('pre, table').forEach((el) => {
      if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) {
        el.setAttribute('tabindex', '0');
        if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'Example, scrollable');
      }
    });
  }, []);

  const resetForm = () => {
    setProblemInput('');
    setProblemData(null);
    setEditingSnippetId(null);
    setEditingNoteId(null);
    setSolutionData({ code: '', language: 'Python', runtime: '', memory: '', notes: '', personalRating: 3 });
    setPhotos([]);
    setPhotoError(null);
    speech.stop();
  };

  const filteredSolutions = solutions.filter(sol => {
    if (filterDifficulty !== 'all' && sol.difficulty?.toLowerCase() !== filterDifficulty) return false;
    if (filterText && !sol.problemName.toLowerCase().includes(filterText.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="solutions-tab">
      {/* Sub-tabs */}
      <div className="solutions-subtabs">
        <button
          className={`solutions-subtab ${section === 'solved' ? 'active' : ''}`}
          onClick={() => setSection('solved')}
        >
          <CheckCircle2 size={14} /> Solved
          {solvedLoaded && <span className="solutions-subtab-count">{solvedProblems.length}</span>}
        </button>
        <button
          className={`solutions-subtab ${section === 'mine' ? 'active' : ''}`}
          onClick={() => setSection('mine')}
        >
          <Code size={14} /> My Solutions
          {!loading && <span className="solutions-subtab-count">{solutions.length}</span>}
        </button>
      </div>

      {section === 'solved' && (
        <div className="solutions-solved-section">
          {/* The list jumped straight from the page h1 to h4. Screen-reader
              users navigate by heading, so the outline has to be unbroken. */}
          <h2 className="sr-only">Recent accepted submissions</h2>
          <div className="solutions-solved-header">
            <div>
              <p className="solutions-solved-hint">
                Recent accepted submissions on LeetCode
                {user?.leetcodeUsername && <span className="solutions-solved-user"> · @{user.leetcodeUsername}</span>}
              </p>
              <p className="solutions-solved-note">
                LeetCode's public API only exposes recent submissions, not your full history.
              </p>
            </div>
            <button
              className="pixel-button"
              onClick={fetchSolved}
              disabled={solvedLoading}
              title="Refresh"
            >
              <RefreshCw size={14} /> {solvedLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {solvedLoading ? (
            <CardSkeleton lines={4} />
          ) : solvedError ? (
            <div className="empty-state">
              <h3>Couldn't load</h3>
              <p>{solvedError}</p>
            </div>
          ) : solvedProblems.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3>No recent submissions</h3>
              <p>Solve a problem on LeetCode and it'll show up here.</p>
            </div>
          ) : (
            <div className="solutions-solved-list">
              {solvedProblems.map((p) => {
                const hasSolution = solvedSlugSet.has(p.titleSlug);
                return (
                  <div key={p.id} className="solutions-solved-row">
                    <div className="solutions-solved-info">
                      <h3 className="solutions-solved-title">{p.title}</h3>
                      <div className="solutions-solved-meta">
                        <span className="solutions-meta-item">
                          <Clock size={12} /> {formatRelative(p.timestamp)}
                        </span>
                        <a
                          href={`https://leetcode.com/problems/${p.titleSlug}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="solutions-view-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={12} /> LeetCode
                        </a>
                      </div>
                    </div>
                    <div className="solutions-solved-actions">
                      {hasSolution ? (
                        <span className="solutions-saved-badge" title="You've already saved a solution">
                          <CheckCircle2 size={12} /> Saved
                        </span>
                      ) : (
                        <button
                          className="pixel-button primary"
                          onClick={() => handleAddFromSolved(p)}
                        >
                          + Add Solution
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {section === 'mine' && (<>
      {/* Header */}
      <h2 className="sr-only">Your saved solutions</h2>
      <div className="solutions-header">
        <div className="solutions-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search problems..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <div className="solutions-filters">
          <label className="sr-only" htmlFor="solutions-difficulty">Filter by difficulty</label>
          <select
            id="solutions-difficulty"
            name="difficulty"
            className="solutions-filter-select"
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
          >
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button className="pixel-button primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Code size={14} /> NEW SOLUTION
          </button>
        </div>
      </div>

      {/* Count */}
      {!loading && solutions.length > 0 && (
        <div className="solutions-count">
          {filteredSolutions.length} of {solutions.length} solution{solutions.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Solutions List */}
      {loading ? (
        <CardSkeleton lines={4} />
      ) : solutions.length === 0 ? (
        <div className="empty-state">
          <Code size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3>No solutions yet</h3>
          <p>Save your first solution to start building your personal library</p>
        </div>
      ) : filteredSolutions.length === 0 ? (
        <div className="empty-state">
          <Search size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h3>No matches</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="solutions-list">
          {filteredSolutions.map((sol) => (
            <div key={sol.problemName} className="solutions-card">
              <div className="solutions-card-main">
                <div className="solutions-card-info">
                  <div className="solutions-card-title-row">
                    <h3 className="solutions-card-title">{sol.problemName}</h3>
                    <span className={`difficulty-badge ${sol.difficulty?.toLowerCase()}`}>{sol.difficulty}</span>
                  </div>
                  <div className="solutions-card-meta">
                    {sol.snippet && <span className="lang-badge">{sol.snippet.language}</span>}
                    {sol.snippet?.runtime && (
                      <span className="solutions-meta-item"><Clock size={12} /> {sol.snippet.runtime}</span>
                    )}
                    {sol.snippet?.memory && (
                      <span className="solutions-meta-item"><Cpu size={12} /> {sol.snippet.memory}</span>
                    )}
                    {sol.note?.personalRating && (
                      <span className="solutions-meta-item">
                        {[...Array(sol.note.personalRating)].map((_, i) => (
                          <Star key={i} size={11} fill="currentColor" />
                        ))}
                      </span>
                    )}
                  </div>
                  {sol.topics?.length > 0 && (
                    <div className="solutions-card-topics">
                      {sol.topics.slice(0, 4).map(t => <span key={t} className="topic-tag">{t}</span>)}
                      {sol.topics.length > 4 && <span className="topic-tag">+{sol.topics.length - 4}</span>}
                    </div>
                  )}
                </div>
                <div className="solutions-card-actions">
                  <button className="solutions-action-btn" onClick={() => handleView(sol)} title="View">
                    <Eye size={16} />
                  </button>
                  <button className="solutions-action-btn" onClick={() => handleEdit(sol)} title="Edit">
                    <Edit3 size={16} />
                  </button>
                  <button className="solutions-action-btn solutions-action-danger" onClick={() => setPendingDelete(sol)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {sol.snippet && (
                <pre className="solutions-code-preview"><code>{sol.snippet.code.substring(0, 200)}{sol.snippet.code.length > 200 ? '...' : ''}</code></pre>
              )}
            </div>
          ))}
        </div>
      )}
      </>)}

      {/* Add/Edit Modal */}
      {showModal && (
        <Dialog
          onClose={() => { setShowModal(false); resetForm(); }}
          labelledBy="solution-editor-title"
          className="modal-content solutions-modal"
        >
            <div className="solutions-modal-header">
              <h2 id="solution-editor-title">{editingSnippetId || editingNoteId ? 'Edit Solution' : 'New Solution'}</h2>
              <button className="solutions-close-btn" aria-label="Close editor" onClick={() => { setShowModal(false); resetForm(); }}>
                <X size={18} />
              </button>
            </div>

            <div className="solutions-modal-body">
              {!problemData ? (
                <div className="solutions-fetch-section">
                  <p className="solutions-fetch-hint">Paste a LeetCode URL or type a problem name</p>
                  <div className="solutions-fetch-row">
                    <input
                      className="pixel-input"
                      placeholder="e.g. https://leetcode.com/problems/two-sum/"
                      value={problemInput}
                      onChange={(e) => setProblemInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFetchProblem()}
                      autoFocus
                    />
                    <button className="pixel-button primary" onClick={handleFetchProblem} disabled={fetchingProblem || !problemInput.trim()}>
                      {fetchingProblem ? 'Loading...' : 'Fetch'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="solutions-edit-layout">
                  {/* Problem description - collapsible on left */}
                  <div className="solutions-edit-problem">
                    <div className="solutions-problem-header">
                      <h3>{problemData.title}</h3>
                      <div className="solutions-problem-badges">
                        <span className={`difficulty-badge ${(problemData.difficulty || '').toLowerCase()}`}>{problemData.difficulty}</span>
                        {(problemData.topicTags || []).slice(0, 3).map(t => <span key={t.name} className="topic-tag">{t.name}</span>)}
                      </div>
                    </div>
                    <div className="solutions-problem-content"
                      ref={makeScrollablesFocusable}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(problemData.content || '') }} />
                  </div>

                  {/* Solution form on right */}
                  <div className="solutions-edit-form">
                    <div className="form-group">
                      <label htmlFor="solution-language">Language</label>
                      <select id="solution-language" name="language" className="pixel-input" value={solutionData.language}
                        onChange={(e) => setSolutionData({...solutionData, language: e.target.value})}>
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="solution-code">Your Code</label>
                      <textarea
                        id="solution-code"
                        name="code"
                        className="pixel-input solutions-code-textarea"
                        rows="12"
                        value={solutionData.code}
                        onChange={(e) => setSolutionData({...solutionData, code: e.target.value})}
                        placeholder="Paste your solution here..."
                        spellCheck={false}
                      />
                    </div>
                    <div className="solutions-perf-row">
                      <div className="form-group">
                        <label htmlFor="solution-runtime">Runtime</label>
                        <input id="solution-runtime" name="runtime" className="pixel-input" placeholder="e.g. 45ms" value={solutionData.runtime}
                          onChange={(e) => setSolutionData({...solutionData, runtime: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label htmlFor="solution-memory">Memory</label>
                        <input id="solution-memory" name="memory" className="pixel-input" placeholder="e.g. 14MB" value={solutionData.memory}
                          onChange={(e) => setSolutionData({...solutionData, memory: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-group">
                      <div className="notes-label-row">
                        <label htmlFor="solution-notes">Notes</label>
                        {speech.supported && (
                          <button
                            type="button"
                            className={`dictate-btn ${speech.listening ? 'recording' : ''}`}
                            onClick={speech.toggle}
                            aria-pressed={speech.listening}
                            title={speech.listening ? 'Stop dictating' : 'Dictate your notes'}
                          >
                            {speech.listening ? <MicOff size={13} /> : <Mic size={13} />}
                            {speech.listening ? 'Stop' : 'Dictate'}
                          </button>
                        )}
                      </div>
                      <textarea
                        id="solution-notes"
                        name="notes"
                        className="pixel-input"
                        rows="4"
                        value={solutionData.notes}
                        onChange={(e) => setSolutionData({...solutionData, notes: e.target.value})}
                        placeholder="Your approach, key insights, gotchas..."
                      />
                      {speech.listening && (
                        <div className="dictate-status">
                          <span className="dictate-pulse" aria-hidden="true" />
                          Listening — {speech.interim
                            ? <em>&ldquo;{speech.interim}&rdquo;</em>
                            : 'start speaking'}
                        </div>
                      )}
                      {speech.error && <div className="dictate-error">{speech.error}</div>}
                      {speech.supported && !speech.listening && (
                        <p className="field-hint">
                          Dictation is transcribed by your browser — check it before saving,
                          it struggles with terms like &ldquo;memoization&rdquo;.
                        </p>
                      )}
                      {!speech.supported && (
                        <p className="field-hint">
                          Dictation needs Chrome, Edge or Safari.
                        </p>
                      )}
                    </div>

                    <div className="form-group">
                      <div className="notes-label-row">
                        <label>Handwritten notes</label>
                        <span className="photo-count">{photos.length}/{MAX_IMAGES}</span>
                      </div>

                      {photos.length > 0 && (
                        <div className="photo-grid">
                          {photos.map((p, i) => (
                            <div key={p._id || `new-${i}`} className="photo-thumb">
                              <img src={photoSrc(p)} alt={`Handwritten note ${i + 1}`} />
                              <button
                                type="button"
                                className="photo-remove"
                                onClick={() => removePhoto(i)}
                                aria-label={`Remove photo ${i + 1}`}
                              >
                                <X size={12} />
                              </button>
                              {p.bytes && <span className="photo-size">{formatBytes(p.bytes)}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={handleAddPhotos}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        className="pixel-button photo-add-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoBusy || photos.length >= MAX_IMAGES}
                      >
                        {photoBusy
                          ? <><Loader2 size={14} className="spin" /> Compressing...</>
                          : <><Camera size={14} /> {photos.length ? 'Add another photo' : 'Add a photo'}</>}
                      </button>

                      {photoError && <div className="dictate-error">{photoError}</div>}
                      <p className="field-hint">
                        Snap a page of handwritten working. Photos are resized in your browser
                        before uploading.
                      </p>
                    </div>
                    <div className="form-group">
                      <label>Difficulty (how hard was it for you?)</label>
                      <RatingStars value={solutionData.personalRating} onChange={(v) => setSolutionData({...solutionData, personalRating: v})} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {problemData && (
              <div className="solutions-modal-footer">
                <button className="pixel-button" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button className="pixel-button primary" onClick={handleSaveSolution}>
                  {editingSnippetId || editingNoteId ? 'Update Solution' : 'Save Solution'}
                </button>
              </div>
            )}
        </Dialog>
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`Delete your saved solution for "${pendingDelete.problemName}"? This removes the code, notes and any photos.`}
          onConfirm={() => handleDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {lightbox && (
        <Dialog onClose={() => setLightbox(null)} label="Handwritten note, full size"
          className="photo-lightbox-inner" overlayClass="photo-lightbox">
          <button className="photo-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close photo">
            <X size={20} />
          </button>
          <img src={lightbox.src} alt="Handwritten note, full size" />
        </Dialog>
      )}

      {/* View Modal */}
      {showViewModal && viewingSolution && (
        <Dialog
          onClose={() => setShowViewModal(false)}
          labelledBy="solution-view-title"
          className="modal-content solutions-view-modal"
        >
            <div className="solutions-view-header">
              <div>
                <h2 className="solutions-view-title" id="solution-view-title">{viewingSolution.problemName}</h2>
                <div className="solutions-view-badges">
                  {viewingSolution.difficulty && (
                    <span className={`difficulty-badge ${viewingSolution.difficulty.toLowerCase()}`}>{viewingSolution.difficulty}</span>
                  )}
                  {viewingSolution.snippet && <span className="lang-badge">{viewingSolution.snippet.language}</span>}
                  {viewingSolution.snippet?.runtime && (
                    <span className="solutions-view-perf"><Clock size={12} /> {viewingSolution.snippet.runtime}</span>
                  )}
                  {viewingSolution.snippet?.memory && (
                    <span className="solutions-view-perf"><Cpu size={12} /> {viewingSolution.snippet.memory}</span>
                  )}
                  {viewingSolution.snippet?.link && (
                    <a href={viewingSolution.snippet.link} target="_blank" rel="noopener noreferrer" className="solutions-view-link">
                      <ExternalLink size={12} /> LeetCode
                    </a>
                  )}
                </div>
              </div>
              <button className="solutions-close-btn" aria-label="Close solution" onClick={() => setShowViewModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Both panes matter at once when you're recalling a solution, so
                they sit side by side. The switcher below only appears on
                phones, where they genuinely cannot both fit. */}
            <div className="solutions-view-switch" role="tablist">
              <button
                role="tab"
                aria-selected={viewPane === 'problem'}
                className={`solutions-view-tab ${viewPane === 'problem' ? 'active' : ''}`}
                onClick={() => setViewPane('problem')}
              >
                <ChevronDown size={14} /> Problem
              </button>
              <button
                role="tab"
                aria-selected={viewPane === 'solution'}
                className={`solutions-view-tab ${viewPane === 'solution' ? 'active' : ''}`}
                onClick={() => setViewPane('solution')}
              >
                <Code size={14} /> Your solution
              </button>
            </div>

            <div
              className="solutions-split"
              ref={splitRef}
              style={{ '--split': `${splitPct}%` }}
            >
              <section
                className={`split-pane ${viewPane === 'problem' ? 'pane-active' : ''}`}
                tabIndex={0}
                aria-label="Problem description"
              >
                <h3 className="split-pane-title">Problem</h3>
                {viewingSolution.problemDetails ? (
                  <>
                    <div className="solutions-view-problem-topics">
                      {(viewingSolution.problemDetails.topicTags || []).map(t => (
                        <span key={t.name} className="topic-tag">{t.name}</span>
                      ))}
                    </div>
                    <div
                      className="solutions-view-problem-body"
                      ref={makeScrollablesFocusable}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingSolution.problemDetails.content || '') }}
                    />
                  </>
                ) : (
                  <p className="split-pane-empty">
                    Couldn't load the problem description from LeetCode.
                    {viewingSolution.snippet?.link && (
                      <>
                        {' '}
                        <a href={viewingSolution.snippet.link} target="_blank" rel="noopener noreferrer">
                          Open it on LeetCode
                        </a>.
                      </>
                    )}
                  </p>
                )}
              </section>

              <div
                className="split-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize panes"
                onPointerDown={startDrag}
              />

              <section
                className={`split-pane ${viewPane === 'solution' ? 'pane-active' : ''}`}
                tabIndex={0}
                aria-label="Your saved solution"
              >
                {viewingSolution.snippet && (
                  <>
                    <h3 className="split-pane-title">
                      <Code size={13} /> Your code
                      <span className="split-pane-meta">{viewingSolution.snippet.language}</span>
                    </h3>
                    <pre className="solutions-view-code" tabIndex={0} aria-label="Your code"><code>{viewingSolution.snippet.code}</code></pre>
                  </>
                )}

                {viewingSolution.note && (
                  <>
                    <h3 className="split-pane-title">
                      <Edit3 size={13} /> Notes
                      {viewingSolution.note.personalRating && (
                        <span className="split-pane-meta">
                          <RatingStars value={viewingSolution.note.personalRating} />
                        </span>
                      )}
                    </h3>
                    <div className="note-content">{viewingSolution.note.content}</div>
                    {viewingSolution.note.resources?.length > 0 && (
                      <div className="note-resources">
                        <strong>Resources:</strong>
                        <ul>{viewingSolution.note.resources.map((r, i) => (
                          <li key={i}><a href={r} target="_blank" rel="noopener noreferrer">{r}</a></li>
                        ))}</ul>
                      </div>
                    )}
                  </>
                )}

                {viewingSolution.note?.images?.length > 0 && (
                  <>
                    <h3 className="split-pane-title">
                      <ImageIcon size={13} /> Handwritten notes
                      <span className="split-pane-meta">{viewingSolution.note.images.length}</span>
                    </h3>
                    <div className="photo-view-grid">
                      {viewingPhotos.length === 0 ? (
                        <p className="split-pane-empty">Loading photos...</p>
                      ) : viewingPhotos.map((p, i) => (
                        <button
                          key={p._id || i}
                          type="button"
                          className="photo-view-item"
                          onClick={() => setLightbox(p)}
                          aria-label={`Open photo ${i + 1} full size`}
                        >
                          {/* No loading="lazy": an inline data URI is already in
                              memory, so there is nothing to defer — and an
                              undecoded image is 0px tall under height:auto,
                              which kept it out of view and stopped it ever
                              loading. The intrinsic size reserves layout. */}
                          <img
                            src={p.src}
                            alt={`Handwritten note ${i + 1}`}
                            width={p.width}
                            height={p.height}
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {!viewingSolution.snippet && !viewingSolution.note && (
                  <p className="split-pane-empty">Nothing saved for this problem yet.</p>
                )}
              </section>
            </div>
        </Dialog>
      )}
    </div>
  );
}
