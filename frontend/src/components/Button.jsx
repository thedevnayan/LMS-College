import React from 'react';

export default function Button({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = '',
  style: customStyle,
  ...props 
}) {
  const baseClasses = 'button-base inline-flex items-center justify-center font-medium cursor-pointer transition-colors';
  
  let styles = {
    padding: '16px 24px',
    borderRadius: 'var(--radius-primary-action)',
    border: 'none',
    fontSize: 'var(--text-body)',
    letterSpacing: 'var(--tracking-body)'
  };

  if (variant === 'primary') {
    styles.backgroundColor = 'var(--color-sun-yellow)';
    styles.color = 'var(--color-ink)';
    styles.boxShadow = 'none';
  } else if (variant === 'ghost') {
    styles.backgroundColor = 'var(--color-pure-white)';
    styles.color = 'var(--color-ink)';
    styles.border = '1px solid var(--color-ink)';
    styles.borderRadius = 'var(--radius-buttons)';
    styles.padding = '8px 20px';
    styles.boxShadow = 'none';
  } else if (variant === 'nav') {
    styles.backgroundColor = 'var(--color-ink)';
    styles.color = 'var(--color-pure-white)';
    styles.borderRadius = 'var(--radius-cards)';
    styles.padding = '8px 16px';
    styles.boxShadow = 'none';
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${className}`}
      style={{ ...styles, ...(customStyle || {}) }}
      {...props}
    >
      {children}
    </button>
  );
}
