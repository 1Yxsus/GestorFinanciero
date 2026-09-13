import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export function BudgetAlertsBanner({ alerts = [], onOpenReserve, onOpenEditMovement }) {
  const [dismissedAlerts, setDismissedAlerts] = useState({});

  const activeAlerts = alerts.filter((a) => !dismissedAlerts[a.id]);

  if (activeAlerts.length === 0) return null;

  const handleDismiss = (id) => {
    setDismissedAlerts((prev) => ({ ...prev, [id]: true }));
  };

  const getAlertStyles = (type) => {
    switch (type) {
      case 'danger':
        return {
          bg: 'dark:bg-[#ff2e93]/15 bg-[#d9183b]/10',
          border: 'dark:border-[#ff2e93]/40 border-[#d9183b]/30',
          text: 'dark:text-[#ff4365] text-[#d9183b]',
          icon: <AlertTriangle className="w-4 h-4 text-[#ff2e93] flex-shrink-0 mt-0.5" />,
        };
      case 'warning':
        return {
          bg: 'dark:bg-[#ffd000]/15 bg-[#ffd000]/15',
          border: 'dark:border-[#ffd000]/40 border-[#ffd000]/50',
          text: 'dark:text-[#ffd000] text-[#92400e]',
          icon: <AlertCircle className="w-4 h-4 text-[#ffd000] flex-shrink-0 mt-0.5" />,
        };
      case 'success':
        return {
          bg: 'dark:bg-[#00ff87]/15 bg-[#087f48]/10',
          border: 'dark:border-[#00ff87]/40 border-[#087f48]/30',
          text: 'dark:text-[#00ff87] text-[#087f48]',
          icon: <CheckCircle className="w-4 h-4 text-[#00ff87] flex-shrink-0 mt-0.5" />,
        };
      case 'info':
      default:
        return {
          bg: 'dark:bg-[#00f0ff]/15 bg-[#00f0ff]/10',
          border: 'dark:border-[#00f0ff]/40 border-[#00f0ff]/30',
          text: 'dark:text-[#00f0ff] text-[#0369a1]',
          icon: <Info className="w-4 h-4 text-[#00f0ff] flex-shrink-0 mt-0.5" />,
        };
    }
  };

  return (
    <div className="mb-6 space-y-2.5">
      <AnimatePresence>
        {activeAlerts.map((alert) => {
          const styles = getAlertStyles(alert.type);

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border neo-card ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-base">{alert.iconEmoji || styles.icon}</span>
                <div className="min-w-0">
                  <span className={`text-xs font-black uppercase tracking-wider block ${styles.text}`}>
                    {alert.title}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-main mt-0.5 leading-snug">
                    {alert.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="p-1 rounded-lg text-muted hover:text-main cursor-pointer"
                  title="Descartar aviso"
                  aria-label="Descartar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
