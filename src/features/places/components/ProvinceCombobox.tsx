import React, { useState, useEffect, useRef } from 'react';
import { PROVINCES } from '../../../shared/constants/provinces';

interface ProvinceComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export const ProvinceCombobox: React.FC<ProvinceComboboxProps> = ({ value, onChange }) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state if value is changed externally (e.g. form reset)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = PROVINCES.filter((p) =>
    p.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (province: string) => {
    onChange(province);
    setQuery(province);
    setIsOpen(false);
  };

  const handleBlur = () => {
    // If the typed query is not a valid province, reset it
    const match = PROVINCES.find((p) => p.toLowerCase() === query.trim().toLowerCase());
    if (match) {
      handleSelect(match);
    } else {
      // Clear selection and input text
      onChange('');
      setQuery('');
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        placeholder="Search province..."
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid #ccc',
          backgroundColor: '#ffffff',
          color: '#1f2937',
          fontSize: '14px',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
      {isOpen && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            zIndex: 1100,
            maxHeight: '110px',
            overflowY: 'auto',
            marginTop: '4px',
            padding: '4px 0',
            listStyle: 'none',
            margin: 0,
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((prov) => (
              <li key={prov}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(prov)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#1f2937',
                    boxSizing: 'border-box',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {prov}
                </button>
              </li>
            ))
          ) : (
            <li style={{ padding: '8px 12px', fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
              No matching province found
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
