import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { theme } from '../../../shared/styles/theme';
import type { MenuPhoto } from '../../../shared/types/pet-menu';

interface MenuPhotoLightboxModalProps {
  photos: MenuPhoto[];
  initialIndex?: number;
  onClose: () => void;
}

export const MenuPhotoLightboxModal: React.FC<MenuPhotoLightboxModalProps> = ({
  photos,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!photos || photos.length === 0) return null;
  const currentPhoto = photos[currentIndex] || photos[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header bar */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10001,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: currentPhoto.category === 'pet_menu' ? theme.colors.terracotta : '#374151',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {currentPhoto.category === 'pet_menu' ? '🐾 Pet Menu' : '🍽️ Regular Menu'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
            {currentIndex + 1} of {photos.length}
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          &times;
        </button>
      </div>

      {/* Main image container */}
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '75vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={currentPhoto.url}
          alt={currentPhoto.caption || 'Menu photo'}
          style={{
            maxWidth: '100%',
            maxHeight: '75vh',
            objectFit: 'contain',
            borderRadius: '12px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
        />

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              style={{
                position: 'absolute',
                left: '-20px',
                backgroundColor: 'rgba(255,255,255,0.25)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              ‹
            </button>
            <button
              onClick={handleNext}
              style={{
                position: 'absolute',
                right: '-20px',
                backgroundColor: 'rgba(255,255,255,0.25)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Caption bar */}
      {currentPhoto.caption && (
        <div
          style={{
            marginTop: '16px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '10px 20px',
            borderRadius: '20px',
            color: '#ffffff',
            fontSize: '13px',
            textAlign: 'center',
            maxWidth: '80vw',
          }}
        >
          {currentPhoto.caption}
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(modalContent, document.body);
};
