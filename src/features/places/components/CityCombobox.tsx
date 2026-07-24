import React, { useState, useEffect, useRef } from 'react';
import { PH_CITIES } from '../../../shared/constants/ph-cities';

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  placeholder?: string;
  id?: string;
}

export const CityCombobox: React.FC<CityComboboxProps> = ({
  value,
  onChange,
  onBlur,
  error,
  placeholder = 'Search or select a city',
  id = 'city-combobox',
}) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize input text if external value changes (e.g., auto-filled from address selection)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click-outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredCities = PH_CITIES.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (city: string) => {
    onChange(city);
    setQuery(city);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            if (onBlur) onBlur();
          }}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: '40px',
            padding: '0 36px 0 10px',
            borderRadius: '8px',
            border: error ? '1px solid #ef4444' : '1px solid #ddd',
            backgroundColor: '#ffffff',
            color: '#2D3748',
            colorScheme: 'light',
            fontSize: '14px',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: 'absolute',
            right: '12px',
            pointerEvents: 'none',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isOpen && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            zIndex: 1200,
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '4px 0',
            listStyle: 'none',
            margin: 0,
          }}
        >
          {filteredCities.length > 0 ? (
            filteredCities.map((city) => (
              <li key={city}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(city);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#1f2937',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>{city}</span>
                  {value === city && <span style={{ color: '#e07a5f', fontWeight: 700 }}>✓</span>}
                </button>
              </li>
            ))
          ) : (
            <li style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
              Keep typing custom city: &quot;{query}&quot;
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
