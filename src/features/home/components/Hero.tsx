import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../shared/api/supabase-client';
import { theme } from '../../../shared/styles/theme';

interface HeroProps {
  /** Callback triggered when clicking the browse CTA button. */
  onBrowseClick: () => void;
}

/**
 * Renders the introductory landing banner at the top of the hybrid homepage.
 * 
 * WHY QUERY IN REAL TIME:
 * We pull active statistics directly from Supabase to create a sense of community activity,
 * encouraging users to contribute reviews.
 */
export const Hero: React.FC<HeroProps> = ({ onBrowseClick }) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['home-stats'],
    queryFn: async () => {
      // Execute aggregate queries in parallel to optimize connection load
      const [totalRes, confirmedRes, citiesRes] = await Promise.all([
        supabase.from('places').select('*', { count: 'exact', head: true }).neq('status', 'delisted'),
        supabase.from('places').select('*', { count: 'exact', head: true }).eq('status', 'verified'),
        supabase.from('places').select('city'),
      ]);

      const uniqueCities = new Set(
        (citiesRes.data || [])
          .map((c) => c.city?.trim())
          .filter(Boolean)
      );

      return {
        total: totalRes.count || 0,
        confirmed: confirmedRes.count || 0,
        cities: uniqueCities.size || 0,
      };
    },
  });

  return (
    <div
      style={{
        backgroundColor: theme.colors.softPink,
        fontFamily: theme.fonts.body,
        color: theme.colors.textDark,
        padding: '60px 24px',
        textAlign: 'center',
        borderBottom: `2px dashed ${theme.colors.tan}`,
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '36px',
            fontWeight: 700,
            color: theme.colors.terracotta,
            margin: '0 0 16px 0',
            lineHeight: '1.2',
          }}
        >
          Find a safe space for your furbaby to explore! 🐾
        </h1>
        <p
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: theme.colors.textMuted,
            margin: '0 0 32px 0',
          }}
        >
          A crowdsourced, verification-backed directory of pet-friendly places in the Philippines.
          Help fellow pet parents find a place for their furbaby.
        </p>

        <button
          onClick={onBrowseClick}
          style={{
            backgroundColor: theme.colors.terracotta,
            color: '#ffffff',
            border: 'none',
            borderRadius: '24px',
            padding: '12px 32px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(224, 122, 95, 0.4)',
            transition: 'transform 0.2s ease-out, background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Browse Places 🐾
        </button>

        {/* Live Aggregates Stats Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: '48px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
          }}
        >
          {[
            { label: 'Places Tracked', value: isLoading ? '...' : stats?.total },
            { label: 'Verified Friendly', value: isLoading ? '...' : stats?.confirmed },
            { label: 'Cities Covered', value: isLoading ? '...' : stats?.cities },
          ].map((item, idx) => (
            <div key={idx} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: theme.colors.terracotta,
                  fontFamily: theme.fonts.heading,
                }}
              >
                {item.value}
              </div>
              <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginTop: '4px' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
