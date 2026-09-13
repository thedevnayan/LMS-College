import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomSelect({ value, onChange, options, placeholder, name }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div 
      ref={containerRef} 
      style={{ position: 'relative', width: '100%', fontFamily: 'inherit' }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 'var(--radius-cards)',
          border: '1px solid var(--color-ink)',
          backgroundColor: 'var(--color-pure-white)',
          color: selectedOption ? 'var(--color-ink)' : 'var(--color-fog)',
          fontSize: 'var(--text-body)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: isOpen ? '2px 2px 0px var(--color-ink)' : 'none',
          transition: 'box-shadow 200ms ease',
        }}
      >
        <span style={{ 
          wordBreak: 'break-word',
          marginRight: '8px',
          lineHeight: '1.4'
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={18} 
          color="var(--color-ink)" 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease'
          }} 
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '100%',
              marginTop: '4px',
              backgroundColor: 'var(--color-pure-white)',
              border: '1px solid var(--color-ink)',
              borderRadius: 'var(--radius-cards)',
              boxShadow: '4px 4px 0px rgba(0,0,0,0.1)',
              maxHeight: '240px',
              overflowY: 'auto',
              zIndex: 100,
            }}
          >
            {options.length === 0 ? (
              <div style={{ padding: '12px 16px', color: 'var(--color-fog)', fontSize: '14px' }}>
                No options available
              </div>
            ) : (
              options.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange({ target: { name, value: opt.value } });
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: value === opt.value ? 'rgba(0,0,0,0.04)' : 'transparent',
                    color: 'var(--color-ink)',
                    fontSize: '14px',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    transition: 'background-color 150ms ease',
                    wordBreak: 'break-word',
                    lineHeight: '1.4'
                  }}
                  onMouseEnter={(e) => {
                    if (value !== opt.value) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                  }}
                  onMouseLeave={(e) => {
                    if (value !== opt.value) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title={opt.label} // Tooltip for long text
                >
                  {opt.label}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
