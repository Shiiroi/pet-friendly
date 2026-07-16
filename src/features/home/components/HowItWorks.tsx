import React from 'react';
import { theme } from '../../../shared/styles/theme';

/**
 * Renders an illustrative 4-step explainer section guiding users
 * on how to search, report, and confirm pet policies.
 */
export const HowItWorks: React.FC = () => {
  const steps = [
    {
      title: 'Spot a Place 📍',
      desc: 'Look up a café, park, or mall you visited with your pet.',
    },
    {
      title: 'Share the Policy 🐾',
      desc: 'Report if pets are allowed inside, outdoor-only, or restricted.',
    },
    {
      title: 'Upvote & Verify 👍',
      desc: 'Fellow pet parents vote to confirm. 2+ agreements mark a place verified.',
    },
    {
      title: 'Help the Pack 🐕',
      desc: 'Grow our directory so no furbaby is ever turned away at the door.',
    },
  ];

  return (
    <div
      style={{
        padding: '80px 24px',
        backgroundColor: '#ffffff',
        fontFamily: theme.fonts.body,
        color: theme.colors.textDark,
        textAlign: 'center',
        borderTop: `2px dashed ${theme.colors.tan}`,
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '28px',
            color: theme.colors.terracotta,
            margin: '0 0 12px 0',
          }}
        >
          How It Works 🐾
        </h2>
        <p
          style={{
            fontSize: '15px',
            color: theme.colors.textMuted,
            margin: '0 0 48px 0',
            maxWidth: '560px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Help fellow pet parents find a place for their furbaby in 4 simple steps.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '32px',
          }}
        >
          {steps.map((step, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.01)',
                border: `1px solid ${theme.colors.borderLight}`,
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.softPink,
                  color: theme.colors.terracotta,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  margin: '0 auto 16px auto',
                  fontFamily: theme.fonts.heading,
                }}
              >
                {idx + 1}
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  margin: '0 0 8px 0',
                  color: theme.colors.textDark,
                }}
              >
                {step.title}
              </h3>
              <p style={{ fontSize: '13px', lineHeight: '1.5', color: theme.colors.textMuted, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
