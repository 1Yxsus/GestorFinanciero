import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  RefreshCw,
  ShieldCheck,
  Camera,
  Target,
  Wallet,
  History,
  Sliders,
  X,
  HelpCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Trash2,
  HardDrive,
  Wifi,
} from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { useMovements } from './hooks/useMovements';
import { useP2PSync } from './hooks/useP2PSync';
import { ThemeToggle } from './components/ThemeToggle';
import { CurrencySelector } from './components/CurrencySelector';
import { MainTabNavigation } from './components/MainTabNavigation';
import { BalanceHero } from './components/BalanceHero';
import { BudgetAlertsBanner } from './components/BudgetAlertsBanner';
import { ReservesOverview } from './components/ReservesOverview';
import { MonthNavigator } from './components/MonthNavigator';
import { MovementFeed } from './components/MovementFeed';
import { MovementForm } from './components/MovementForm';
import { ReserveModal } from './components/ReserveModal';
import { HowMoneyWorksModal } from './components/HowMoneyWorksModal';
import { EditMovementModal } from './components/EditMovementModal';
import { MonthlySnapshotModal } from './components/MonthlySnapshotModal';
import { SyncModal } from './components/SyncModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { ReserveDetailModal } from './components/ReserveDetailModal';
import { BalanceBreakdownModal } from './components/BalanceBreakdownModal';
import { StorageDiagnosticsModal } from './components/StorageDiagnosticsModal';
import { formatCurrency, formatMovementDate } from './utils/formatters';
import { calculateReserveMetrics, calculateWalletBreakdown } from './utils/budgetCalculations';

export function App() {
  const { isDark, toggleTheme } = useTheme();

  const {
    movements,
    reserves,
    allocations,
    categories,
    incomeSources,
    currency,
    selectedMonthKey,
    viewMode,
    searchQuery,
    filterCategory,
    filterReserve,
    filterType,
    metrics,
    upcomingPayment,
    alerts,
    visibleMovements,
    addMovement,
    updateMovement,
    deleteMovement,
    addReserve,
    updateReserve,
    deleteReserve,
    allocateToReserve,
    releaseFromReserve,
    addCategory,
    updateCategory,
    deleteCategory,
    addIncomeSource,
    deleteIncomeSource,
    setCurrency,
    setViewMode,
    setSearchQuery,
    setFilterCategory,
    setFilterReserve,
    setFilterType,
    previousMonth,
    nextMonth,
    resetToCurrentMonth,
  } = useMovements();

  // Vista activa: 'balance' | 'reserves' | 'history'
  const [currentView, setCurrentView] = useState('balance');

  // Estados de Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveToEdit, setReserveToEdit] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedReserveForDetail, setSelectedReserveForDetail] = useState(null);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const [breakdownModal, setBreakdownModal] = useState({ isOpen: false, mode: 'total' });
  const [preselectedReserveForMovement, setPreselectedReserveForMovement] = useState(null);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const logoClickRef = useRef({ count: 0, timer: null });

  // Triple toque secreto en el logo o atajo de teclado
  const handleLogoClick = () => {
    setCurrentView('balance');
    logoClickRef.current.count += 1;
    if (logoClickRef.current.count >= 3) {
      logoClickRef.current.count = 0;
      if (logoClickRef.current.timer) clearTimeout(logoClickRef.current.timer);
      setIsStorageModalOpen(true);
      showToast('⚡ Diagnóstico de Almacenamiento Local desbloqueado');
    } else {
      if (logoClickRef.current.timer) clearTimeout(logoClickRef.current.timer);
      logoClickRef.current.timer = setTimeout(() => {
        logoClickRef.current.count = 0;
      }, 2500);
    }
  };

  // Atajo de teclado global: Ctrl + Shift + S o Alt + S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) ||
        (e.altKey && (e.key === 's' || e.key === 'S'))
      ) {
        e.preventDefault();
        setIsStorageModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Desglose financiero por billetera (Efectivo, Yape/Plin, Banco)
  const walletBreakdown = useMemo(() => {
    return calculateWalletBreakdown({
      movements,
      allocations,
      reserves,
      totalReservado: metrics.totalReservado,
    });
  }, [movements, allocations, reserves, metrics.totalReservado]);

  const handleOpenBreakdown = (mode) => {
    setBreakdownModal({ isOpen: true, mode });
  };

  const showToast = (msg, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const message = typeof msg === 'string' ? msg : String(msg);
    let resolvedType = type;
    if (/error|falló|fallo/i.test(message)) resolvedType = 'error';
    else if (/eliminad|borrad/i.test(message)) resolvedType = 'delete';
    else if (/📸|foto|captur/i.test(message)) resolvedType = 'camera';
    else if (/sincroniz/i.test(message)) resolvedType = 'sync';

    setToast({ id: Date.now(), message, type: resolvedType });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const p2p = useP2PSync({
    onSyncSuccess: (stats) => {
      showToast(`¡Sincronizado con éxito! (+${stats.addedCount} nuevos registros)`);
    },
    onLiveUpdateReceived: (stats) => {
      const parts = [];
      if (stats.addedCount > 0) parts.push(`+${stats.addedCount} nuevos`);
      if (stats.updatedCount > 0) parts.push(`${stats.updatedCount} actualizados`);
      if (stats.deletedCount > 0) parts.push(`${stats.deletedCount} eliminados`);
      const detail = parts.length > 0 ? ` (${parts.join(', ')})` : '';
      showToast(`⚡ Sincronizado en tiempo real${detail}`, 'success');
    },
  });

  const handleOpenCreateReserve = () => {
    setReserveToEdit(null);
    setIsReserveModalOpen(true);
  };

  const handleEditReserve = (reserve) => {
    setReserveToEdit(reserve);
    setIsReserveModalOpen(true);
  };

  const handleSaveReserve = (reserveData) => {
    if (reserveToEdit) {
      updateReserve(reserveToEdit.id, reserveData);
      showToast('¡Reserva actualizada con éxito!');
    } else {
      addReserve(reserveData);
      showToast('¡Nueva reserva creada con éxito!');
    }
  };

  const handleDeleteReserve = (id) => {
    deleteReserve(id);
    showToast('Reserva eliminada.');
  };

  // Atajos de teclado para alternar entre las 3 vistas y añadir movimiento
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === '1') setCurrentView('balance');
      else if (e.key === '2') setCurrentView('reserves');
      else if (e.key === '3') setCurrentView('history');
      else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsFormOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col pb-28 sm:pb-12">
      {/* Toast Notification Flotante con Soporte Completo Dark/Light Mode */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm sm:max-w-md pointer-events-auto"
          >
            <div
              className="p-3 sm:p-3.5 rounded-2xl flex items-center gap-3 border transition-all
                dark:bg-[#181824] dark:border-white/20 dark:shadow-[0_16px_36px_rgba(0,0,0,0.85),0_0_20px_rgba(0,255,135,0.15)]
                bg-[#121217] text-white border-[#121217] shadow-[4px_4px_0px_#ffd000]"
            >
              {/* Icono Badge según tipo */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 font-bold
                  ${
                    toast.type === 'error'
                      ? 'bg-[#ff2e93]/20 text-[#ff2e93]'
                      : toast.type === 'delete'
                      ? 'bg-[#ff4365]/20 text-[#ff4365]'
                      : toast.type === 'camera'
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                      : toast.type === 'sync'
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                      : 'bg-[#00ff87]/20 text-[#00ff87]'
                  }`}
              >
                {toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-[#ff2e93]" />
                ) : toast.type === 'delete' ? (
                  <Trash2 className="w-4 h-4 text-[#ff4365]" />
                ) : toast.type === 'camera' ? (
                  <Camera className="w-4 h-4 text-[#00f0ff]" />
                ) : toast.type === 'sync' ? (
                  <RefreshCw className="w-4 h-4 text-[#00f0ff]" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#00ff87]" />
                )}
              </div>

              {/* Contenido del Mensaje */}
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-white leading-snug break-words">
                  {toast.message}
                </p>
              </div>

              {/* Botón Cerrar */}
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de Navegación Superior */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-xl border-b transition-colors
        dark:bg-[#0b0b0e]/85 dark:border-white/10
        bg-[#faf7f2]/90 border-[#121217]/15"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo / Marca Maximalista con Easter Egg de 3 toques */}
          <div
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 cursor-pointer select-none"
            title="Ir a Balance General (3 toques para Diagnóstico de Memoria)"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-display-title font-black text-base sm:text-lg border neo-border
              dark:bg-gradient-to-tr dark:from-[#00ff87] dark:to-[#00f0ff] dark:text-black dark:shadow-[0_0_15px_rgba(0,255,135,0.4)]
              bg-[#121217] text-[#ffd000] shadow-[3px_3px_0px_#121217]"
            >
              ⚡
            </div>
            <div>
              <span className="font-display-title font-black text-lg sm:text-xl tracking-tighter text-main block leading-none">
                AURUM
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mt-1">
                Presupuesto Inteligente
              </span>
            </div>
          </div>

          {/* Acciones de Cabecera */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Botón e Indicador de Estado P2P en Vivo */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className={`btn-spring px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                p2p.isLiveConnected
                  ? 'bg-[#00ff87]/15 border-[#00ff87]/50 text-[#087f48] dark:text-[#00ff87] shadow-[0_0_12px_rgba(0,255,135,0.25)]'
                  : p2p.syncStatus === 'connecting'
                  ? 'bg-[#ffd000]/15 border-[#ffd000]/50 text-[#ffd000]'
                  : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-muted hover:text-main'
              }`}
              title={
                p2p.isLiveConnected
                  ? 'P2P Conectado en tiempo real: los cambios se sincronizan en vivo'
                  : 'Sincronizar con otro dispositivo (P2P / QR)'
              }
            >
              {p2p.isLiveConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#00ff87] animate-pulse" />
                  <span className="hidden sm:inline font-bold">En vivo</span>
                  <Wifi className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 ${p2p.syncStatus === 'connecting' ? 'animate-spin text-[#ffd000]' : ''}`} />
                  <span className="hidden sm:inline">P2P</span>
                </>
              )}
            </button>

            <CurrencySelector
              currentCurrency={currency}
              onSelectCurrency={setCurrency}
            />

            <ThemeToggle
              isDark={isDark}
              toggleTheme={toggleTheme}
            />
          </div>
        </div>
      </header>

      {/* Selector de las 3 Vistas Principales (Solo en Desktop/Tablet - En móvil se usa la barra inferior) */}
      <div className="hidden sm:block pt-5">
        <MainTabNavigation
          activeTab={currentView}
          onTabChange={setCurrentView}
          reservesCount={reserves.filter((r) => r.active !== false).length}
          movementsCount={visibleMovements.length}
        />
      </div>

      {/* Contenido Principal con Transición Animada entre Vistas */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 pt-3 sm:pt-0 flex-1">
        <AnimatePresence mode="wait">
          {/* VISTA 1: BALANCE GENERAL */}
          {currentView === 'balance' && (
            <motion.div
              key="view-balance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Avisos prioritarios informativos */}
              <BudgetAlertsBanner
                alerts={alerts}
                onOpenReserve={handleEditReserve}
              />

              {/* Dashboard Hero limpio y minimalista con 3 tarjetas interactivas */}
              <BalanceHero
                metrics={metrics}
                currency={currency}
                onOpenNewMovement={() => setIsFormOpen(true)}
                onOpenSync={() => setIsSyncModalOpen(true)}
                onOpenSnapshot={() => setIsSnapshotOpen(true)}
                onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
                onOpenCategories={() => setIsCategoryModalOpen(true)}
                onOpenTotalBreakdown={() => handleOpenBreakdown('total')}
                onOpenReservesBreakdown={() => handleOpenBreakdown('reserves')}
                onOpenAvailableBreakdown={() => handleOpenBreakdown('available')}
              />

              {/* Tarjetas de Acceso Rápido y Resumen Contextual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* 1. Resumen Interactivo de Reservas */}
                <div className="p-5 rounded-2xl neo-card border dark:bg-[#13131a] bg-white border-[#121217]/15 shadow-[3px_3px_0px_#121217] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎯</span>
                        <div>
                          <h3 className="font-display-title font-bold text-sm sm:text-base text-main">
                            Tus Fondos y Reservas
                          </h3>
                          <span className="text-[11px] text-muted block font-semibold">
                            {reserves.length} {reserves.length === 1 ? 'reserva activa' : 'reservas activas'} · {formatCurrency(metrics.totalReservado, currency)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setCurrentView('reserves')}
                        className="btn-spring text-xs font-bold text-[#00f0ff] dark:text-[#00f0ff] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Ver todas ({reserves.length})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {reserves.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted border border-dashed rounded-xl dark:border-white/10 border-black/10">
                        No tienes reservas creadas aún.
                        <button
                          onClick={handleOpenCreateReserve}
                          className="block mx-auto mt-1 font-bold text-[#00ff87] underline cursor-pointer"
                        >
                          Crear primera reserva
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reserves.slice(0, 2).map((r) => {
                          const rMetrics = calculateReserveMetrics(r);
                          return (
                            <div
                              key={r.id}
                              onClick={() => setSelectedReserveForDetail(r)}
                              className="p-2.5 rounded-xl border dark:bg-[#0b0b0e] bg-black/[0.02] border-black/10 dark:border-white/10 flex items-center justify-between gap-2 cursor-pointer hover:border-[#ffd000]/50 transition-colors"
                              title="Ver detalle e historial"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-lg flex-shrink-0">{r.icon || '🎯'}</span>
                                <div className="min-w-0">
                                  <span className="font-bold text-xs text-main block truncate">{r.name}</span>
                                  <span className="text-[10px] text-muted block font-mono-num">
                                    {formatCurrency(r.currentAmount, currency)} de {formatCurrency(r.targetAmount, currency)} ({rMetrics.progreso}%)
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-muted font-mono-num">
                                {rMetrics.progreso >= 100 ? '✓ Listo' : `Faltan ${formatCurrency(rMetrics.faltante, currency)}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-black/5 dark:border-white/5 flex justify-end">
                    <button
                      onClick={() => setCurrentView('reserves')}
                      className="btn-spring px-3 py-1.5 rounded-xl text-xs font-bold border dark:bg-[#181822] bg-white text-main flex items-center gap-1.5 cursor-pointer"
                    >
                      <Target className="w-3.5 h-3.5 text-[#ffd000]" />
                      <span>Ir a Reservas y Metas ➔</span>
                    </button>
                  </div>
                </div>

                {/* 2. Resumen Interactivo de Últimos Movimientos */}
                <div className="p-5 rounded-2xl neo-card border dark:bg-[#13131a] bg-white border-[#121217]/15 shadow-[3px_3px_0px_#121217] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📜</span>
                        <div>
                          <h3 className="font-display-title font-bold text-sm sm:text-base text-main">
                            Movimientos Recientes
                          </h3>
                          <span className="text-[11px] text-muted block font-semibold">
                            Últimas transacciones registradas
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setCurrentView('history')}
                        className="btn-spring text-xs font-bold text-[#00ff87] dark:text-[#00ff87] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Ver historial ({movements.length})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {movements.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted border border-dashed rounded-xl dark:border-white/10 border-black/10">
                        No hay movimientos registrados aún.
                        <button
                          onClick={() => setIsFormOpen(true)}
                          className="block mx-auto mt-1 font-bold text-[#00ff87] underline cursor-pointer"
                        >
                          Registrar primer movimiento flash
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {movements.slice(0, 3).map((m) => {
                          const isIngreso = m.type === 'ingreso' || m.type === 'income';
                          return (
                            <div
                              key={m.id}
                              onClick={() => setEditingMovement(m)}
                              className="p-2.5 rounded-xl border dark:bg-[#0b0b0e] bg-black/[0.02] border-black/10 dark:border-white/10 flex items-center justify-between gap-2 cursor-pointer hover:border-black/30 dark:hover:border-white/30 transition-colors"
                              title="Editar movimiento"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-lg flex-shrink-0">{m.icon || (isIngreso ? '💵' : '💸')}</span>
                                <div className="min-w-0">
                                  <span className="font-bold text-xs text-main block truncate">{m.description}</span>
                                  <span className="text-[10px] text-muted block">{formatMovementDate(m.date)}</span>
                                </div>
                              </div>
                              <span
                                className={`font-num font-black text-xs ${
                                  isIngreso ? 'text-[#087f48] dark:text-[#00ff87]' : 'text-[#d9183b] dark:text-[#ff2e93]'
                                }`}
                              >
                                {isIngreso ? '+' : '-'}{formatCurrency(m.amount, currency)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-black/5 dark:border-white/5 flex justify-end">
                    <button
                      onClick={() => setCurrentView('history')}
                      className="btn-spring px-3 py-1.5 rounded-xl text-xs font-bold border dark:bg-[#181822] bg-white text-main flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#00ff87]" />
                      <span>Ir al Historial Completo ➔</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* VISTA 2: RESERVAS Y FONDOS ACTIVOS */}
          {currentView === 'reserves' && (
            <motion.div
              key="view-reserves"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Banner de Cabecera Unificado de Reservas */}
              <div className="p-4 sm:p-6 rounded-3xl neo-card border dark:bg-gradient-to-br dark:from-[#13131a] dark:to-[#181824] bg-white border-[#121217]/15 shadow-[4px_4px_0px_#ffd000] space-y-3.5">
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 sm:gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black/5 dark:bg-white/10 text-base sm:text-xl">
                        🎯
                      </span>
                      <h2 className="font-display-title font-black text-base sm:text-xl text-main leading-tight">
                        Reservas y Fondos Activos
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#ffd000]/15 text-[#b45309] dark:text-[#ffd000] border border-[#ffd000]/30 shrink-0">
                        {reserves.filter((r) => r.active !== false).length}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted font-medium mt-1 leading-snug">
                      Tu dinero apartado con propósito (pagos fijos, metas, emergencias) protegido de gastos impulsivos.
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] sm:text-xs font-bold uppercase text-muted block tracking-wider whitespace-nowrap">
                      Total Apartado:
                    </span>
                    <span className="font-num font-black text-lg sm:text-2xl text-[#b45309] dark:text-[#ffd000] block mt-0.5 whitespace-nowrap">
                      {formatCurrency(metrics.totalReservado, currency)}
                    </span>
                  </div>
                </div>

                {/* Barra de acción inferior con botón Nueva Reserva */}
                <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
                  <span className="text-[11px] sm:text-xs text-muted font-semibold">
                    {reserves.filter((r) => r.active !== false).length === 1 ? '1 fondo configurado' : `${reserves.filter((r) => r.active !== false).length} fondos configurados`}
                  </span>
                  <button
                    onClick={handleOpenCreateReserve}
                    id="add-reserve-btn"
                    className="btn-spring inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border
                      dark:bg-[#00ff87] dark:text-[#052e16] bg-[#121217] text-white border-[#121217] dark:border-transparent shadow-[2px_2px_0px_#121217] dark:shadow-[2px_2px_0px_#00ff87]/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Nueva Reserva</span>
                  </button>
                </div>
              </div>

              {/* Módulo Completo de Reservas con Cálculo de Ritmo y Auditoría */}
              <ReservesOverview
                reserves={reserves}
                movements={movements}
                allocations={allocations}
                currency={currency}
                onOpenCreateReserve={handleOpenCreateReserve}
                onEditReserve={handleEditReserve}
                onDeleteReserve={handleDeleteReserve}
                onSelectReserveForDetail={(res) => setSelectedReserveForDetail(res)}
                onAllocateFunds={(id, amt, note, wallet) => {
                  allocateToReserve(id, amt, note, wallet);
                  showToast('Fondos apartados a la reserva.');
                }}
                onReleaseFunds={(id, amt, note, wallet) => {
                  releaseFromReserve(id, amt, note, wallet);
                  showToast('Fondos liberados a tu saldo disponible.');
                }}
                onSpendFromReserve={(res) => {
                  setPreselectedReserveForMovement(res.id);
                  setIsFormOpen(true);
                }}
              />
            </motion.div>
          )}

          {/* VISTA 3: HISTORIAL GENERAL (MINIMALISTA Y ELEGANTE) */}
          {currentView === 'history' && (
            <motion.div
              key="view-history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Barra Superior Compacta de Historial */}
              <div className="p-2 sm:p-2.5 rounded-2xl border dark:bg-[#121218] bg-white border-[#121217]/10 dark:border-white/10 flex items-center justify-between gap-2">
                {/* Controles de Navegación Compactos */}
                <MonthNavigator
                  selectedMonthKey={selectedMonthKey}
                  viewMode={viewMode}
                  onPreviousMonth={previousMonth}
                  onNextMonth={nextMonth}
                  onResetCurrentMonth={resetToCurrentMonth}
                  onToggleViewMode={setViewMode}
                />

                {/* Botón rápido "+ Registrar" */}
                <button
                  onClick={() => setIsFormOpen(true)}
                  id="history-add-btn"
                  className="btn-spring px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0
                    dark:bg-[#00ff87] dark:text-black bg-[#121217] text-white shadow-xs hover:scale-105 active:scale-95 transition-transform"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span className="hidden xs:inline sm:inline">Registrar</span>
                </button>
              </div>

              {/* Listado de Transacciones con Filtros Avanzados y Búsqueda */}
              <MovementFeed
                movements={visibleMovements}
                reserves={reserves}
                categories={categories}
                currency={currency}
                searchQuery={searchQuery}
                filterCategory={filterCategory}
                filterReserve={filterReserve}
                filterType={filterType}
                onSearchChange={setSearchQuery}
                onFilterCategoryChange={setFilterCategory}
                onFilterReserveChange={setFilterReserve}
                onFilterTypeChange={setFilterType}
                onDeleteMovement={(id) => {
                  deleteMovement(id);
                  showToast('Movimiento eliminado.');
                }}
                onEditClick={(mov) => setEditingMovement(mov)}
                onOpenNewMovement={() => setIsFormOpen(true)}
                viewMode={viewMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Bar (Thumb Zone) - Ergonómica y alineada a las 3 vistas */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl border-t px-3 py-2 flex items-center justify-around
        dark:bg-[#0b0b0e]/95 dark:border-white/10
        bg-[#faf7f2]/95 border-[#121217]"
      >
        <button
          onClick={() => {
            setCurrentView('balance');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all cursor-pointer
            ${currentView === 'balance' ? 'text-[#087f48] dark:text-[#00ff87]' : 'text-muted'}`}
        >
          <span className="text-base">⚡</span>
          <span>Balance</span>
        </button>

        <button
          onClick={() => {
            setCurrentView('reserves');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`relative flex flex-col items-center gap-1 text-[11px] font-bold transition-all cursor-pointer
            ${currentView === 'reserves' ? 'text-[#b45309] dark:text-[#ffd000]' : 'text-muted'}`}
        >
          <span className="text-base">🎯</span>
          <span>Reservas</span>
          {reserves.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ffd000] text-black text-[9px] font-extrabold flex items-center justify-center">
              {reserves.length}
            </span>
          )}
        </button>

        {/* FAB Botón Flotante Central de Registro Flash */}
        <button
          onClick={() => setIsFormOpen(true)}
          id="mobile-fab-add-btn"
          aria-label="Registrar movimiento flash"
          className="btn-spring -mt-5 w-13 h-13 rounded-full flex items-center justify-center cursor-pointer border-2 shadow-lg
            dark:bg-gradient-to-tr dark:from-[#00ff87] dark:to-[#00f0ff] dark:text-black dark:border-black dark:shadow-[0_0_20px_rgba(0,255,135,0.6)]
            bg-[#121217] text-[#00ff87] border-[#121217] shadow-[3px_3px_0px_#121217]"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        <button
          onClick={() => {
            setCurrentView('history');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`relative flex flex-col items-center gap-1 text-[11px] font-bold transition-all cursor-pointer
            ${currentView === 'history' ? 'text-[#0284c7] dark:text-[#00f0ff]' : 'text-muted'}`}
        >
          <span className="text-base">📜</span>
          <span>Historial</span>
          {visibleMovements.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00f0ff] text-black text-[9px] font-extrabold flex items-center justify-center">
              {visibleMovements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsMoreMenuOpen(true)}
          id="mobile-more-btn"
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-muted hover:text-main transition-all cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          <span>Más</span>
        </button>
      </nav>

      {/* Menú Rápido "Más" para Mobile */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full sm:max-w-sm rounded-t-[32px] sm:rounded-3xl p-6 neo-card border z-10
                dark:bg-[#13131a] dark:border-white/15 bg-white border-[#121217]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-4">
                <span className="font-display-title font-black text-base text-main">Opciones y Herramientas</span>
                <button
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-1 rounded-lg text-muted hover:text-main"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsCategoryModalOpen(true);
                  }}
                  className="w-full p-3 rounded-xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 flex items-center gap-2.5 text-xs font-bold text-main"
                >
                  <Sliders className="w-4 h-4 text-[#ffd000]" />
                  <span>Mis Categorías y Fuentes</span>
                </button>

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsHowItWorksOpen(true);
                  }}
                  className="w-full p-3 rounded-xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 flex items-center gap-2.5 text-xs font-bold text-main"
                >
                  <HelpCircle className="w-4 h-4 text-[#00f0ff]" />
                  <span>¿Cómo funciona mi dinero?</span>
                </button>

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsSnapshotOpen(true);
                  }}
                  className="w-full p-3 rounded-xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 flex items-center gap-2.5 text-xs font-bold text-main"
                >
                  <Camera className="w-4 h-4 text-[#ffd000]" />
                  <span>Foto del Mes</span>
                </button>

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsSyncModalOpen(true);
                  }}
                  className="w-full p-3 rounded-xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 flex items-center gap-2.5 text-xs font-bold text-main"
                >
                  <RefreshCw className="w-4 h-4 text-[#00ff87]" />
                  <span>Sincronización P2P</span>
                </button>

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsStorageModalOpen(true);
                  }}
                  className="w-full p-3 rounded-xl border dark:bg-[#0b0b0e] bg-black/5 border-black/10 dark:border-white/10 flex items-center gap-2.5 text-xs font-bold text-main"
                >
                  <HardDrive className="w-4 h-4 text-[#00f0ff]" />
                  <span>Diagnóstico de Memoria</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal / Bottom Sheet de Registro de Movimiento Flash */}
      <MovementForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setPreselectedReserveForMovement(null);
        }}
        onSubmit={(data) => {
          addMovement(data);
          showToast(`¡${data.type === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado con éxito!`);
          setPreselectedReserveForMovement(null);
        }}
        reserves={reserves}
        categories={categories}
        incomeSources={incomeSources}
        currency={currency}
        initialLinkedReserveId={preselectedReserveForMovement}
      />

      {/* Modal para Crear y Editar Reservas */}
      <ReserveModal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        onSave={handleSaveReserve}
        reserveToEdit={reserveToEdit}
        categories={categories}
        currency={currency}
      />

      {/* Modal Didáctico: ¿Cómo funciona mi dinero? */}
      <HowMoneyWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        metrics={metrics}
        reserves={reserves}
        currency={currency}
      />

      {/* Modal de Edición de Movimiento */}
      <EditMovementModal
        isOpen={Boolean(editingMovement)}
        movement={editingMovement}
        currency={currency}
        categories={categories}
        reserves={reserves}
        onClose={() => setEditingMovement(null)}
        onSave={(id, updated) => {
          updateMovement(id, updated);
          showToast('Movimiento actualizado.');
        }}
        onDelete={(id) => {
          deleteMovement(id);
          showToast('Movimiento eliminado.');
        }}
      />

      {/* Modal de Foto del Mes */}
      <MonthlySnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        metrics={metrics}
        currency={currency}
        selectedMonthKey={selectedMonthKey}
        movements={visibleMovements}
        onToast={showToast}
      />

      {/* Modal de Sincronización Dual P2P */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        p2p={p2p}
        currency={currency}
        onOpenStorageDiagnostics={() => {
          setIsSyncModalOpen(false);
          setIsStorageModalOpen(true);
        }}
      />

      {/* Modal Secreto de Diagnóstico de Almacenamiento LocalStorage */}
      <StorageDiagnosticsModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
      />

      {/* Modal de Gestión de Categorías y Orígenes de Ingreso */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        incomeSources={incomeSources}
        onAddCategory={(cat) => {
          addCategory(cat);
          showToast('¡Categoría añadida con éxito!');
        }}
        onDeleteCategory={(id) => {
          deleteCategory(id);
          showToast('Categoría eliminada.');
        }}
        onAddIncomeSource={(src) => {
          addIncomeSource(src);
          showToast('¡Origen de ingreso añadido!');
        }}
        onDeleteIncomeSource={(id) => {
          deleteIncomeSource(id);
          showToast('Origen de ingreso eliminado.');
        }}
      />

      {/* Modal de Detalle e Historial de Reserva */}
      <ReserveDetailModal
        isOpen={Boolean(selectedReserveForDetail)}
        onClose={() => setSelectedReserveForDetail(null)}
        reserve={
          selectedReserveForDetail
            ? reserves.find((r) => r.id === selectedReserveForDetail.id) || selectedReserveForDetail
            : null
        }
        allocations={allocations}
        movements={movements}
        currency={currency}
        onAllocateFunds={(id, amt, note, wallet) => {
          allocateToReserve(id, amt, note, wallet);
          showToast('Fondos apartados a la reserva.');
        }}
        onReleaseFunds={(id, amt, note, wallet) => {
          releaseFromReserve(id, amt, note, wallet);
          showToast('Fondos liberados a tu saldo disponible.');
        }}
        onEditReserve={handleEditReserve}
      />

      {/* Modal de Desglose de Saldo Total, Reservas y Disponible Hoy */}
      <BalanceBreakdownModal
        isOpen={breakdownModal.isOpen}
        onClose={() => setBreakdownModal((prev) => ({ ...prev, isOpen: false }))}
        mode={breakdownModal.mode}
        breakdown={walletBreakdown}
        reserves={reserves}
        currency={currency}
        onNavigateToReserves={() => {
          setBreakdownModal((prev) => ({ ...prev, isOpen: false }));
          setCurrentView('reserves');
        }}
        onOpenCreateReserve={() => {
          setBreakdownModal((prev) => ({ ...prev, isOpen: false }));
          handleOpenCreateReserve();
        }}
        onSelectReserveDetail={(res) => {
          setBreakdownModal((prev) => ({ ...prev, isOpen: false }));
          setSelectedReserveForDetail(res);
        }}
      />
    </div>
  );
}

export default App;
