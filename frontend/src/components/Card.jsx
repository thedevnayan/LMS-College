import React from 'react';

export default function Card({ 
  children, 
  className = '', 
  color = 'paper',
  ...props 
}) {
  let bgColor = 'var(--color-paper-white)';
  if (color === 'lime') bgColor = 'var(--color-lime-burst)';
  if (color === 'yellow') bgColor = 'var(--color-sun-yellow)';
  if (color === 'periwinkle') bgColor = 'var(--color-periwinkle)';
  if (color === 'sand') bgColor = 'var(--color-sand)';

  return (
    <div
      className={`card-base ${className}`}
      style={{
        backgroundColor: bgColor,
        borderRadius: 'var(--radius-cards)',
        padding: '24px',
        boxShadow: 'none',
        border: 'none',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
