import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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
}

const MANILA_CENTER: [number, number] = [14.5995, 120.9842];
const DEFAULT_ZOOM = 12;

/**
 * Creates custom round paw-shaped markers.
 * 
 * WHY ROUNDED PAW-SHAPED PINS:
 * Replaces clinical, database-like default pins with soft-edged, friendly,
 * pet-themed visual identifiers.
 * 
 * @param {string} fillColor - Hex value representing the status colors.
 * @param {string} strokeColor - Hex outline.
 */
function createCustomPawIcon(fillColor: string, strokeColor: string = '#ffffff') {
  return L.divIcon({
    className: 'custom-paw-pin',
    html: `
      <div style="
        background-color: ${fillColor};
        border: 2px solid ${strokeColor};
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="14" r="4.5" />
          <circle cx="6.5" cy="8.5" r="2.2" />
          <circle cx="10" cy="5.5" r="2.2" />
          <circle cx="14" cy="5.5" r="2.2" />
          <circle cx="17.5" cy="8.5" r="2.2" />
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

/**
 * Creates a white-filled, dashed-outlined icon representing unconfirmed/low-confidence reviews.
 */
function createUnconfirmedPawIcon(borderColor: string = '#9ca3af') {
  return L.divIcon({
    className: 'custom-paw-unconfirmed',
    html: `
      <div style="
        background-color: #ffffff;
        border: 2px dashed ${borderColor};
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${borderColor}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="14" r="4.5" />
          <circle cx="6.5" cy="8.5" r="2.2" />
          <circle cx="10" cy="5.5" r="2.2" />
          <circle cx="14" cy="5.5" r="2.2" />
          <circle cx="17.5" cy="8.5" r="2.2" />
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

/**
 * Creates a dashed-outline "ghost" marker with a plus sign,
 * representing a geocoded address location not yet verified in our database.
 */
function createGhostIcon() {
  return L.divIcon({
    className: 'custom-ghost-pin',
    html: `
      <div style="
        background-color: rgba(255, 255, 255, 0.9);
        border: 2px dashed ${theme.colors.terracotta};
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      ">
        <span style="color: ${theme.colors.terracotta}; font-size: 20px; font-weight: 700; line-height: 1; margin-top: -2px;">+</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

/**
 * Creates custom cluster icons showing count.
 */
function createClusterIcon(count: number) {
  return L.divIcon({
    className: 'custom-cluster',
    html: `
      <div style="
        background-color: ${theme.colors.terracotta};
        border: 2px solid #ffffff;
        color: #ffffff;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        font-family: ${theme.fonts.heading};
      ">
        ${count}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

const MapEvents: React.FC<{
  onBoundsChange: (bounds: MapBounds) => void;
  onZoomChange: (zoom: number) => void;
}> = ({ onBoundsChange, onZoomChange }) => {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        minLat: b.getSouth(),
        minLng: b.getWest(),
        maxLat: b.getNorth(),
        maxLng: b.getEast(),
      });
    },
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    const b = map.getBounds();
    onBoundsChange({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    });
    onZoomChange(map.getZoom());
  }, [map]);

  return null;
};

const MapController: React.FC<{ center: [number, number] | null }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
};

/**
 * Main styled Leaflet Map view drawing places and cluster centroids.
 */
export const MapView: React.FC<MapViewProps> = ({
  places,
  onBoundsChange,
  onSelectPlace,
  centerOverride,
  ghostPlace,
  onSelectGhostPlace,
  hideExplainer,
}) => {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [initialCenter] = useState<[number, number]>(MANILA_CENTER);


  const getClusters = () => {
    const clustered: Array<{
      isCluster: boolean;
      lat: number;
      lng: number;
      count: number;
      place?: PlaceInBounds;
      places?: PlaceInBounds[];
    }> = [];

    const threshold = 0.05 / Math.pow(2, zoom - 8);
    const visited = new Set<string>();

    for (const place of places) {
      if (visited.has(place.id)) continue;

      const group = [place];
      visited.add(place.id);

      for (const other of places) {
        if (visited.has(other.id)) continue;

        const dist = Math.sqrt(
          Math.pow(place.latitude - other.latitude, 2) +
          Math.pow(place.longitude - other.longitude, 2)
        );

        if (dist < threshold) {
          group.push(other);
          visited.add(other.id);
        }
      }

      if (group.length > 1) {
        const sumLat = group.reduce((acc, p) => acc + p.latitude, 0);
        const sumLng = group.reduce((acc, p) => acc + p.longitude, 0);
        clustered.push({
          isCluster: true,
          lat: sumLat / group.length,
          lng: sumLng / group.length,
          count: group.length,
          places: group,
        });
      } else {
        clustered.push({
          isCluster: false,
          lat: place.latitude,
          lng: place.longitude,
          count: 1,
          place,
        });
      }
    }

    return clustered;
  };

  const getMarkerIcon = (place: PlaceInBounds) => {
    const style = getConfidenceStyle('policy', place.claim, place.agreeing_devices, place.runner_up_agreeing_devices);
    
    if (style.isSolid) {
      return createCustomPawIcon(style.backgroundColor);
    }
    
    return createUnconfirmedPawIcon(style.textColor);
  };

  const clusters = getClusters();

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
      {/* 
        WHY THE CSS FILTER:
        Applies a subtle warm sepia and saturation tint to pull the grayscale basemap
        toward our cutesy cream/pink brand palette. If road/city names become hard to read,
        dial the sepia or saturate percentage down instead of removing it completely.
      */}
      <style>{`
        .map-container .leaflet-tile-pane {
          filter: sepia(8%) saturate(85%) hue-rotate(-8deg);
        }
      `}</style>
      <MapContainer
        center={initialCenter}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="map-container"
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        {/*
          WHY CARTO POSITRON:
          CARTO Positron is an extremely light, clean basemap that minimizes visual road/highway noise,
          making our custom pink paw markers stand out as clear focal points.
          We choose this over CARTO Voyager because Voyager is too colorful/busy and clashes
          with our custom pink-and-white theme.
        */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapEvents onBoundsChange={onBoundsChange} onZoomChange={setZoom} />
        <MapController center={centerOverride} />

        {/* Render normal places and clusters */}
        {clusters.map((node, idx) => {
          if (node.isCluster) {
            return (
              <Marker
                key={`cluster-${idx}`}
                position={[node.lat, node.lng]}
                icon={createClusterIcon(node.count)}
              />
            );
          } else if (node.place) {
            const p = node.place;
            return (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                icon={getMarkerIcon(p)}
                eventHandlers={{
                  click: () => onSelectPlace(p),
                }}
              />
            );
          }
          return null;
        })}

        {/* Render ghost place selection from geocoder if present */}
        {ghostPlace && (
          <Marker
            position={[ghostPlace.latitude, ghostPlace.longitude]}
            icon={createGhostIcon()}
            eventHandlers={{
              click: () => onSelectGhostPlace(ghostPlace),
            }}
          />
        )}
      </MapContainer>

      {/* Viewport empty status indicator card */}
      {places.length === 0 && !ghostPlace && !hideExplainer && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
            zIndex: 999,
            textAlign: 'center',
            maxWidth: '300px',
            border: `2px dashed ${theme.colors.tan}`,
            fontFamily: theme.fonts.body,
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🐾</div>
          <h3 style={{ fontFamily: theme.fonts.heading, fontSize: '18px', color: theme.colors.terracotta, margin: '0 0 6px 0' }}>
            No furbaby spots here!
          </h3>
          <p style={{ fontSize: '12px', color: theme.colors.textMuted, margin: 0, lineHeight: '1.5' }}>
            No pet-friendly places reported in this area yet -- be the first! 🐾
          </p>
        </div>
      )}
    </div>
  );
};
