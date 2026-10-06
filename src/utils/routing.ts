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

export function buildGoogleMapsSearchUrl(lat: number, lng: number, query = 'tea cafe restaurant'): string {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/maps/search/${encodedQuery}/@${lat},${lng},15z`;
}
