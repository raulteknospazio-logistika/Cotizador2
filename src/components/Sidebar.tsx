import React, { useState } from 'react';
import { UserProfile } from '../types';

interface SidebarProps {
  user: UserProfile;
  activeTab: 'cliente' | 'cotizador' | 'presupuesto' | 'catalogo' | 'admin';
  cloudConnected?: boolean;
  onSelectTab: (tab: 'cliente' | 'cotizador' | 'presupuesto' | 'catalogo' | 'admin') => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  cloudConnected = false,
  onSelectTab,
  onLogout,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(
    activeTab === 'catalogo' || activeTab === 'admin'
  );

  const roleLabels: Record<string, string> = {
    seller: 'Vendedor',
    technician: 'Técnico',
    master_technician: 'Técnico Master',
    admin: 'Administrador',
  };

  const isSeller = user.role === 'seller';
  const isTechnician = user.role === 'technician' || user.role === 'master_technician';
  const isMasterTechnician = user.role === 'master_technician';
  const isAdmin = user.role === 'admin';

  const userSubtitle = user.store_name || user.store || roleLabels[user.role] || user.role;

  const handleNavClick = (tab: 'cliente' | 'cotizador' | 'presupuesto' | 'catalogo' | 'admin') => {
    onSelectTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE TOP BAR (Visible on screens < lg) */}
      <div className="lg:hidden sticky top-0 z-40 bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between no-print shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition"
            aria-label="Abrir menú"
          >
            <i className={`fa-solid ${mobileOpen ? 'fa-xmark text-lg' : 'fa-bars text-lg'}`}></i>
          </button>
          <img
            src="/assets/aistudio/logo-Tekno-Spazio-blanco-png_e3d30b93.png"
            alt="Tekno Spazio"
            className="h-7 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-teal-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 max-w-[150px] truncate">
            {user.display_name}
          </span>
        </div>
      </div>

      {/* BACKDROP OVERLAY FOR MOBILE */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity no-print"
        />
      )}

      {/* MAIN SIDEBAR NAVIGATION DRAWER */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-slate-300 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out no-print ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* TOP BRANDING & LOGO */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <img
              src="/assets/aistudio/logo-Tekno-Spazio-blanco-png_e3d30b93.png"
              alt="Tekno Spazio"
              className="w-40 h-auto object-contain"
            />
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>

          {/* CLOUD CONNECTION STATUS */}
          <div className="pt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                cloudConnected
                  ? 'bg-teal-950/90 text-teal-300 border-teal-700/60'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <i className={`fa-solid ${cloudConnected ? 'fa-cloud text-teal-400' : 'fa-database text-slate-400'}`}></i>
              {cloudConnected ? 'Supabase Cloud' : 'Local Storage'}
            </span>
          </div>

          {/* USER INFO PROFILE BADGE */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-0.5">
            <p className="text-xs font-bold text-white truncate" title={user.display_name}>
              {user.display_name}
            </p>
            <p className="text-[11px] text-teal-400 font-medium flex items-center gap-1">
              <i className="fa-solid fa-user-gear text-[10px]"></i>
              <span>{roleLabels[user.role]} · {userSubtitle}</span>
            </p>
          </div>
        </div>

        {/* NAVIGATION LINKS MENU */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scroll">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 pb-1">
            Menú Principal
          </div>

          {/* 1. CLIENTES (All Roles) */}
          <button
            type="button"
            onClick={() => handleNavClick('cliente')}
            aria-selected={activeTab === 'cliente'}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'cliente'
                ? 'bg-teal-600 text-white shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-users text-base w-5 text-center text-teal-400"></i>
            <span>1. Clientes</span>
          </button>

          {/* 2. COTIZACIÓN (All Roles) */}
          <button
            type="button"
            onClick={() => handleNavClick('cotizador')}
            aria-selected={activeTab === 'cotizador'}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'cotizador'
                ? 'bg-teal-600 text-white shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-calculator text-base w-5 text-center text-teal-400"></i>
            <span>2. Cotización</span>
          </button>

          {/* 3. PRESUPUESTO (Vendedor & Admin only; hidden for Técnico) */}
          {!isTechnician && (
            <button
              type="button"
              onClick={() => handleNavClick('presupuesto')}
              aria-selected={activeTab === 'presupuesto'}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === 'presupuesto'
                  ? 'bg-teal-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-file-invoice-dollar text-base w-5 text-center text-teal-400"></i>
              <span>3. Presupuesto</span>
            </button>
          )}

          {/* CONFIGURACIÓN SECTION (ADMIN ONLY - Rueda de Configuración) */}
          {isAdmin && (
            <div className="pt-4 border-t border-slate-800/80 mt-3 space-y-1">
              <button
                type="button"
                onClick={() => setConfigOpen(!configOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-gear text-slate-400"></i>
                  <span>Configuración</span>
                </span>
                <i className={`fa-solid text-[10px] ${configOpen ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
              </button>

              {configOpen && (
                <div className="pl-3 space-y-1 pt-1">
                  {/* 4. CATÁLOGO */}
                  <button
                    type="button"
                    onClick={() => handleNavClick('catalogo')}
                    aria-selected={activeTab === 'catalogo'}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeTab === 'catalogo'
                        ? 'bg-teal-700 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <i className="fa-solid fa-boxes-stacked w-4 text-center text-teal-400"></i>
                    <span>4. Catálogo</span>
                  </button>

                  {/* 5. ADMIN */}
                  <button
                    type="button"
                    onClick={() => handleNavClick('admin')}
                    aria-selected={activeTab === 'admin'}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeTab === 'admin'
                        ? 'bg-purple-700 text-white shadow-sm font-bold'
                        : 'text-purple-300 hover:bg-purple-950/60 hover:text-purple-200'
                    }`}
                  >
                    <i className="fa-solid fa-user-shield w-4 text-center text-purple-400"></i>
                    <span>5. Admin</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM FOOTER: SALIR / LOGOUT BUTTON */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-red-950/80 text-slate-300 hover:text-red-300 border border-slate-700/60 hover:border-red-800 text-xs font-bold transition shadow-xs"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-red-400"></i>
            <span>Salir</span>
          </button>
        </div>
      </aside>
    </>
  );
};
