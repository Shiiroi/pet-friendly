import React, { useState } from 'react';
import { theme } from '../../../shared/styles/theme';

interface NicknamePromptProps {
  /** Controller state showing if modal is visible. */
  isOpen: boolean;
  /** Triggered when the user skips or closes the modal. */
  onClose: () => void;
  /** Callback triggered when a nickname value is confirmed. */
  onSubmitNickname: (nickname: string) => Promise<void>;
}

/**
 * Renders a dialog prompting contributors to associate a nickname with their device.
 */
export const NicknamePrompt: React.FC<NicknamePromptProps> = ({
  isOpen,
  onClose,
  onSubmitNickname,
}) => {
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmitNickname(nickname.trim());
      onClose();
    } catch (err) {
      console.error('[Nickname Prompt Submission Failed]:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('nickname_prompted', 'true');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)',
          textAlign: 'center',
          fontFamily: theme.fonts.body,
          color: theme.colors.textDark,
          border: `2px solid ${theme.colors.softPink}`,
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h3
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '22px',
            color: theme.colors.terracotta,
            margin: '0 0 12px 0',
          }}
        >
          Thank you for your contribution!
        </h3>
        <p style={{ fontSize: '14px', color: theme.colors.textMuted, margin: '0 0 12px 0', lineHeight: '1.5' }}>
          Want a name to go with your contributions? You can set an optional nickname for this device.
        </p>
        <p style={{ fontSize: '11px', color: theme.colors.textMuted, margin: '0 0 20px 0', fontStyle: 'italic', lineHeight: '1.4' }}>
          (Optional: This nickname will be shown publicly next to your spot contributions and updates. No login required! 🐾)
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter nickname (e.g. DogLover42) 🐾"
            disabled={isSubmitting}
            maxLength={30}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: `1px solid ${theme.colors.borderLight}`,
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '20px',
            }}
          />

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              style={{
                background: 'none',
                border: 'none',
                color: theme.colors.textMuted,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                padding: '10px 16px',
              }}
            >
              Maybe later
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nickname.trim()}
              style={{
                backgroundColor: theme.colors.terracotta,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: nickname.trim() ? '0 4px 10px rgba(224, 122, 95, 0.2)' : 'none',
                opacity: nickname.trim() ? 1 : 0.6,
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Name 🐾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
