import { useState, useEffect, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { MapComponent } from './components/MapComponent';
import { ControlPanel } from './components/ControlPanel';
import { Coordinate } from './types';
import { getCurrentLocation } from './utils/geolocation';
import { fetchRoute, calculateMidpoint } from './utils/routing';
import './App.css';

const TERAI_DEFAULT: Coordinate = { lat: 26.65, lng: 87.27 };

const SUPABASE_URL = 'https://uboweiyycqgjytmdhqjj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVib3dlaXl5Y3Fnanl0bWRocWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg3NDA5OTgsImV4cCI6MjA0NDMxNjk5OH0.TDa2t0bSdVNywi9mM6owL-PrR7H1jj74m2CHdNrmcnk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Participant {
  userId: string;
  coordinate: Coordinate;
  timestamp: number;
}

interface MultiUserState {
  participants: Record<string, Participant>;
  midpoint: Coordinate | null;
  routeGeometry: [number, number][];
  metrics: {
    distanceKm: number;
    durationMinutes: number;
  } | null;
  isLoading: boolean;
  errorMessage: string | null;
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getUserId(): string {
  let userId = sessionStorage.getItem('userId');
  if (!userId) {
    userId = 'user-' + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem('userId', userId);
  }
  return userId;
}

function App() {
  const [roomId, setRoomId] = useState<string>('');
  const [userId] = useState<string>(getUserId());
  const [state, setState] = useState<MultiUserState>({
    participants: {},
    midpoint: null,
    routeGeometry: [],
    metrics: null,
    isLoading: false,
    errorMessage: null,
  });

  const [mapCenter, setMapCenter] = useState<Coordinate>(TERAI_DEFAULT);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let room = params.get('room');

    if (!room) {
      room = generateRoomCode();
      const url = new URL(window.location.href);
      url.searchParams.set('room', room);
      window.history.replaceState({}, '', url.toString());
    }

    setRoomId(room);

    getCurrentLocation().then((location) => {
      setMapCenter(location);
    });
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`room-${roomId}`);

    channel
      .on('broadcast', { event: 'location_update' }, ({ payload }) => {
        const { userId: senderId, coordinate, timestamp } = payload as {
          userId: string;
          coordinate: Coordinate;
          timestamp: number;
        };

        setState((prev) => ({
          ...prev,
          participants: {
            ...prev.participants,
            [senderId]: { userId: senderId, coordinate, timestamp },
          },
        }));
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    const participantList = Object.values(state.participants);
    if (participantList.length >= 2) {
      computeRouteForMultipleUsers(participantList);
    } else {
      setState((prev) => ({
        ...prev,
        midpoint: null,
        routeGeometry: [],
        metrics: null,
      }));
    }
  }, [state.participants]);

  const computeRouteForMultipleUsers = async (participants: Participant[]) => {
    if (participants.length < 2) return;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const [user1, user2] = participants.slice(0, 2);
      const routeData = await fetchRoute(user1.coordinate, user2.coordinate);
      const route = routeData.routes[0];
      const coordinates = route.geometry.coordinates;

      const midpoint = calculateMidpoint(coordinates);

      setState((prev) => ({
        ...prev,
        midpoint,
        routeGeometry: coordinates,
        metrics: {
          distanceKm: route.distance / 1000,
          durationMinutes: route.duration / 60,
        },
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to calculate route',
      }));
    }
  };

  const handleMapClick = (coord: Coordinate) => {
    const timestamp = Date.now();

    setState((prev) => ({
      ...prev,
      participants: {
        ...prev.participants,
        [userId]: { userId, coordinate: coord, timestamp },
      },
    }));

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'location_update',
        payload: { userId, coordinate: coord, timestamp },
      });
    }
  };

  const handleCopyShareLink = () => {
    const url = new URL(window.location.href);
    navigator.clipboard.writeText(url.toString());
  };

  const handleReset = () => {
    setState({
      participants: {},
      midpoint: null,
      routeGeometry: [],
      metrics: null,
      isLoading: false,
      errorMessage: null,
    });
  };

  const participantList = Object.values(state.participants);
  const myLocation = state.participants[userId]?.coordinate || null;

  return (
    <div className="app">
      <MapComponent
        center={mapCenter}
        participants={participantList}
        currentUserId={userId}
        midpoint={state.midpoint}
        routeGeometry={state.routeGeometry}
        onMapClick={handleMapClick}
      />
      <ControlPanel
        roomId={roomId}
        participantCount={participantList.length}
        myLocation={myLocation}
        midpoint={state.midpoint}
        metrics={state.metrics}
        isLoading={state.isLoading}
        errorMessage={state.errorMessage}
        onReset={handleReset}
        onCopyShareLink={handleCopyShareLink}
      />
    </div>
  );
}

export default App;
