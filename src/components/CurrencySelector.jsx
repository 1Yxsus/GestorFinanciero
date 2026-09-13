import React, { useState, useRef, useEffect } from 'react';
import { CURRENCIES } from '../utils/formatters';
import { ChevronDown, Coins } from 'lucide-react';

export function CurrencySelector({ currentCurrency, onSelectCurrency }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedCurr = CURRENCIES.find(c => c.code === currentCurrency) || CURRENCIES[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        id="currency-selector-btn"
        aria-label="Seleccionar moneda"
        className="btn-spring flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold uppercase tracking-wider cursor-pointer border
          dark:bg-[#181822] dark:border-white/10 dark:text-[#f5f5f7] dark:hover:border-white/20
          bg-white border-[#121217] text-[#121217] shadow-[2px_2px_0px_#121217]"
      >
        <Coins className="w-3.5 h-3.5 text-[#ffbe1a] dark:text-[#00f0ff]" />
        <span>{selectedCurr.code}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-2xl py-1.5 z-50 border neo-card overflow-hidden
            dark:bg-[#181822] dark:border-white/15 dark:shadow-[0_15px_35px_rgba(0,0,0,0.8)]
            bg-white border-[#121217] shadow-[4px_4px_0px_#121217]"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-muted uppercase">
            Selecciona Divisa
          </div>
          {CURRENCIES.map((curr) => (
            <button
              key={curr.code}
              onClick={() => {
                onSelectCurrency(curr.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold cursor-pointer text-left transition-colors
                ${
                  curr.code === currentCurrency
                    ? 'dark:bg-[#00ff87]/15 dark:text-[#00ff87] bg-[#f3ede2] text-[#087f48] font-bold'
                    : 'dark:text-white/80 dark:hover:bg-white/5 text-[#121217] hover:bg-[#faf7f2]'
                }`}
            >
              <span>{curr.label}</span>
              <span className="font-num text-sm opacity-60">{curr.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
