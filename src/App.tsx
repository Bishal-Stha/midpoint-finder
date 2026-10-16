import { useState, useEffect, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { MapComponent } from './components/MapComponent';
import { ControlPanel } from './components/ControlPanel';
import { Coordinate } from './types';
import { getCurrentLocation } from './utils/geolocation';
import { fetchRoute, calculateMidpoint, calculateMultiUserMidpoint } from './utils/routing';
import './App.css';

const TERAI_DEFAULT: Coordinate = { lat: 26.65, lng: 87.27 };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️  Missing Supabase credentials. Real-time sync will not work.\n' +
    'Please create a .env file with:\n' +
    '  VITE_SUPABASE_URL=your-supabase-url\n' +
    '  VITE_SUPABASE_ANON_KEY=your-anon-key'
  );
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

interface Participant {
  userId: string;
  userName?: string;
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
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room');

  if (roomId && !userId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      userId = crypto.randomUUID();
    } else {
      userId = 'user-' + Math.random().toString(36).substring(2, 15) + Date.now();
    }
    sessionStorage.setItem('userId', userId);
  } else if (!userId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      userId = crypto.randomUUID();
    } else {
      userId = 'user-' + Math.random().toString(36).substring(2, 15) + Date.now();
    }
    sessionStorage.setItem('userId', userId);
  }

  return userId;
}

function getUserName(): string {
  const stored = sessionStorage.getItem('userName');
  if (stored && stored.trim()) return stored.trim();
  const randomAdjectives = ['Happy', 'Swift', 'Bright', 'Cosmic', 'Bold', 'Calm', 'Eager'];
  const randomNouns = ['Traveler', 'Explorer', 'Friend', 'Nomad', 'Pioneer', 'Rider'];
  const generated = `${randomAdjectives[Math.floor(Math.random() * randomAdjectives.length)]} ${randomNouns[Math.floor(Math.random() * randomNouns.length)]}`;
  sessionStorage.setItem('userName', generated);
  return generated;
}

function App() {
  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    let room = params.get('room');
    if (!room) {
      room = generateRoomCode();
      const url = new URL(window.location.href);
      url.searchParams.set('room', room);
      window.history.replaceState({}, '', url.toString());
    }
    return room;
  });
  const [userId] = useState<string>(getUserId());
  const [userName, setUserName] = useState<string>(getUserName());

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
  const roomIdRef = useRef<string>(roomId);
  const userNameRef = useRef<string>(userName);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    userNameRef.current = userName;
    sessionStorage.setItem('userName', userName);
  }, [userName]);

  useEffect(() => {
    getCurrentLocation().then((location) => {
      setMapCenter(location);
    }).catch(() => {
      setMapCenter(TERAI_DEFAULT);
    });
  }, []);

  // Fetch initial room participants and setup Postgres Changes subscription
  useEffect(() => {
    if (!roomId || !supabase) return;

    const cleanRoom = roomId.trim().toUpperCase();
    console.log(`[Room ${cleanRoom}] Fetching participants from DB for user ${userId} (${userName})`);

    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_code', cleanRoom);

      if (error) {
        console.error('Error fetching room participants:', error);
        return;
      }

      if (data) {
        const participantsMap: Record<string, Participant> = {};
        data.forEach((row: any) => {
          participantsMap[row.user_id] = {
            userId: row.user_id,
            userName: row.user_name || 'Participant',
            coordinate: { lat: row.lat, lng: row.lng },
            timestamp: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
          };
        });

        setState((prev) => ({
          ...prev,
          participants: participantsMap,
        }));
      }
    };

    fetchParticipants();

    console.log(`[Room ${cleanRoom}] Subscribing to postgres_changes`);
    const channel = supabase
      .channel(`db-room-${cleanRoom}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_participants', filter: `room_code=eq.${cleanRoom}` },
        (payload) => {
          console.log('[Postgres Change received]', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            if (row && row.room_code === cleanRoom) {
              setState((prev) => ({
                ...prev,
                participants: {
                  ...prev.participants,
                  [row.user_id]: {
                    userId: row.user_id,
                    userName: row.user_name || 'Participant',
                    coordinate: { lat: row.lat, lng: row.lng },
                    timestamp: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
                  },
                },
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as any;
            if (row && row.user_id) {
              setState((prev) => {
                const updated = { ...prev.participants };
                delete updated[row.user_id];
                return { ...prev, participants: updated };
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Room ${cleanRoom}] Realtime DB status:`, status);
        if (status === 'SUBSCRIBED') {
          setState((prev) => {
            const myParticipant = prev.participants[userId];
            if (myParticipant) {
              upsertParticipantLocation(cleanRoom, userId, userNameRef.current, myParticipant.coordinate);
            }
            return prev;
          });
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`[Room ${cleanRoom}] Unsubscribing DB channel`);
      channel.unsubscribe();
    };
  }, [roomId, userId]);

  const upsertParticipantLocation = async (roomCode: string, uId: string, uName: string, coord: Coordinate) => {
    if (!supabase) return;
    try {
      console.log('[Supabase Upsert]', { room_code: roomCode, user_id: uId, user_name: uName, ...coord });
      const { error } = await supabase.from('room_participants').upsert(
        {
          room_code: roomCode,
          user_id: uId,
          user_name: uName,
          lat: coord.lat,
          lng: coord.lng,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'room_code,user_id' }
      );
      if (error) {
        console.error('Error upserting participant location:', error);
      }
    } catch (err) {
      console.error('Exception during upsert:', err);
    }
  };

  useEffect(() => {
    const participantList = Object.values(state.participants);
    if (participantList.length >= 2) {
      computeRouteOrMidpoint(participantList);
    } else {
      setState((prev) => ({
        ...prev,
        midpoint: null,
        routeGeometry: [],
        metrics: null,
      }));
    }
  }, [state.participants]);

  const computeRouteOrMidpoint = async (participants: Participant[]) => {
    if (participants.length < 2) return;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      errorMessage: null,
    }));

    if (participants.length === 2) {
      try {
        const [user1, user2] = participants;
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
        const midpoint = calculateMultiUserMidpoint(participants);
        setState((prev) => ({
          ...prev,
          midpoint,
          routeGeometry: [],
          metrics: null,
          isLoading: false,
          errorMessage: error instanceof Error ? error.message : 'Failed to calculate route, using centroid',
        }));
      }
    } else {
      const midpoint = calculateMultiUserMidpoint(participants);
      setState((prev) => ({
        ...prev,
        midpoint,
        routeGeometry: [],
        metrics: null,
        isLoading: false,
      }));
    }
  };

  const handleMapClick = (coord: Coordinate) => {
    const timestamp = Date.now();
    const activeRoom = roomIdRef.current;
    const activeName = userNameRef.current;
    console.log('[Map Click] Setting location for', userId, activeName, coord, 'in room', activeRoom);

    setState((prev) => ({
      ...prev,
      participants: {
        ...prev.participants,
        [userId]: { userId, userName: activeName, coordinate: coord, timestamp },
      },
    }));

    upsertParticipantLocation(activeRoom, userId, activeName, coord);
  };

  const handleUpdateUserName = (newName: string) => {
    setUserName(newName);
    const myParticipant = state.participants[userId];
    if (myParticipant) {
      setState((prev) => ({
        ...prev,
        participants: {
          ...prev.participants,
          [userId]: { ...myParticipant, userName: newName },
        },
      }));
      upsertParticipantLocation(roomIdRef.current, userId, newName, myParticipant.coordinate);
    }
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/?room=${roomId.toUpperCase()}`;
    navigator.clipboard.writeText(shareUrl);
  };

  const handleReset = async () => {
    if (supabase) {
      await supabase
        .from('room_participants')
        .delete()
        .eq('room_code', roomId)
        .eq('user_id', userId);
    }

    setState((prev) => {
      const updated = { ...prev.participants };
      delete updated[userId];
      return {
        ...prev,
        participants: updated,
        midpoint: null,
        routeGeometry: [],
        metrics: null,
        isLoading: false,
        errorMessage: null,
      };
    });
  };

  const handleJoinRoom = (rawInput: string) => {
    let extractedCode = rawInput.trim();
    if (extractedCode.includes('room=')) {
      try {
        const url = new URL(extractedCode.includes('http') ? extractedCode : `https://dummy.com/?${extractedCode}`);
        extractedCode = url.searchParams.get('room') || extractedCode;
      } catch {
        const match = extractedCode.match(/[?&]room=([^&]+)/i);
        if (match) extractedCode = match[1];
      }
    }
    const cleanCode = extractedCode.slice(0, 6).toUpperCase();
    if (!cleanCode) return;

    const url = new URL(window.location.href);
    url.searchParams.set('room', cleanCode);
    window.history.pushState({}, '', url.toString());

    if (channelRef.current && supabase) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setRoomId(cleanCode);
    setState((prev) => {
      const myParticipant = prev.participants[userId];
      const newParticipants = myParticipant ? { [userId]: myParticipant } : {};
      if (myParticipant) {
        upsertParticipantLocation(cleanCode, userId, userNameRef.current, myParticipant.coordinate);
      }
      return {
        participants: newParticipants,
        midpoint: null,
        routeGeometry: [],
        metrics: null,
        isLoading: false,
        errorMessage: null,
      };
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
        userName={userName}
        onUpdateUserName={handleUpdateUserName}
        onReset={handleReset}
        onCopyShareLink={handleCopyShareLink}
        onJoinRoom={handleJoinRoom}
      />
    </div>
  );
}

export default App;
