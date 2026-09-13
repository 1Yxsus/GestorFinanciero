import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export function ThemeToggle({ isDark, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      id="theme-toggle-btn"
      aria-label="Alternar tema oscuro y claro"
      className="btn-spring relative flex items-center justify-center w-11 h-11 rounded-2xl cursor-pointer border transition-colors
        dark:bg-[#181822] dark:border-white/10 dark:text-[#ffd000] dark:hover:border-white/25
        bg-white border-[#121217] text-[#121217] shadow-[2px_2px_0px_#121217] hover:shadow-[3px_3px_0px_#121217]"
    >
      <motion.div
        key={isDark ? 'dark' : 'light'}
        initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {isDark ? (
          <Moon className="w-5 h-5 drop-shadow-[0_0_8px_rgba(255,208,0,0.5)]" />
        ) : (
          <Sun className="w-5 h-5 text-[#d9183b]" />
        )}
      </motion.div>
    </button>
  );
}
