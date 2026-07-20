import { theme } from '../styles/theme';

export interface ConfidenceStyle {
  backgroundColor: string;
  /** Color used for the icon container and status badge text/background. On solid confirmed
   * styles this is white (for contrast on the colored background). On unconfirmed (dashed/outlined)
   * styles this is a muted color. */
  textColor: string;
  /** Color for the VALUE text in the list row. Separate from textColor because the value
   * sits on a *white card* background, so we want an accent color rather than white. */
  valueTextColor: string;
  borderColor: string;
  isSolid: boolean;
  borderStyle: 'solid' | 'dashed';
}

/**
 * Returns consistent styling configurations for badges and map pins based on confidence and values.
 *
 * WHY WE EXTRACT THIS:
 * Centralizing the confirmed vs unconfirmed logic prevents discrepancies where Map pins
 * and details badges render different visual states for the same consensus data.
 *
 * WHY TWO TEXT COLORS:
 * - `textColor`      → used where text/icon sits ON the colored background (badge pill, icon box).
 *                      Solid confirmed = white; unconfirmed = the accent color.
 * - `valueTextColor` → used where the human-readable value label sits on the WHITE card background.
 *                      Always the accent color (never white) so it stays readable.
 */
export function getConfidenceStyle(
  valueType: 'policy' | 'price' | 'menu' | 'req',
  value: string | null,
  agreeingDevices: number,
  runnerUpAgreeingDevices: number = 0
): ConfidenceStyle {
  const isDisputed = runnerUpAgreeingDevices >= 2 && 
                     (agreeingDevices - runnerUpAgreeingDevices) <= 1;

  if (isDisputed && value !== null) {
    const color = '#d97706'; // Amber warning color
    return {
      backgroundColor: '#fffbeb',
      textColor: color,
      valueTextColor: color,
      borderColor: color,
      isSolid: false,
      borderStyle: 'dashed',
    };
  }

  const isConfirmed = agreeingDevices >= 2 && value !== null;

  if (isConfirmed) {
    if (valueType === 'policy') {
      if (value === 'allowed') {
        return {
          backgroundColor: theme.colors.allowed, // Sage Green
          textColor: '#ffffff',
          valueTextColor: theme.colors.allowed,
          borderColor: theme.colors.allowed,
          isSolid: true,
          borderStyle: 'solid',
        };
      }
      if (value === 'not_allowed') {
        return {
          backgroundColor: theme.colors.notAllowed, // Coral Red
          textColor: '#ffffff',
          valueTextColor: theme.colors.notAllowed,
          borderColor: theme.colors.notAllowed,
          isSolid: true,
          borderStyle: 'solid',
        };
      }
      // outdoor_only intentionally falls through to unconfirmed visual treatment
    } else if (valueType === 'menu') {
      if (value === 'yes') {
        const color = '#059669';
        return {
          backgroundColor: color,
          textColor: '#ffffff',
          valueTextColor: color,
          borderColor: color,
          isSolid: true,
          borderStyle: 'solid',
        };
      }
      if (value === 'no') {
        return {
          backgroundColor: theme.colors.notAllowed,
          textColor: '#ffffff',
          valueTextColor: theme.colors.notAllowed,
          borderColor: theme.colors.notAllowed,
          isSolid: true,
          borderStyle: 'solid',
        };
      }
      // not_sure falls through to unconfirmed
    } else if (valueType === 'price') {
      if (value === 'budget') {
        const color = '#059669';
        return {
          backgroundColor: color,
          textColor: '#ffffff',
          valueTextColor: color,
          borderColor: color,
          isSolid: true,
          borderStyle: 'solid',
        };
      }
      if (value === 'mid') {
        return {
          backgroundColor: theme.colors.tan,
          textColor: '#ffffff',
          valueTextColor: theme.colors.tan,
          borderColor: theme.colors.tan,
          isSolid: true,
          borderStyle: 'solid',
        };
      }
      if (value === 'splurge') {
        const color = '#7c3aed';
        return {
          backgroundColor: color,
          textColor: '#ffffff',
          valueTextColor: color,
          borderColor: color,
          isSolid: true,
          borderStyle: 'solid',
        };
      }
    } else if (valueType === 'req') {
      // Requirements are always a neutral confirmed green pill — no per-value color semantics.
      // WHY: requirements are factual conditions (diaper/caged/stroller), not a quality judgment,
      // so we don't want warm/cool color coding implying good/bad.
      const color = '#059669';
      return {
        backgroundColor: '#f0fdf4', // light green tint for icon box
        textColor: color,
        valueTextColor: theme.colors.textDark,
        borderColor: color,
        isSolid: false, // use solid neutral, not bright fill
        borderStyle: 'solid',
      };
    }
  }

  // Unconfirmed / null value / outdoor_only (always outlined)
  let color = theme.colors.unconfirmed; // muted gray (#9CA3AF)

  if (value === 'outdoor_only') {
    color = theme.colors.outdoorOnly;
  }

  return {
    backgroundColor: value ? '#f8fafc' : '#ffffff', // very slight tint when pending, white when empty
    textColor: color,
    valueTextColor: value ? color : theme.colors.textMuted,
    borderColor: color,
    isSolid: false,
    borderStyle: value ? 'dashed' : 'solid',
  };
}
