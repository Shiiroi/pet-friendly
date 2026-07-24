import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FaMap, FaCity, FaSatellite } from 'react-icons/fa';
import Supercluster from 'supercluster';
import { theme } from '../../../shared/styles/theme';
import type { PlaceInBounds, MapBounds } from '../../../shared/types/geo';
import { getConfidenceStyle } from '../../../shared/utils/confidence-color';

interface MapViewProps {
  /** The list of places currently queried in the viewport to draw markers. */
  places: PlaceInBounds[];
  /** Callback triggered when a viewport boundary changes. */
  onBoundsChange: (bounds: MapBounds) => void;
  /** Callback triggered when a place marker is clicked. */
  onSelectPlace: (place: PlaceInBounds) => void;
  /** Programmatic center coordinates override (e.g. search select). */
  centerOverride: [number, number] | null;
  /** Location selected via geocoding search that is not in the database. */
  ghostPlace: { latitude: number; longitude: number; name: string; address: string } | null;
  /** Callback triggered when the ghost marker is clicked. */
  onSelectGhostPlace: (ghost: { latitude: number; longitude: number; name: string; address: string }) => void;
  /** Toggle indicator to hide the "No spots here" overlay during search/adds. */
  hideExplainer?: boolean;
  /** Active status for Grab/Angkas/FoodPanda-style center pin drop mode */
  isPinDropActive?: boolean;
  /** Callback emitted on map move during pin drop mode with live center coordinates */
  onCenterPinMove?: (lat: number, lng: number) => void;
}

interface SuperclusterPointProps {
  cluster?: boolean;
  placeId?: string;
  place?: PlaceInBounds;
}

const MANILA_CENTER: [number, number] = [120.9842, 14.5995]; // [lng, lat] for MapLibre GL
const DEFAULT_ZOOM = 12;

// MapLibre GL Satellite style definition
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri',
    },
    'carto-labels': {
      type: 'raster',
      tiles: ['https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
    },
  },
  layers: [
    { id: 'esri-imagery-layer', type: 'raster', source: 'esri-imagery' },
    { id: 'carto-labels-layer', type: 'raster', source: 'carto-labels' },
  ],
};

const TILE_STYLES = [
  {
    id: 'default',
    label: 'Default',
    Icon: FaMap,
    style: 'https://tiles.openfreemap.org/styles/liberty',
  },
  {
    id: 'osm',
    label: 'Detailed',
    Icon: FaCity,
    style: 'https://tiles.openfreemap.org/styles/bright',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    Icon: FaSatellite,
    style: SATELLITE_STYLE,
  },
] as const;

type TileStyleId = 'default' | 'osm' | 'satellite';

// ---------------------------------------------------------------------------
// DOM Marker Element Generators
// ---------------------------------------------------------------------------

function createPawMarkerElement(fillColor: string, strokeColor = '#ffffff'): HTMLElement {
  const el = document.createElement('div');
  el.className = 'custom-paw-pin';
  el.style.width = '34px';
  el.style.height = '34px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = fillColor;
  el.style.border = `2px solid ${strokeColor}`;
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
  el.style.cursor = 'pointer';
  el.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';

  el.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="14" r="4.5" />
      <circle cx="6.5" cy="8.5" r="2.2" />
      <circle cx="10" cy="5.5" r="2.2" />
      <circle cx="14" cy="5.5" r="2.2" />
      <circle cx="17.5" cy="8.5" r="2.2" />
    </svg>
  `;
  return el;
}

function createUnconfirmedPawMarkerElement(borderColor = '#9ca3af'): HTMLElement {
  const el = document.createElement('div');
  el.className = 'custom-paw-unconfirmed';
  el.style.width = '34px';
  el.style.height = '34px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = '#ffffff';
  el.style.border = `2px dashed ${borderColor}`;
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
  el.style.cursor = 'pointer';
  el.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';

  el.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="${borderColor}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="14" r="4.5" />
      <circle cx="6.5" cy="8.5" r="2.2" />
      <circle cx="10" cy="5.5" r="2.2" />
      <circle cx="14" cy="5.5" r="2.2" />
      <circle cx="17.5" cy="8.5" r="2.2" />
    </svg>
  `;
  return el;
}

function createGhostMarkerElement(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'custom-ghost-pin';
  el.style.width = '34px';
  el.style.height = '34px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  el.style.border = `2px dashed ${theme.colors.terracotta}`;
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
  el.style.cursor = 'pointer';
  el.innerHTML = `<span style="color: ${theme.colors.terracotta}; font-size: 20px; font-weight: 700; line-height: 1; margin-top: -2px;">+</span>`;
  return el;
}

function createClusterMarkerElement(count: number): HTMLElement {
  let size: number;
  let bg: string;
  let border: string;
  let fontSize: string;

  if (count >= 10) {
    size = 46;
    bg = '#C8553D';
    border = '#FFF3E0';
    fontSize = '15px';
  } else if (count >= 5) {
    size = 40;
    bg = theme.colors.terracotta;
    border = '#FFE0B2';
    fontSize = '14px';
  } else {
    size = 34;
    bg = '#E07A5F';
    border = '#ffffff';
    fontSize = '12px';
  }

  const el = document.createElement('div');
  el.className = 'custom-cluster';
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = '50%';
  el.style.backgroundColor = bg;
  el.style.border = `2.5px solid ${border}`;
  el.style.color = '#ffffff';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.fontWeight = '800';
  el.style.fontSize = fontSize;
  el.style.boxShadow = '0 4px 14px rgba(200, 85, 61, 0.35)';
  el.style.fontFamily = theme.fonts.heading;
  el.style.cursor = 'pointer';
  el.innerText = count.toString();
  return el;
}

// ---------------------------------------------------------------------------
// Fixed Center-Screen Pin Overlay for Location Picker
// ---------------------------------------------------------------------------

const CenterPinOverlay: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'none',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.terracotta,
          border: '2.5px solid #ffffff',
          width: '42px',
          height: '42px',
          borderRadius: '50% 50% 50% 0',
          transform: 'rotate(-45deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 22px rgba(224, 122, 95, 0.45)',
        }}
      >
        <span
          style={{
            transform: 'rotate(45deg)',
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 700,
            marginTop: '-2px',
          }}
        >
          🐾
        </span>
      </div>
      <div
        style={{
          width: '12px',
          height: '6px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '50%',
          marginTop: '-4px',
          boxShadow: '0 0 6px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// MapView Component (Native MapLibre GL JS)
// ---------------------------------------------------------------------------

export const MapView: React.FC<MapViewProps> = ({
  places,
  onBoundsChange,
  onSelectPlace,
  centerOverride,
  ghostPlace,
  onSelectGhostPlace,
  isPinDropActive,
  onCenterPinMove,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [tileStyle, setTileStyle] = useState<TileStyleId>('default');
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [spiderfiedState, setSpiderfiedState] = useState<{
    center: [number, number];
    items: Array<{ place: PlaceInBounds; pos: { lat: number; lng: number } }>;
  } | null>(null);

  // Initialize MapLibre GL map instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialStyleObj = TILE_STYLES.find((s) => s.id === tileStyle)?.style || TILE_STYLES[0].style;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyleObj as any,
      center: MANILA_CENTER,
      zoom: DEFAULT_ZOOM,
      maxZoom: 20,
      minZoom: 5,
    });

    mapRef.current = map;

    const handleMoveEnd = () => {
      const b = map.getBounds();
      onBoundsChange({
        minLat: b.getSouth(),
        minLng: b.getWest(),
        maxLat: b.getNorth(),
        maxLng: b.getEast(),
      });
      setCurrentZoom(map.getZoom());

      if (isPinDropActive && onCenterPinMove) {
        const c = map.getCenter();
        onCenterPinMove(c.lat, c.lng);
      }
    };

    map.on('load', handleMoveEnd);
    map.on('moveend', handleMoveEnd);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map style when tileStyle changes
  useEffect(() => {
    if (!mapRef.current) return;
    const styleObj = TILE_STYLES.find((s) => s.id === tileStyle)?.style || TILE_STYLES[0].style;
    mapRef.current.setStyle(styleObj as any);
  }, [tileStyle]);

  // Center override navigation
  useEffect(() => {
    if (centerOverride && mapRef.current) {
      mapRef.current.flyTo({
        center: [centerOverride[1], centerOverride[0]],
        zoom: 15,
        duration: 800,
      });
    }
  }, [centerOverride]);

  // Supercluster instance calculation
  const supercluster = useMemo(() => {
    const sc = new Supercluster<SuperclusterPointProps>({
      radius: 50,
      maxZoom: 16,
    });

    const points = places.map((place) => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        placeId: place.id,
        place,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [place.longitude, place.latitude] as [number, number],
      },
    }));

    sc.load(points);
    return sc;
  }, [places]);

  // Render MapLibre DOM Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Ghost marker
    if (ghostPlace) {
      const ghostEl = createGhostMarkerElement();
      const ghostMarker = new maplibregl.Marker({ element: ghostEl })
        .setLngLat([ghostPlace.longitude, ghostPlace.latitude])
        .addTo(map);
      ghostEl.addEventListener('click', () => onSelectGhostPlace(ghostPlace));
      markersRef.current.push(ghostMarker);
    }

    // 2. Spiderfied markers
    if (spiderfiedState) {
      spiderfiedState.items.forEach(({ place, pos }) => {
        const style = getConfidenceStyle('policy', place.claim, place.agreeing_devices, place.runner_up_agreeing_devices);
        const el = style.isSolid
          ? createPawMarkerElement(style.backgroundColor)
          : createUnconfirmedPawMarkerElement(style.textColor);

        const m = new maplibregl.Marker({ element: el })
          .setLngLat([pos.lng, pos.lat])
          .addTo(map);

        el.addEventListener('click', () => {
          setSpiderfiedState(null);
          onSelectPlace(place);
        });
        markersRef.current.push(m);
      });
      return;
    }

    // 3. Supercluster clusters & points
    const bounds = map.getBounds();
    const clusters = supercluster.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      Math.floor(currentZoom)
    );

    clusters.forEach((feature) => {
      const [fLng, fLat] = feature.geometry.coordinates;
      const isCluster = feature.properties?.cluster;

      if (isCluster) {
        const count = (feature.properties as any).point_count;
        const clusterId = feature.id as number;
        const el = createClusterMarkerElement(count);

        const m = new maplibregl.Marker({ element: el })
          .setLngLat([fLng, fLat])
          .addTo(map);

        el.addEventListener('click', () => {
          const expansionZoom = Math.min(
            supercluster.getClusterExpansionZoom(clusterId),
            18
          );
          if (expansionZoom > currentZoom && currentZoom < 18) {
            map.flyTo({ center: [fLng, fLat], zoom: expansionZoom, duration: 800 });
          } else {
            const leaves = supercluster.getLeaves(clusterId, 50);
            const placeList = leaves.map((l) => l.properties?.place).filter(Boolean) as PlaceInBounds[];
            if (placeList.length > 0) {
              const angleStep = (2 * Math.PI) / placeList.length;
              const radius = 0.0003;
              const ringItems = placeList.map((p, idx) => ({
                place: p,
                pos: {
                  lat: fLat + radius * Math.sin(idx * angleStep),
                  lng: fLng + radius * Math.cos(idx * angleStep),
                },
              }));
              setSpiderfiedState({ center: [fLat, fLng], items: ringItems });
            }
          }
        });

        markersRef.current.push(m);
      } else {
        const place = feature.properties?.place;
        if (!place) return;

        const style = getConfidenceStyle('policy', place.claim, place.agreeing_devices, place.runner_up_agreeing_devices);
        const el = style.isSolid
          ? createPawMarkerElement(style.backgroundColor)
          : createUnconfirmedPawMarkerElement(style.textColor);

        const m = new maplibregl.Marker({ element: el })
          .setLngLat([place.longitude, place.latitude])
          .addTo(map);

        el.addEventListener('click', () => {
          setSpiderfiedState(null);
          onSelectPlace(place);
        });

        markersRef.current.push(m);
      }
    });
  }, [supercluster, currentZoom, spiderfiedState, ghostPlace, places]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 8px 25px rgba(224, 122, 95, 0.08)',
      }}
    >
      <style>{`
        .custom-paw-pin:hover, .custom-cluster:hover, .custom-paw-unconfirmed:hover, .custom-ghost-pin:hover {
          transform: scale(1.18) !important;
        }
        .maplibregl-ctrl-attrib {
          font-size: 10px !important;
          background-color: rgba(255, 255, 255, 0.8) !important;
        }
      `}</style>

      {/* MapLibre GL Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* Zoom Controls */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          right: '16px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          border: `1px solid ${theme.colors.borderLight}`,
        }}
      >
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Zoom in"
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#ffffff',
            border: 'none',
            borderBottom: `1px solid ${theme.colors.borderLight}`,
            color: theme.colors.textDark,
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Zoom out"
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#ffffff',
            border: 'none',
            color: theme.colors.textDark,
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          −
        </button>
      </div>

      {/* Tile Style Picker */}
      <div
        style={{
          position: 'absolute',
          top: '176px',
          right: '16px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          border: `1px solid ${theme.colors.borderLight}`,
        }}
      >
        {TILE_STYLES.map((style, i) => {
          const { Icon } = style;
          return (
            <button
              key={style.id}
              type="button"
              title={style.label}
              onClick={() => setTileStyle(style.id as TileStyleId)}
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: tileStyle === style.id ? theme.colors.softPink : '#ffffff',
                border: 'none',
                borderBottom: i < TILE_STYLES.length - 1 ? `1px solid ${theme.colors.borderLight}` : 'none',
                color: tileStyle === style.id ? theme.colors.terracotta : theme.colors.textMuted,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s ease',
              }}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>

      {/* Center Pin Drop Overlay */}
      {isPinDropActive && <CenterPinOverlay />}
    </div>
  );
};
