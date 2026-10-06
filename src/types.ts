export interface Coordinate {
  lat: number;
  lng: number;
}

export interface AppState {
  pointA: Coordinate | null;
  pointB: Coordinate | null;
  midpoint: Coordinate | null;
  routeGeometry: [number, number][]; // [lng, lat] for GeoJSON
  metrics: {
    distanceKm: number;
    durationMinutes: number;
  } | null;
  isLoading: boolean;
  errorMessage: string | null;
}

export interface OSRMResponse {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
  }>;
}
