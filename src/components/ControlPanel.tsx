import React, { useState } from 'react';
import { Coordinate } from '../types';
import { buildGoogleMapsSearchUrl } from '../utils/routing';

interface ControlPanelProps {
  roomId: string;
  participantCount: number;
  myLocation: Coordinate | null;
  midpoint: Coordinate | null;
  metrics: {
    distanceKm: number;
    durationMinutes: number;
  } | null;
  isLoading: boolean;
  errorMessage: string | null;
  onReset: () => void;
  onCopyShareLink: () => void;
  onJoinRoom: (newRoomCode: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  roomId,
  participantCount,
  myLocation,
  midpoint,
  metrics,
  isLoading,
  errorMessage,
  onReset,
  onCopyShareLink,
  onJoinRoom,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [joinInput, setJoinInput] = useState('');
  const [showJoinSection, setShowJoinSection] = useState(false);

  const handleOpenGoogleMaps = () => {
    if (midpoint) {
      const url = buildGoogleMapsSearchUrl(midpoint.lat, midpoint.lng);
      window.open(url, '_blank');
    }
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinInput.trim()) {
      onJoinRoom(joinInput);
      setJoinInput('');
      setShowJoinSection(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="control-panel control-panel-minimized" onClick={handleToggleExpand}>
        <div className="minimized-content">
          <span className="minimized-text">
            {midpoint
              ? '✅ Midpoint Ready — Click to View'
              : `📍 Room ${roomId} (${participantCount} ${participantCount === 1 ? 'user' : 'users'})`}
          </span>
          <button className="toggle-btn" aria-label="Expand panel">
            ▲
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h1>Midpoint Meetup Finder</h1>
        <button className="toggle-btn" onClick={handleToggleExpand} aria-label="Minimize panel">
          ▼
        </button>
      </div>

      <div className="room-info">
        <div className="room-code">
          <span className="room-label">Room:</span>
          <span className="room-value">{roomId}</span>
        </div>
        <div className="participant-count">
          <span className="participant-label">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </span>
        </div>

        <div className="join-section-toggle">
          <button
            className="btn-text-link"
            onClick={() => setShowJoinSection(!showJoinSection)}
          >
            {showJoinSection ? '▲ Hide join room' : '▼ Join another room'}
          </button>
        </div>

        {showJoinSection && (
          <form onSubmit={handleJoinSubmit} className="join-room-form">
            <input
              type="text"
              placeholder="Enter 6-char code"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              maxLength={10}
              className="join-input"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!joinInput.trim()}>
              Join
            </button>
          </form>
        )}
      </div>

      {errorMessage && (
        <div className="error-banner">
          {errorMessage}
        </div>
      )}

      <div className="instructions">
        {!myLocation && <p>📍 Tap the map to set your location</p>}
        {myLocation && participantCount < 2 && (
          <p>👥 Share the room link and wait for others to join</p>
        )}
        {participantCount >= 2 && midpoint && <p>✅ Midpoint calculated!</p>}
      </div>

      {metrics && (
        <div className="metrics">
          <div className="metric-item">
            <span className="metric-label">Total Distance:</span>
            <span className="metric-value">{metrics.distanceKm.toFixed(2)} km</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Estimated Time:</span>
            <span className="metric-value">{Math.round(metrics.durationMinutes)} min</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Per Person:</span>
            <span className="metric-value">{(metrics.distanceKm / 2).toFixed(2)} km each</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>Calculating route...</span>
        </div>
      )}

      <div className="actions">
        <button className="btn btn-primary" onClick={onCopyShareLink}>
          📋 Copy Room Link
        </button>

        {midpoint && (
          <button className="btn btn-primary" onClick={handleOpenGoogleMaps}>
            🔍 Find Places Near Midpoint
          </button>
        )}

        {participantCount > 0 && (
          <button className="btn btn-secondary" onClick={onReset}>
            🔄 Reset My Location
          </button>
        )}
      </div>

      <div className="tip">
        <small>💡 Share the room link for real-time collaboration</small>
      </div>
    </div>
  );
};
