import React from 'react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile;
  activeTab: 'cliente' | 'cotizador' | 'presupuesto' | 'catalogo' | 'admin';
  cloudConnected?: boolean;
  onSelectTab: (tab: 'cliente' | 'cotizador' | 'presupuesto' | 'catalogo' | 'admin') => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  cloudConnected = false,
  onSelectTab,
  onLogout,
}) => {
  const roleLabels: Record<string, string> = {
    seller: 'Vendedor',
    technician: 'Técnico',
    master_technician: 'Técnico Master',
    admin: 'Administrador',
  };

  const userSubtitle = user.store_name || user.store || roleLabels[user.role] || user.role;

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg no-print">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <img
            src="/assets/aistudio/logo-Tekno-Spazio-blanco-png_e3d30b93.png"
            alt="Tekno Spazio Diseño Interior"
            className="h-auto w-36 object-contain sm:w-44"
          />
          <span
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
              cloudConnected
                ? 'bg-teal-950/80 text-teal-300 border-teal-700/60'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title={cloudConnected ? 'Base de datos Supabase conectada' : 'Almacenamiento Local Activo'}
          >
            <i className={`fa-solid ${cloudConnected ? 'fa-cloud text-teal-400' : 'fa-database text-slate-400'}`}></i>
            {cloudConnected ? 'Supabase Cloud' : 'Local Storage'}
          </span>
        </div>

        <nav
          aria-label="Navegación principal"
          className="custom-scroll flex w-full items-center gap-1 overflow-x-auto sm:w-auto"
        >
          <button
            onClick={() => onSelectTab('cliente')}
            aria-selected={activeTab === 'cliente'}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:flex-none sm:px-3.5 sm:text-sm ${
              activeTab === 'cliente'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-users mr-1.5 hidden sm:inline"></i> 1. Clientes
          </button>

          <button
            onClick={() => onSelectTab('cotizador')}
            aria-selected={activeTab === 'cotizador'}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:flex-none sm:px-3.5 sm:text-sm ${
              activeTab === 'cotizador'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-calculator mr-1.5 hidden sm:inline"></i> 2. Cotización
          </button>

          <button
            onClick={() => onSelectTab('presupuesto')}
            aria-selected={activeTab === 'presupuesto'}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:flex-none sm:px-3.5 sm:text-sm ${
              activeTab === 'presupuesto'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-file-invoice-dollar mr-1.5 hidden sm:inline"></i> 3. Presupuesto
          </button>

          <button
            onClick={() => onSelectTab('catalogo')}
            aria-selected={activeTab === 'catalogo'}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:flex-none sm:px-3.5 sm:text-sm ${
              activeTab === 'catalogo'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-boxes-stacked mr-1.5 hidden sm:inline"></i> 4. Catálogo
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => onSelectTab('admin')}
              aria-selected={activeTab === 'admin'}
              className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:flex-none sm:px-3.5 sm:text-sm ${
                activeTab === 'admin'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'text-purple-300 hover:bg-purple-950/60'
              }`}
            >
              <i className="fa-solid fa-user-shield mr-1.5 hidden sm:inline"></i> 5. Admin
            </button>
          )}

          <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-slate-700 pl-3">
            <span
              className="hidden max-w-40 truncate text-xs font-medium text-slate-300 sm:inline"
              title={`${user.display_name} (${userSubtitle})`}
            >
              {user.display_name} <span className="text-teal-400">· {userSubtitle}</span>
            </span>
            <button
              onClick={onLogout}
              className="rounded-lg p-1.5 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-red-400"
              title="Cerrar sesión"
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
