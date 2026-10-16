import * as turf from '@turf/turf';
import { Coordinate, OSRMResponse } from '../types';

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export async function fetchRoute(pointA: Coordinate, pointB: Coordinate): Promise<OSRMResponse> {
  const url = `${OSRM_BASE_URL}/${pointA.lng},${pointA.lat};${pointB.lng},${pointB.lat}?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch route from OSRM');
  }

  const data: OSRMResponse = await response.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found between the points');
  }

  return data;
}

export function calculateMidpoint(coordinates: [number, number][]): Coordinate {
  const line = turf.lineString(coordinates);
  const totalLengthKm = turf.length(line, { units: 'kilometers' });
  const midpointPoint = turf.along(line, totalLengthKm / 2, { units: 'kilometers' });

  const [lng, lat] = midpointPoint.geometry.coordinates;

  return { lat, lng };
}

export function calculateMultiUserMidpoint(participants: { coordinate: Coordinate }[]): Coordinate {
  if (participants.length === 0) {
    return { lat: 0, lng: 0 };
  }
  if (participants.length === 1) {
    return participants[0].coordinate;
  }
  if (participants.length === 2) {
    // If we have routing geometry or fallback, but here calculateMultiUserMidpoint is for centroid or general
    // For 2 users, we can use average or centroid as fallback if routing isn't used
    const coords = participants.map(p => [p.coordinate.lng, p.coordinate.lat] as [number, number]);
    const line = turf.lineString(coords);
    const centerPoint = turf.center(line);
    const [lng, lat] = centerPoint.geometry.coordinates;
    return { lat, lng };
  }

  // 3 or more users: turf.center of featureCollection of points
  const points = participants.map(p => turf.point([p.coordinate.lng, p.coordinate.lat]));
  const fc = turf.featureCollection(points);
  const centerPoint = turf.center(fc);
  const [lng, lat] = centerPoint.geometry.coordinates;

  return { lat, lng };
}

export function buildGoogleMapsSearchUrl(lat: number, lng: number, query = 'tea cafe restaurant'): string {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/maps/search/${encodedQuery}/@${lat},${lng},15z`;
}
