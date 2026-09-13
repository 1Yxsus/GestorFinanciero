import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Target, History, Sparkles } from 'lucide-react';

export function MainTabNavigation({
  activeTab,
  onTabChange,
  reservesCount = 0,
  movementsCount = 0,
}) {
  const tabs = [
    {
      id: 'balance',
      label: 'Balance General',
      shortLabel: 'Balance',
      icon: Wallet,
      badge: null,
      color: '#00f0ff',
    },
    {
      id: 'reserves',
      label: 'Reservas y Fondos',
      shortLabel: 'Reservas',
      icon: Target,
      badge: reservesCount > 0 ? reservesCount : null,
      color: '#ffd000',
    },
    {
      id: 'history',
      label: 'Historial General',
      shortLabel: 'Historial',
      icon: History,
      badge: movementsCount > 0 ? movementsCount : null,
      color: '#00ff87',
    },
  ];

  return (
    <div className="hidden sm:block w-full max-w-4xl mx-auto mb-6 px-4 sm:px-6">
      <nav
        aria-label="Navegación entre vistas principales"
        className="relative grid grid-cols-3 p-1.5 rounded-2xl border neo-card transition-all
          dark:bg-[#12121a]/95 dark:border-white/15
          bg-white border-[#121217] shadow-[4px_4px_0px_#121217]"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              id={`nav-tab-${tab.id}`}
              className={`btn-spring relative z-10 flex items-center justify-center gap-2 py-3 sm:py-3.5 px-2 rounded-xl text-xs sm:text-sm font-display-title font-bold transition-all cursor-pointer select-none
                ${
                  isActive
                    ? 'text-black dark:text-black font-extrabold'
                    : 'text-muted hover:text-main hover:opacity-100'
                }`}
            >
              {/* Pastilla animada de selección con Framer Motion layoutId */}
              {isActive && (
                <motion.div
                  layoutId="activeMainTabPill"
                  className="absolute inset-0 rounded-xl z-[-1] transition-colors
                    dark:bg-gradient-to-r dark:from-[#00ff87] dark:via-[#00f0ff] dark:to-[#ffd000] dark:shadow-[0_0_20px_rgba(0,255,135,0.4)]
                    bg-[#ffd000] shadow-[2px_2px_0px_#121217]"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}

              <Icon
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${
                  isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[2]'
                }`}
              />

              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>

              {/* Badge con contador */}
              {tab.badge !== null && (
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-mono font-bold leading-none
                    ${
                      isActive
                        ? 'bg-black text-white dark:bg-black dark:text-[#00ff87]'
                        : 'bg-black/10 dark:bg-white/10 text-muted'
                    }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
