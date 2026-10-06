import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Coordinate } from '../types';

interface Participant {
  userId: string;
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

const createCustomIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin" style="background-color: ${color};">
        <span class="marker-label">${label}</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
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
      if (!currentParticipantIds.includes(id)) {
        mapRef.current!.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    participants.forEach((participant, index) => {
      const { userId, coordinate } = participant;
      const isCurrentUser = userId === currentUserId;
      const label = isCurrentUser ? 'You' : `User ${index + 1}`;
      const color = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];

      if (markersRef.current[userId]) {
        markersRef.current[userId].setLatLng([coordinate.lat, coordinate.lng]);
      } else {
        const marker = L.marker([coordinate.lat, coordinate.lng], {
          icon: createCustomIcon(color, label),
        }).addTo(mapRef.current!);
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
        icon: createCustomIcon('#10b981', 'M'),
      }).addTo(mapRef.current);
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
        weight: 4,
        opacity: 0.7,
      }).addTo(mapRef.current);

      routeLayerRef.current = polyline;
    }
  }, [routeGeometry]);

  useEffect(() => {
    if (!mapRef.current || participants.length < 2) return;

    const bounds = L.latLngBounds([]);
    participants.forEach((p) => {
      bounds.extend([p.coordinate.lat, p.coordinate.lng]);
    });
    if (midpoint) {
      bounds.extend([midpoint.lat, midpoint.lng]);
    }

    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [participants, midpoint]);

  return <div id="map" className="map-container"></div>;
};
