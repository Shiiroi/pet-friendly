/**
 * Shared design token configuration for the "dreamy pet world" aesthetic.
 * Centralizes theme variables to maintain styling consistency across elements.
 */
export const theme = {
  colors: {
    // Warm bases
    background: '#FCFAF7',   // Cream/Sand base background
    softPink: '#FFF0F2',     // Pastel Pink secondary highlight
    terracotta: '#E07A5F',   // Terracotta primary brand color
    tan: '#F4A261',          // Soft amber accent

    // Policy status bases
    allowed: '#81B29A',      // Sage Green representing pet allowed status
    notAllowed: '#E76F51',   // Coral Red representing pet restricted status
    outdoorOnly: '#F4A261',  // Warm amber for outdoor only status
    unconfirmed: '#9CA3AF',  // Muted Gray for unverified/low confidence markers

    // Neutrals
    textDark: '#2D3748',
    textMuted: '#718096',
    borderLight: '#EDF2F7',
  },
  fonts: {
    heading: "'Fredoka', 'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
};
