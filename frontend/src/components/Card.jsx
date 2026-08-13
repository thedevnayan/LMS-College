import { motion } from 'framer-motion';

export default function Card({ 
  children, 
  className = '', 
  withBorder = false,
  bgColor = 'var(--color-paper-white)',
  ...props 
}) {
  return (
    <motion.div
      className={`shadow-none ${withBorder ? 'hairline-border' : ''} ${className}`}
      style={{
        backgroundColor: bgColor,
        borderRadius: 'var(--radius-card)', // 5px
        padding: '24px', // 20-30px internal padding
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
