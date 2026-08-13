import { motion } from 'framer-motion';

export default function Button({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = '',
  ...props 
}) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const isMenu = variant === 'menu';
  
  const baseClasses = 'text-body inline-flex items-center justify-center cursor-pointer border-none outline-none';
  
  // Design system strict rules:
  // Primary: Sun Yellow, 160px radius, 16px 24px padding
  // Ghost: Pure White fill, 1px black border, 96px radius, 8px 20px padding
  // Menu: Black fill, white text, 5px radius, 8px 16px padding
  
  let bgColor = 'transparent';
  let color = 'var(--color-ink)';
  let border = 'none';
  let radius = 'var(--radius-button)';
  let padding = '12px 24px';

  if (isPrimary) {
    bgColor = 'var(--color-sun-yellow)';
    radius = 'var(--radius-primary-action)';
    padding = '16px 24px';
  } else if (isGhost) {
    bgColor = 'var(--color-pure-white)';
    border = '1px solid var(--color-ink)';
    radius = 'var(--radius-button)';
    padding = '8px 20px';
  } else if (isMenu) {
    bgColor = 'var(--color-ink)';
    color = 'var(--color-pure-white)';
    radius = 'var(--radius-card)'; // 5px
    padding = '8px 16px';
  }

  return (
    <motion.button
      onClick={onClick}
      className={`${baseClasses} ${className}`}
      style={{
        backgroundColor: bgColor,
        color: color,
        border: border,
        borderRadius: radius,
        padding: padding,
      }}
      // Physics-driven spring animation
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
