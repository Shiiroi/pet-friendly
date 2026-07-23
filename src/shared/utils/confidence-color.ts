import { theme } from '../styles/theme';

export interface ConfidenceStyle {
  backgroundColor: string;
  textColor: string;
  valueTextColor: string;
  borderColor: string;
  isSolid: boolean;
  borderStyle: 'solid' | 'dashed';
}

/**
 * Returns styling configurations for badges and map pins based on confidence levels.
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
    const color = '#d97706';
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
          backgroundColor: theme.colors.allowed,
          textColor: '#ffffff',
          valueTextColor: theme.colors.allowed,
          borderColor: theme.colors.allowed,
          isSolid: true,
          borderStyle: 'solid',
        };
      }
      if (value === 'not_allowed') {
        return {
          backgroundColor: theme.colors.notAllowed,
          textColor: '#ffffff',
          valueTextColor: theme.colors.notAllowed,
          borderColor: theme.colors.notAllowed,
          isSolid: true,
          borderStyle: 'solid',
        };
      }
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
      // Format requirement badges with neutral green styling
      const color = '#059669';
      return {
        backgroundColor: '#f0fdf4',
        textColor: color,
        valueTextColor: theme.colors.textDark,
        borderColor: color,
        isSolid: false,
        borderStyle: 'solid',
      };
    }
  }

  // Format unconfirmed, null, or outdoor_only items with outlined styling
  let color = theme.colors.unconfirmed;

  if (value === 'outdoor_only') {
    color = theme.colors.outdoorOnly;
  }

  return {
    backgroundColor: value ? '#f8fafc' : '#ffffff',
    textColor: color,
    valueTextColor: value ? color : theme.colors.textMuted,
    borderColor: color,
    isSolid: false,
    borderStyle: value ? 'dashed' : 'solid',
  };
}
