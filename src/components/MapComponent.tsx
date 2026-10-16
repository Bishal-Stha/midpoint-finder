import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Coordinate } from '../types';

interface Participant {
  userId: string;
  userName?: string;
  coordinate: Coordinate;
  timestamp: number;
}

interface MapComponentProps {
  center: Coordinate;
  participants: Participant[];
  currentUserId: string;
  midpoint: Coordinate | null;
  routeGeometry: [number, number][];
  onMapClick: (coord: Coordinate) => void;
}

const PARTICIPANT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function getInitials(name: string): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  const first = parts[0][0] || '';
  const last = parts[parts.length - 1][0] || '';
  return (first + last).toUpperCase();
}

const createAvatarIcon = (color: string, initials: string, fullName: string, isCurrentUser: boolean) => {
  const labelText = isCurrentUser ? `${fullName} (You)` : fullName;
  return L.divIcon({
    className: 'custom-avatar-marker',
    html: `
      <div class="avatar-pin-container" title="${labelText}">
        <div class="avatar-circle" style="background-color: ${color};">
          <span class="avatar-initials">${initials}</span>
        </div>
        <div class="avatar-triangle" style="border-top-color: ${color};"></div>
      </div>
    `,
    iconSize: [44, 48],
    iconAnchor: [22, 48],
    popupAnchor: [0, -48],
    tooltipAnchor: [22, -24],
  });
};

const createMidpointIcon = () => {
  return L.divIcon({
    className: 'custom-midpoint-marker',
    html: `
      <div class="midpoint-pin-container" title="Meetup Midpoint">
        <div class="midpoint-circle">
          <span class="midpoint-icon">M</span>
        </div>
        <div class="midpoint-triangle"></div>
      </div>
    `,
    iconSize: [44, 48],
    iconAnchor: [22, 48],
  });
};

export const MapComponent: React.FC<MapComponentProps> = ({
  center,
  participants,
  currentUserId,
  midpoint,
  routeGeometry,
  onMapClick,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const routeLayerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
      }).setView([center.lat, center.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const existingMarkerIds = Object.keys(markersRef.current);
    const currentParticipantIds = participants.map((p) => p.userId);

    existingMarkerIds.forEach((id) => {
      if (id !== 'M' && !currentParticipantIds.includes(id)) {
        mapRef.current!.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    participants.forEach((participant, index) => {
      const { userId, coordinate, userName } = participant;
      const isCurrentUser = userId === currentUserId;
      const displayName = userName || (isCurrentUser ? 'You' : `User ${index + 1}`);
      const initials = getInitials(displayName);
      const color = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];

      if (markersRef.current[userId]) {
        markersRef.current[userId].setLatLng([coordinate.lat, coordinate.lng]);
        markersRef.current[userId].setIcon(createAvatarIcon(color, initials, displayName, isCurrentUser));
        markersRef.current[userId].bindTooltip(isCurrentUser ? `${displayName} (You)` : displayName, {
          direction: 'top',
          offset: [0, -45],
        });
      } else {
        const marker = L.marker([coordinate.lat, coordinate.lng], {
          icon: createAvatarIcon(color, initials, displayName, isCurrentUser),
        })
          .addTo(mapRef.current!)
          .bindTooltip(isCurrentUser ? `${displayName} (You)` : displayName, {
            direction: 'top',
            offset: [0, -45],
          });
        markersRef.current[userId] = marker;
      }
    });
  }, [participants, currentUserId]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (markersRef.current.M) {
      mapRef.current.removeLayer(markersRef.current.M);
      delete markersRef.current.M;
    }

    if (midpoint) {
      const marker = L.marker([midpoint.lat, midpoint.lng], {
        icon: createMidpointIcon(),
      })
        .addTo(mapRef.current)
        .bindTooltip('🎯 Optimal Meetup Midpoint', {
          direction: 'top',
          offset: [0, -45],
        });
      markersRef.current.M = marker;
    }
  }, [midpoint]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routeGeometry.length > 0) {
      const latLngs: [number, number][] = routeGeometry.map(([lng, lat]) => [lat, lng]);
      const polyline = L.polyline(latLngs, {
        color: '#6366f1',
        weight: 5,
        opacity: 0.8,
      }).addTo(mapRef.current);

      routeLayerRef.current = polyline;
    }
  }, [routeGeometry]);

  useEffect(() => {
    if (!mapRef.current || participants.length === 0) return;

    const bounds = L.latLngBounds([]);
    participants.forEach((p) => {
      bounds.extend([p.coordinate.lat, p.coordinate.lng]);
    });
    if (midpoint) {
      bounds.extend([midpoint.lat, midpoint.lng]);
    }

    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [participants, midpoint]);

  return <div id="map" className="map-container"></div>;
};
