import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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
}

interface SuperclusterPointProps {
  cluster?: boolean;
  placeId?: string;
  place?: PlaceInBounds;
}

const MANILA_CENTER: [number, number] = [14.5995, 120.9842];
const DEFAULT_ZOOM = 12;

/**
 * Creates custom round paw-shaped markers.
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
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        font-family: ${theme.fonts.heading};
        cursor: pointer;
      ">
        ${count}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

const MapEvents: React.FC<{
  onBoundsChange: (bounds: MapBounds) => void;
  onZoomChange: (zoom: number) => void;
  onMapBoundsUpdate: (bounds: MapBounds) => void;
}> = ({ onBoundsChange, onZoomChange, onMapBoundsUpdate }) => {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      const newBounds = {
        minLat: b.getSouth(),
        minLng: b.getWest(),
        maxLat: b.getNorth(),
        maxLng: b.getEast(),
      };
      onBoundsChange(newBounds);
      onMapBoundsUpdate(newBounds);
    },
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    const b = map.getBounds();
    const newBounds = {
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    };
    onBoundsChange(newBounds);
    onMapBoundsUpdate(newBounds);
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

const ZoomControls: React.FC = () => {
  const map = useMap();

  return (
    <div
      style={{
        position: 'absolute',
        top: '80px',
        right: '16px',
        zIndex: 1000,
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
        onClick={() => map.zoomIn()}
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
          transition: 'all 0.15s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.softPink;
          e.currentTarget.style.color = theme.colors.terracotta;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.color = theme.colors.textDark;
        }}
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
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
          transition: 'all 0.15s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.softPink;
          e.currentTarget.style.color = theme.colors.terracotta;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.color = theme.colors.textDark;
        }}
      >
        −
      </button>
    </div>
  );
};

const ClusterMarker: React.FC<{
  clusterId: number;
  lat: number;
  lng: number;
  count: number;
  supercluster: Supercluster<SuperclusterPointProps, any>;
  onSelectPlace: (place: PlaceInBounds) => void;
}> = ({ clusterId, lat, lng, count, supercluster, onSelectPlace }) => {
  const map = useMap();

  const handleClick = () => {
    const currentZoom = map.getZoom();
    const expansionZoom = Math.min(
      supercluster.getClusterExpansionZoom(clusterId),
      18
    );

    if (expansionZoom > currentZoom) {
      map.setView([lat, lng], expansionZoom);
    } else {
      const leaves = supercluster.getLeaves(clusterId, 10);
      if (leaves && leaves.length > 0 && leaves[0].properties?.place) {
        onSelectPlace(leaves[0].properties.place);
      }
    }
  };

  return (
    <Marker
      position={[lat, lng]}
      icon={createClusterIcon(count)}
      eventHandlers={{ click: handleClick }}
    />
  );
};

/**
 * Main styled Leaflet Map view drawing places and high-performance Supercluster spatial centroids.
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
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  // Initialize Supercluster instance using screen-pixel distance clustering
  const supercluster = useMemo(() => {
    const sc = new Supercluster<SuperclusterPointProps>({
      radius: 45, // Cluster radius in screen pixels
      maxZoom: 16, // Maximum zoom level to cluster points
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

  const clusters = useMemo(() => {
    if (!mapBounds) return [];
    const bbox: [number, number, number, number] = [
      mapBounds.minLng,
      mapBounds.minLat,
      mapBounds.maxLng,
      mapBounds.maxLat,
    ];
    return supercluster.getClusters(bbox, Math.floor(zoom));
  }, [supercluster, mapBounds, zoom]);

  const getMarkerIcon = (place: PlaceInBounds) => {
    const style = getConfidenceStyle('policy', place.claim, place.agreeing_devices, place.runner_up_agreeing_devices);
    
    if (style.isSolid) {
      return createCustomPawIcon(style.backgroundColor);
    }
    
    return createUnconfirmedPawIcon(style.textColor);
  };

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
        .map-container .leaflet-tile-pane {
          filter: sepia(8%) saturate(85%) hue-rotate(-8deg);
        }

        .map-container .leaflet-marker-icon {
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease-out;
        }

        .custom-paw-pin, .custom-cluster, .custom-paw-unconfirmed, .custom-ghost-pin {
          animation: markerSpringPop 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: center center;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .custom-paw-pin:hover, .custom-cluster:hover, .custom-paw-unconfirmed:hover {
          transform: scale(1.18) !important;
          z-index: 1000 !important;
        }

        @keyframes markerSpringPop {
          0% {
            transform: scale(0.2);
            opacity: 0;
          }
          65% {
            transform: scale(1.16);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      <MapContainer
        center={initialCenter}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="map-container"
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapEvents
          onBoundsChange={onBoundsChange}
          onZoomChange={setZoom}
          onMapBoundsUpdate={setMapBounds}
        />
        <MapController center={centerOverride} />
        <ZoomControls />

        {/* Render Supercluster points and centroids */}
        {clusters.map((feature, idx) => {
          const [lng, lat] = feature.geometry.coordinates;
          const isCluster = feature.properties?.cluster;

          if (isCluster) {
            const pointCount = (feature.properties as any).point_count;
            const clusterId = feature.id as number;

            return (
              <ClusterMarker
                key={`cluster-${clusterId || idx}`}
                clusterId={clusterId}
                lat={lat}
                lng={lng}
                count={pointCount}
                supercluster={supercluster}
                onSelectPlace={onSelectPlace}
              />
            );
          }

          const place = feature.properties?.place;
          if (!place) return null;

          return (
            <Marker
              key={place.id}
              position={[lat, lng]}
              icon={getMarkerIcon(place)}
              eventHandlers={{
                click: () => onSelectPlace(place),
              }}
            />
          );
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
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
            textAlign: 'center',
            maxWidth: '320px',
            width: '90%',
            zIndex: 1000,
            pointerEvents: 'none',
            border: `2px dashed ${theme.colors.terracotta}`,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px', lineHeight: 1 }}>🐾🐾</div>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: theme.colors.terracotta,
              margin: '0 0 8px 0',
              fontFamily: theme.fonts.heading,
              letterSpacing: '-0.3px',
            }}
          >
            No furbaby spots here!
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: '#6b7c96',
              margin: 0,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            No pet-friendly places reported in this area yet -- be the first! 🐾
          </p>
        </div>
      )}
    </div>
  );
};
