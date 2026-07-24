import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
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
 * Creates a dashed-outline "ghost" marker with a plus sign.
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
 * Creates dynamic, cutesy pet-themed cluster icons with size and color progression based on point count.
 */
function createClusterIcon(count: number) {
  let size: number;
  let bg: string;
  let border: string;
  let fontSize: string;

  if (count >= 10) {
    size = 46;
    bg = '#C8553D'; // Rich terracotta red
    border = '#FFF3E0';
    fontSize = '15px';
  } else if (count >= 5) {
    size = 40;
    bg = theme.colors.terracotta;
    border = '#FFE0B2';
    fontSize = '14px';
  } else {
    size = 34;
    bg = '#E07A5F'; // Warm pastel terracotta
    border = '#ffffff';
    fontSize = '12px';
  }

  return L.divIcon({
    className: 'custom-cluster',
    html: `
      <div style="
        background-color: ${bg};
        border: 2.5px solid ${border};
        color: #ffffff;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: ${fontSize};
        box-shadow: 0 4px 14px rgba(200, 85, 61, 0.35);
        font-family: ${theme.fonts.heading};
        cursor: pointer;
      ">
        ${count}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Calculates spiderfied ring coordinates for co-located cluster pins.
 */
function calculateSpiderfyRing(centerLat: number, centerLng: number, count: number) {
  const angleStep = (2 * Math.PI) / count;
  const radius = 0.0003; // ~30 meters ring radius
  return Array.from({ length: count }, (_, i) => {
    const angle = i * angleStep;
    return {
      lat: centerLat + radius * Math.sin(angle),
      lng: centerLng + radius * Math.cos(angle),
    };
  });
}

const MapEvents: React.FC<{
  onBoundsChange: (bounds: MapBounds) => void;
  onZoomChange: (zoom: number) => void;
  onClearSpiderfy: () => void;
}> = ({ onBoundsChange, onZoomChange, onClearSpiderfy }) => {
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
      onClearSpiderfy();
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
      map.flyTo(center, 15, { duration: 0.8, easeLinearity: 0.25 });
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
  onSpiderfy: (centerLat: number, centerLng: number, places: PlaceInBounds[]) => void;
}> = ({ clusterId, lat, lng, count, supercluster, onSpiderfy }) => {
  const map = useMap();

  const handleClick = () => {
    const currentZoom = map.getZoom();
    const expansionZoom = Math.min(
      supercluster.getClusterExpansionZoom(clusterId),
      18
    );

    if (expansionZoom > currentZoom && currentZoom < 18) {
      map.flyTo([lat, lng], expansionZoom, { duration: 0.8, easeLinearity: 0.25 });
    } else {
      // At max zoom or identical coordinates: Spiderfy leaf markers!
      const leaves = supercluster.getLeaves(clusterId, 50);
      const placeList = leaves.map((l) => l.properties?.place).filter(Boolean) as PlaceInBounds[];
      if (placeList.length > 0) {
        onSpiderfy(lat, lng, placeList);
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
 * Main styled Leaflet Map view drawing places, dynamic Supercluster spatial centroids, and spiderfy ring fanout.
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
  const [spiderfiedState, setSpiderfiedState] = useState<{
    center: [number, number];
    items: Array<{ place: PlaceInBounds; pos: { lat: number; lng: number } }>;
  } | null>(null);

  // Initialize Supercluster instance using screen-pixel distance clustering
  const supercluster = useMemo(() => {
    const sc = new Supercluster<SuperclusterPointProps>({
      radius: 50, // Standard screen-pixel cluster radius
      maxZoom: 16, // Cluster up to zoom level 16, separating when zooming in
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
    if (!places || places.length === 0) return [];
    return supercluster.getClusters([-180, -85, 180, 85], Math.floor(zoom));
  }, [supercluster, places, zoom]);

  const handleSpiderfyCluster = (centerLat: number, centerLng: number, leafPlaces: PlaceInBounds[]) => {
    const ringPositions = calculateSpiderfyRing(centerLat, centerLng, leafPlaces.length);
    const spiderfiedItems = leafPlaces.map((p, idx) => ({
      place: p,
      pos: ringPositions[idx],
    }));
    setSpiderfiedState({
      center: [centerLat, centerLng],
      items: spiderfiedItems,
    });
  };

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

        .custom-paw-pin > div, .custom-cluster > div, .custom-paw-unconfirmed > div, .custom-ghost-pin > div {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease-out;
          animation: markerPopIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .custom-paw-pin:hover > div, .custom-cluster:hover > div, .custom-paw-unconfirmed:hover > div, .custom-ghost-pin:hover > div {
          transform: scale(1.18);
        }

        @keyframes markerPopIn {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          70% {
            transform: scale(1.12);
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
          onClearSpiderfy={() => setSpiderfiedState(null)}
        />
        <MapController center={centerOverride} />
        <ZoomControls />

        {/* Render Supercluster points and centroids */}
        {clusters.map((feature, idx) => {
          const isCluster = feature.properties?.cluster;

          if (isCluster) {
            const [clusterLng, clusterLat] = feature.geometry.coordinates;
            const pointCount = (feature.properties as any).point_count;
            const clusterId = feature.id as number;

            return (
              <ClusterMarker
                key={`cluster-${clusterId || idx}`}
                clusterId={clusterId}
                lat={clusterLat}
                lng={clusterLng}
                count={pointCount}
                supercluster={supercluster}
                onSpiderfy={handleSpiderfyCluster}
              />
            );
          }

          const place = feature.properties?.place;
          if (!place) return null;

          return (
            <Marker
              key={place.id}
              position={[place.latitude, place.longitude]}
              icon={getMarkerIcon(place)}
              eventHandlers={{
                click: () => {
                  setSpiderfiedState(null);
                  onSelectPlace(place);
                },
              }}
            />
          );
        })}

        {/* Render Spiderfied fanout ring when co-located cluster is clicked */}
        {spiderfiedState && (
          <>
            {spiderfiedState.items.map((item) => (
              <React.Fragment key={`spider-group-${item.place.id}`}>
                <Polyline
                  positions={[spiderfiedState.center, [item.pos.lat, item.pos.lng]]}
                  pathOptions={{
                    color: theme.colors.terracotta,
                    weight: 2,
                    dashArray: '4, 4',
                    opacity: 0.8,
                  }}
                />
                <Marker
                  position={[item.pos.lat, item.pos.lng]}
                  icon={getMarkerIcon(item.place)}
                  eventHandlers={{
                    click: () => {
                      onSelectPlace(item.place);
                    },
                  }}
                />
              </React.Fragment>
            ))}
          </>
        )}

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
