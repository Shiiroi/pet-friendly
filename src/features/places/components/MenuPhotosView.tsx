import React, { useState } from 'react';
import { theme } from '../../../shared/styles/theme';
import type { MenuPhoto } from '../../../shared/types/pet-menu';
import { UploadMenuPhotoModal } from './UploadMenuPhotoModal';
import { MenuPhotoLightboxModal } from './MenuPhotoLightboxModal';

interface MenuPhotosViewProps {
  placeId?: string;
  placeName?: string;
  photos?: MenuPhoto[] | null;
  onPhotoUploaded?: (photo: MenuPhoto) => void;
}

export const MenuPhotosView: React.FC<MenuPhotosViewProps> = ({
  placeId,
  placeName = 'this place',
  photos = [],
  onPhotoUploaded,
}) => {
  const [activeTab, setActiveTab] = useState<'pet_menu' | 'regular_menu'>('pet_menu');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const safePhotos = photos || [];
  const petMenuPhotos = safePhotos.filter((p) => p.category === 'pet_menu');
  const regularMenuPhotos = safePhotos.filter((p) => p.category === 'regular_menu');
  const displayedPhotos = activeTab === 'pet_menu' ? petMenuPhotos : regularMenuPhotos;

  const handleOpenLightbox = (indexInTab: number) => {
    const targetPhoto = displayedPhotos[indexInTab];
    const globalIndex = safePhotos.findIndex((p) => p.id === targetPhoto.id);
    setLightboxIndex(globalIndex >= 0 ? globalIndex : 0);
  };

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '14px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: `1.5px solid ${theme.colors.softPink}`,
        fontFamily: theme.fonts.body,
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '16px' }}>📋</span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: theme.colors.textDark,
              fontFamily: theme.fonts.heading,
            }}
          >
            Menu Photos ({safePhotos.length})
          </span>
        </div>

        {placeId && (
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            style={{
              backgroundColor: theme.colors.softPink,
              color: theme.colors.terracotta,
              border: 'none',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(224, 122, 95, 0.15)',
            }}
          >
            📷 Upload Photo
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#f3f4f6',
          borderRadius: '12px',
          padding: '3px',
          marginBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('pet_menu')}
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: '9px',
            border: 'none',
            backgroundColor: activeTab === 'pet_menu' ? '#ffffff' : 'transparent',
            color: activeTab === 'pet_menu' ? theme.colors.terracotta : theme.colors.textMuted,
            fontWeight: activeTab === 'pet_menu' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: activeTab === 'pet_menu' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          🐾 Pet Menu ({petMenuPhotos.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('regular_menu')}
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: '9px',
            border: 'none',
            backgroundColor: activeTab === 'regular_menu' ? '#ffffff' : 'transparent',
            color: activeTab === 'regular_menu' ? theme.colors.terracotta : theme.colors.textMuted,
            fontWeight: activeTab === 'regular_menu' ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: activeTab === 'regular_menu' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          🍽️ Regular Menu ({regularMenuPhotos.length})
        </button>
      </div>

      {/* Photos Grid */}
      {displayedPhotos.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            border: '1px dashed #e5e7eb',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>
            {activeTab === 'pet_menu' ? '🐾' : '📷'}
          </div>
          <p style={{ fontSize: '12px', color: theme.colors.textMuted, margin: 0 }}>
            {activeTab === 'pet_menu'
              ? 'No pet menu photos uploaded yet. Tap "Upload Photo" to add one!'
              : 'No regular menu photos uploaded yet.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}
        >
          {displayedPhotos.map((photo, idx) => (
            <div
              key={photo.id}
              onClick={() => handleOpenLightbox(idx)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '10px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: `1px solid ${theme.colors.borderLight}`,
                backgroundColor: '#f3f4f6',
              }}
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Menu photo thumbnail'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'transform 0.2s ease',
                }}
              />
              {photo.caption && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    fontSize: '9px',
                    padding: '2px 4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && placeId && (
        <UploadMenuPhotoModal
          placeId={placeId}
          placeName={placeName}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={(newPhoto) => {
            if (onPhotoUploaded) onPhotoUploaded(newPhoto);
          }}
        />
      )}

      {/* Lightbox Viewer */}
      {lightboxIndex !== null && (
        <MenuPhotoLightboxModal
          photos={safePhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};
