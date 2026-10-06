# Midpoint Meetup Finder

A mobile-first web application that calculates fair meeting points between two locations using actual road networks. No more travel imbalance debates – find an equitable midpoint in under 30 seconds.

## Features

- **GPS Auto-Location**: Automatically detects your current location
- **Touch-Optimized Map**: Tap to set Point A and Point B on any mobile device
- **Network-Aware Routing**: Uses real road networks via OSRM (not straight-line distance)
- **Fair Midpoint Calculation**: Finds the exact 50% distance mark along the route
- **Travel Metrics**: See total distance, estimated time, and per-person distance
- **Google Maps Integration**: One-tap handoff to find cafes, tea stalls, and restaurants near the midpoint
- **Zero Backend**: 100% client-side, no user accounts, no data stored
- **Free APIs Only**: No paid API keys required

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Leaflet** for interactive maps
- **Turf.js** for geospatial calculations
- **OSRM** for routing (free public API)
- **OpenStreetMap** tiles

## Quick Start

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```

Open `http://localhost:3000` in your browser (or mobile device on the same network).

### Production Build
```bash
npm run build
npm run preview
```

## Usage

1. **Allow Location Access**: Grant GPS permission when prompted for automatic positioning
2. **Set Point A**: Tap anywhere on the map to place your starting location
3. **Set Point B**: Tap again to place your friend's location
4. **View Midpoint**: The app calculates and displays the fair midpoint marker (M)
5. **Find Places**: Tap "Find Places Near Midpoint" to search for cafes/restaurants on Google Maps
6. **Reset**: Use the Reset button to start over

## Project Structure

```
src/
├── components/
│   ├── MapComponent.tsx      # Leaflet map with interactive pins
│   └── ControlPanel.tsx      # Floating UI panel with metrics
├── utils/
│   ├── routing.ts            # OSRM API client & midpoint calculation
│   └── geolocation.ts        # GPS location handling
├── types.ts                  # TypeScript interfaces
├── App.tsx                   # Main application component
├── App.css                   # Responsive styles
└── main.tsx                  # React entry point
```

## Deployment

This is a static site that can be deployed to:

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **Cloudflare Pages**: Connect via Git
- **GitHub Pages**: Build and push to `gh-pages` branch

## Browser Compatibility

- ✅ iOS Safari 14+
- ✅ Android Chrome 90+
- ✅ Firefox 88+
- ✅ Desktop Chrome/Edge/Safari

**Note**: HTTPS is required for GPS geolocation (works on `localhost` for development).

## API Details

### OSRM Routing API
- **Endpoint**: `https://router.project-osrm.org/route/v1/driving/`
- **Rate Limit**: Soft limits on public demo server
- **Cost**: Free
- **Optimization**: Requests only fire when both points are set

### Google Maps Deep Link
- **Format**: `https://www.google.com/maps/search/tea+cafe+restaurant/@{lat},{lng},15z`
- **Cost**: Free (no API key required)
- **Behavior**: Opens native app on mobile, web browser on desktop

## Customization

### Default Region
Edit `TERAI_DEFAULT` in `src/App.tsx` and `src/utils/geolocation.ts`:
```typescript
const TERAI_DEFAULT: Coordinate = { lat: 26.65, lng: 87.27 };
```

### Search Query
Modify the query in `src/utils/routing.ts`:
```typescript
export function buildGoogleMapsSearchUrl(
  lat: number, 
  lng: number, 
  query = 'your custom search'
): string { ... }
```

## Known Limitations

- **OSRM Coverage**: Routing quality depends on OpenStreetMap data completeness
- **Public API**: The free OSRM demo server may have rate limits during heavy traffic
- **Single Route**: Only shows the primary driving route (no alternatives)

## Future Enhancements (Out of Scope for Phase 1)

- Real-time shared rooms via WebSockets
- User accounts and meetup history
- Multi-modal transit options (bus/train schedules)
- In-app place reviews and photos

## License

Open source project. See LICENSE file for details.

## Credits

- Maps: [OpenStreetMap](https://www.openstreetmap.org/) contributors
- Routing: [OSRM Project](http://project-osrm.org/)
- Geospatial: [Turf.js](https://turfjs.org/)
- Framework: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
