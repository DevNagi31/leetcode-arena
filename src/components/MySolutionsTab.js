import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Code, Search, ChevronDown, Trash2, Edit3, Eye, ExternalLink, Star, X, Clock, Cpu } from 'lucide-react';
import { CardSkeleton } from './LoadingSkeleton';
import { authGet, authPost, authPut, authDelete } from '../utils/api';

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++', 'C', 'Go', 'Rust', 'TypeScript', 'Ruby', 'Swift', 'Kotlin', 'Other'];
const RATING_LABELS = ['', 'Trivial', 'Easy', 'Medium', 'Hard', 'Brutal'];

function RatingStars({ value, onChange }) {
  return (
    <div className="solutions-rating">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          className={`solutions-star ${i <= value ? 'active' : ''}`}
          onClick={() => onChange?.(i)}
          style={{ cursor: onChange ? 'pointer' : 'default' }}
        >
          <Star size={16} fill={i <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
      <span className="solutions-rating-label">{RATING_LABELS[value] || ''}</span>
    </div>
  );
}

export default function MySolutionsTab({ showToast }) {
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingSolution, setViewingSolution] = useState(null);
  const [viewTab, setViewTab] = useState('code');
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSolutions(); }, []);

  const fetchSolutions = async () => {
    try {
      const [snippetsRes, notesRes] = await Promise.all([
        authGet('/snippets'),
        authGet('/notes')
      ]);
      const snippets = snippetsRes.data.snippets || snippetsRes.data || [];
      const notes = notesRes.data.notes || notesRes.data || [];

      const combined = {};
      snippets.forEach(s => {
        if (!combined[s.problemName]) combined[s.problemName] = {};
        combined[s.problemName].snippet = s;
      });
      notes.forEach(n => {
        if (!combined[n.problemName]) combined[n.problemName] = {};
        combined[n.problemName].note = n;
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
    return input.toLowerCase().replace(/\s+/g, '-');
  };

  const handleFetchProblem = async () => {
    if (!problemInput.trim()) return;
    setFetchingProblem(true);
    try {
      const titleSlug = extractTitleSlug(problemInput);
      const response = await authPost('/leetcode/problem', { titleSlug });
      setProblemData(response.data);
      showToast('Problem loaded!', 'success');
    } catch (error) {
      showToast('Problem not found', 'error');
      setProblemData(null);
    } finally {
      setFetchingProblem(false);
    }
  };

  const handleSaveSolution = async () => {
    if (!problemData) return;
    try {
      if (solutionData.code) {
        const snippetData = {
          problemName: problemData.title,
          difficulty: problemData.difficulty,
          language: solutionData.language,
          code: solutionData.code,
          runtime: solutionData.runtime,
          memory: solutionData.memory,
          topics: problemData.topicTags.map(t => t.name),
          link: `https://leetcode.com/problems/${problemData.titleSlug}/`
        };
        if (editingSnippetId) {
          await authPut(`/snippets/${editingSnippetId}`, snippetData);
        } else {
          await authPost('/snippets', snippetData);
        }
      }

      if (solutionData.notes) {
        const noteData = {
          problemName: problemData.title,
          difficulty: problemData.difficulty,
          content: solutionData.notes,
          personalRating: solutionData.personalRating,
          topics: problemData.topicTags.map(t => t.name)
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
      showToast('Failed to save', 'error');
    }
  };

  const handleView = async (solution) => {
    try {
      const titleSlug = extractTitleSlug(solution.problemName);
      const response = await authPost('/leetcode/problem', { titleSlug });
      setViewingSolution({ ...solution, problemDetails: response.data });
    } catch (error) {
      setViewingSolution(solution);
    }
    setViewTab(solution.snippet ? 'code' : 'notes');
    setShowViewModal(true);
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
    setShowModal(true);
  };

  const handleDelete = async (solution) => {
    if (!window.confirm(`Delete solution for "${solution.problemName}"?`)) return;
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
    }
  };

  const resetForm = () => {
    setProblemInput('');
    setProblemData(null);
    setEditingSnippetId(null);
    setEditingNoteId(null);
    setSolutionData({ code: '', language: 'Python', runtime: '', memory: '', notes: '', personalRating: 3 });
  };

  const filteredSolutions = solutions.filter(sol => {
    if (filterDifficulty !== 'all' && sol.difficulty?.toLowerCase() !== filterDifficulty) return false;
    if (filterText && !sol.problemName.toLowerCase().includes(filterText.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="solutions-tab">
      {/* Header */}
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
          <select
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
          {filteredSolutions.map((sol, idx) => (
            <div key={idx} className="solutions-card">
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
                  <button className="solutions-action-btn solutions-action-danger" onClick={() => handleDelete(sol)} title="Delete">
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content solutions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="solutions-modal-header">
              <h2>{editingSnippetId || editingNoteId ? 'Edit Solution' : 'New Solution'}</h2>
              <button className="solutions-close-btn" onClick={() => { setShowModal(false); resetForm(); }}>
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
                        <span className={`difficulty-badge ${problemData.difficulty.toLowerCase()}`}>{problemData.difficulty}</span>
                        {problemData.topicTags.slice(0, 3).map(t => <span key={t.name} className="topic-tag">{t.name}</span>)}
                      </div>
                    </div>
                    <div className="solutions-problem-content"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(problemData.content) }} />
                  </div>

                  {/* Solution form on right */}
                  <div className="solutions-edit-form">
                    <div className="form-group">
                      <label>Language</label>
                      <select className="pixel-input" value={solutionData.language}
                        onChange={(e) => setSolutionData({...solutionData, language: e.target.value})}>
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Your Code</label>
                      <textarea
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
                        <label>Runtime</label>
                        <input className="pixel-input" placeholder="e.g. 45ms" value={solutionData.runtime}
                          onChange={(e) => setSolutionData({...solutionData, runtime: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Memory</label>
                        <input className="pixel-input" placeholder="e.g. 14MB" value={solutionData.memory}
                          onChange={(e) => setSolutionData({...solutionData, memory: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        className="pixel-input"
                        rows="4"
                        value={solutionData.notes}
                        onChange={(e) => setSolutionData({...solutionData, notes: e.target.value})}
                        placeholder="Your approach, key insights, gotchas..."
                      />
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
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingSolution && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content solutions-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="solutions-view-header">
              <div>
                <h2 className="solutions-view-title">{viewingSolution.problemName}</h2>
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
              <button className="solutions-close-btn" onClick={() => setShowViewModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="solutions-view-tabs">
              {viewingSolution.snippet && (
                <button className={`solutions-view-tab ${viewTab === 'code' ? 'active' : ''}`} onClick={() => setViewTab('code')}>
                  <Code size={14} /> Code
                </button>
              )}
              {viewingSolution.problemDetails && (
                <button className={`solutions-view-tab ${viewTab === 'problem' ? 'active' : ''}`} onClick={() => setViewTab('problem')}>
                  <ChevronDown size={14} /> Problem
                </button>
              )}
              {viewingSolution.note && (
                <button className={`solutions-view-tab ${viewTab === 'notes' ? 'active' : ''}`} onClick={() => setViewTab('notes')}>
                  <Edit3 size={14} /> Notes
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="solutions-view-content">
              {viewTab === 'code' && viewingSolution.snippet && (
                <pre className="solutions-view-code"><code>{viewingSolution.snippet.code}</code></pre>
              )}

              {viewTab === 'problem' && viewingSolution.problemDetails && (
                <div className="solutions-view-problem">
                  <div className="solutions-view-problem-topics">
                    {viewingSolution.problemDetails.topicTags.map(t => (
                      <span key={t.name} className="topic-tag">{t.name}</span>
                    ))}
                  </div>
                  <div className="solutions-view-problem-body"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingSolution.problemDetails.content) }} />
                </div>
              )}

              {viewTab === 'notes' && viewingSolution.note && (
                <div className="solutions-view-notes">
                  {viewingSolution.note.personalRating && (
                    <div className="solutions-view-notes-rating">
                      <span>Your difficulty rating:</span>
                      <RatingStars value={viewingSolution.note.personalRating} />
                    </div>
                  )}
                  <div className="note-content">{viewingSolution.note.content}</div>
                  {viewingSolution.note.resources?.length > 0 && (
                    <div className="note-resources">
                      <strong>Resources:</strong>
                      <ul>{viewingSolution.note.resources.map((r, i) => (
                        <li key={i}><a href={r} target="_blank" rel="noopener noreferrer">{r}</a></li>
                      ))}</ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
