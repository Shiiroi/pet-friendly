import React, { useState } from 'react';
import { theme } from '../../../shared/styles/theme';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        borderBottom: `1px solid ${theme.colors.borderLight}`,
        padding: '16px 0',
        textAlign: 'left',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: theme.fonts.body,
          fontSize: '16px',
          fontWeight: 600,
          color: theme.colors.textDark,
          outline: 'none',
        }}
      >
        <span>{question}</span>
        <span style={{ fontSize: '18px', color: theme.colors.terracotta }}>
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <p
          style={{
            marginTop: '8px',
            fontSize: '14px',
            lineHeight: '1.6',
            color: theme.colors.textMuted,
            margin: '8px 0 0 0',
          }}
        >
          {answer}
        </p>
      )}
    </div>
  );
};

/**
 * Renders the FAQ accordion block containing answers to common queries
 * regarding the RLS no-login model and verification rules.
 */
export const FAQ: React.FC = () => {
  const faqs = [
    {
      question: 'Do I need an account to report a place?',
      answer: 'No! To keep it simple and accessible, you do not need to register. We generate a secure anonymous identifier for your device, allowing you to submit reports and track your contribution counts immediately.',
    },
    {
      question: 'How does verification work?',
      answer: 'A place policy is verified once at least 2 distinct devices agree on the same claim (e.g. "Allowed"). Single reports show as pending to ensure we maintain confidence in our pet-friendly directory.',
    },
    {
      question: 'What if a place policy changes or is wrong?',
      answer: 'You can submit a correction report! We use majority consensus to update status dynamically. If a place receives multiple spam flags, it automatically goes under review for manual adjustment.',
    },
  ];

  return (
    <div
      style={{
        padding: '80px 24px',
        backgroundColor: theme.colors.background,
        fontFamily: theme.fonts.body,
        color: theme.colors.textDark,
        textAlign: 'center',
        borderTop: `2px dashed ${theme.colors.tan}`,
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '28px',
            color: theme.colors.terracotta,
            margin: '0 0 12px 0',
          }}
        >
          Frequently Asked Questions 🐾
        </h2>
        <p
          style={{
            fontSize: '15px',
            color: theme.colors.textMuted,
            margin: '0 0 40px 0',
          }}
        >
          Everything you need to know about contributing to Compaws.
        </p>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
            border: `1px solid ${theme.colors.borderLight}`,
          }}
        >
          {faqs.map((faq, idx) => (
            <FAQItem key={idx} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </div>
  );
};
