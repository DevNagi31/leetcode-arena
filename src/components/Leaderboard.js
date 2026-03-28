import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Home, Search, User, Globe, Building2, Users } from 'lucide-react';
import { LeaderboardSkeleton } from './LoadingSkeleton';
import RankBadge from './RankBadge';
import { API_URL } from '../utils/api';
import { calculateTier } from '../utils/tiers';

export default function Leaderboard({ users, setUsers, onNavigate, currentUser, showToast, embedded = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedInstitution, setSelectedInstitution] = useState('all');
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [viewMode, setViewMode] = useState('global');
  const [friendsLb, setFriendsLb] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  useEffect(() => {
    if (viewMode === 'friends') return;
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedCountry !== 'all') params.country = selectedCountry;
        if (selectedInstitution !== 'all') params.institution = selectedInstitution;
        const response = await axios.get(`${API_URL}/leaderboard`, { params });
        const data = response.data;
        setUsers(data.users || data || []);
      } catch (error) { showToast('Failed to load leaderboard', 'error'); setUsers([]); }
      finally { setLoading(false); }
    };
    const fetchCountries = async () => {
      try { const r = await axios.get(`${API_URL}/leaderboard/countries`); setCountries(r.data || []); }
      catch (e) { /* silently fail */ }
    };
    fetchLeaderboard();
    fetchCountries();
  }, [selectedCountry, selectedInstitution, setUsers, showToast, viewMode]);

  useEffect(() => {
    if (!selectedCountry || selectedCountry === 'all') return;
    const fetchInstitutions = async () => {
      try {
        const r = await axios.get(`${API_URL}/leaderboard/institutions`, { params: { country: selectedCountry } });
        setInstitutions(r.data || []);
      } catch (e) { /* silently fail */ }
    };
    fetchInstitutions();
  }, [selectedCountry]);

  useEffect(() => {
    if (viewMode !== 'friends' || !currentUser) return;
    const fetchFriendsLb = async () => {
      setFriendsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const r = await axios.get(`${API_URL}/friends/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriendsLb(r.data || []);
      } catch (e) { showToast('Failed to load friends leaderboard', 'error'); }
      finally { setFriendsLoading(false); }
    };
    fetchFriendsLb();
  }, [viewMode, currentUser, showToast]);

  const handleViewChange = (mode) => {
    setViewMode(mode);
    if (mode === 'global') { setSelectedCountry('all'); setSelectedInstitution('all'); }
    else if (mode === 'country' && currentUser) { setSelectedCountry(currentUser.country); setSelectedInstitution('all'); }
    else if (mode === 'institution' && currentUser) { setSelectedCountry(currentUser.country); setSelectedInstitution(currentUser.institutionName); }
  };

  const activeUsers = viewMode === 'friends' ? friendsLb : users;
  const isLoading = viewMode === 'friends' ? friendsLoading : loading;

  const filteredUsers = activeUsers.filter(user => {
    if (!user || !user.username) return false;
    if (!searchQuery) return true;
    return user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.institutionName && user.institutionName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.country && user.country.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const topThree = filteredUsers.slice(0, 3).concat(Array(Math.max(0, 3 - filteredUsers.length)).fill(null));
  const restUsers = filteredUsers.slice(3);

  if (isLoading) return <div className={embedded ? '' : 'leaderboard'}><LeaderboardSkeleton /></div>;

  return (
    <div className={embedded ? '' : 'leaderboard'}>
      {!embedded && (
        <div className="leaderboard-header">
          <h2><Trophy size={28} /> LEADERBOARD</h2>
          <button className="pixel-button" onClick={() => onNavigate(currentUser ? 'dashboard' : 'landing')}>
            <Home size={16} /> {currentUser ? 'DASHBOARD' : 'HOME'}
          </button>
        </div>
      )}
      <div className="leaderboard-tabs">
        <button className={`tab-button ${viewMode === 'global' ? 'active' : ''}`} onClick={() => handleViewChange('global')}><Globe size={16} /> GLOBAL</button>
        {currentUser && (
          <>
            <button className={`tab-button ${viewMode === 'country' ? 'active' : ''}`} onClick={() => handleViewChange('country')}><Globe size={16} /> MY COUNTRY</button>
            <button className={`tab-button ${viewMode === 'institution' ? 'active' : ''}`} onClick={() => handleViewChange('institution')}><Building2 size={16} /> MY UNIVERSITY</button>
            <button className={`tab-button ${viewMode === 'friends' ? 'active' : ''}`} onClick={() => handleViewChange('friends')}><Users size={16} /> FRIENDS</button>
          </>
        )}
      </div>

      {activeUsers.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 24px' }}>
          {viewMode === 'friends' ? (
            <>
              <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3>No friends yet</h3>
              <p>Add friends to see how you rank against them</p>
            </>
          ) : (
            <>
              <Trophy size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3>No users found</h3>
            </>
          )}
        </div>
      ) : (
        <>
          {viewMode !== 'friends' && (
            <div className="filter-section">
              <div className="search-bar">
                <Search size={18} />
                <input type="text" className="search-input pixel-input" placeholder="Search..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="college-filter">
                <label>Country:</label>
                <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedInstitution('all'); }}>
                  <option value="all">All</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {selectedCountry !== 'all' && (
                <div className="college-filter">
                  <label>Institution:</label>
                  <select value={selectedInstitution} onChange={(e) => setSelectedInstitution(e.target.value)}>
                    <option value="all">All</option>
                    {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {viewMode === 'friends' && (
            <div className="filter-section">
              <div className="search-bar">
                <Search size={18} />
                <input type="text" className="search-input pixel-input" placeholder="Search friends..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
          )}

          <div className="podium">
            {[topThree[1], topThree[0], topThree[2]].map((user, index) => {
              const place = index === 1 ? 1 : index === 0 ? 2 : 3;
              if (!user) return (
                <div key={`empty-${place}`} className={`podium-place place-${place}`}>
                  <div className="podium-rank">#{place}</div>
                  <div className="podium-avatar"><User size={32} /></div>
                  <div className="podium-name">--</div>
                  <div className="podium-score">- pts</div>
                </div>
              );
              const tier = user.tier || calculateTier(user.score);
              return (
                <div key={user._id} className={`podium-place place-${place}`}>
                  <div className="podium-rank">#{place}</div>
                  <RankBadge tier={tier} size={place === 1 ? 'medium' : 'small'} showLabel={false} />
                  <div className="podium-name">{user.username}</div>
                  <div className="podium-score">{user.score} pts</div>
                  <div className="podium-tier-label" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {tier.name} {tier.division || ''}
                  </div>
                  <div className="podium-college">
                    {user.institutionName}
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{user.country}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {restUsers.length > 0 && (
            <div className="leaderboard-table">
              <div className="table-header">
                <div>RANK</div><div>TIER</div><div>USER</div><div>{viewMode === 'friends' ? 'STREAK' : 'COUNTRY'}</div><div>PROBLEMS</div><div>SCORE</div>
              </div>
              {restUsers.map((user, index) => {
                const tier = user.tier || calculateTier(user.score);
                const rank = user.rank || index + 4;
                const isMe = currentUser && (user._id === currentUser._id || user._id === currentUser.id);
                return (
                  <div key={user._id} className={`table-row ${isMe ? 'table-row-me' : ''}`}>
                    <div className="table-cell"><span className="rank-number">#{rank}</span></div>
                    <div className="table-cell"><RankBadge tier={tier} size="small" showLabel={false} /></div>
                    <div className="table-cell"><span className="user-avatar-small"><User size={14} /></span>{user.username}</div>
                    <div className="table-cell">{viewMode === 'friends' ? `${user.currentStreak || 0}d` : user.country}</div>
                    <div className="table-cell">{user.problems}</div>
                    <div className="table-cell"><strong>{user.score}</strong></div>
                  </div>
                );
              })}
            </div>
          )}
          {filteredUsers.length === 0 && activeUsers.length > 0 && <div className="empty-message">No results found</div>}
        </>
      )}
    </div>
  );
}
