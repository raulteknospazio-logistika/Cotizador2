import React, { useState } from 'react';
import { Quote, Store, UserProfile } from '../types';
import { STATUS_LABELS } from './QuoteWorkflowBar';

interface DashboardProps {
  user: UserProfile;
  stores: Store[];
  quotes: Quote[];
  onStartNewQuote: () => void;
  onOpenQuote: (quoteId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  stores,
  quotes,
  onStartNewQuote,
  onOpenQuote,
}) => {
  const [searchFolio, setSearchFolio] = useState('');
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const isSeller = user.role === 'seller';
  const userStoreName = user.store_name || user.store;

  // Filter quotes based on user role, store, and search
  const filteredQuotes = quotes.filter((q) => {
    // Sellers only see quotes from their store
    if (isSeller) {
      const matchStoreId = q.store_id && user.store_id && q.store_id === user.store_id;
      const matchStoreName = q.store && userStoreName && q.store === userStoreName;
      if (!matchStoreId && !matchStoreName) return false;
    }

    // Search query
    if (searchFolio.trim()) {
      const term = searchFolio.trim().toLowerCase();
      const matchFolio = q.folio.toLowerCase().includes(term);
      const matchClient = q.client_name.toLowerCase().includes(term);
      const matchAddress = q.project_address.toLowerCase().includes(term);
      const matchSeller = q.seller_name.toLowerCase().includes(term);
      if (!matchFolio && !matchClient && !matchAddress && !matchSeller) return false;
    }

    // Store filter dropdown (for admins/techs)
    if (filterStore !== 'all') {
      const matchStoreId = q.store_id === filterStore;
      const matchStoreName = q.store === filterStore;
      if (!matchStoreId && !matchStoreName) return false;
    }

    // Status filter dropdown
    if (filterStatus !== 'all' && q.status !== filterStatus) {
      return false;
    }

    return true;
  });

  return (
    <section className="no-print mb-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-clipboard-list text-teal-600"></i>
            {isSeller ? `Solicitudes de ${userStoreName}` : 'Bandeja General de Cotizaciones'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSeller
              ? `Sucursal: ${userStoreName}. Consulta y gestiona los presupuestos de tu sucursal.`
              : 'Revisa las solicitudes pendientes, asigna técnicos y prepara los presupuestos.'}
          </p>
        </div>

        {isSeller && (
          <button
            type="button"
            onClick={onStartNewQuote}
            className="rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800 transition shadow-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-plus text-teal-300"></i> Nueva solicitud
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1 min-w-[220px]">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-slate-400"></i>
          <input
            type="search"
            value={searchFolio}
            onChange={(e) => setSearchFolio(e.target.value)}
            placeholder="Buscar por folio, cliente, vendedor o ubicación..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {user.role !== 'seller' && (
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Todas las tiendas</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">Todos los estados</option>
          <option value="requested">Solicitud nueva</option>
          <option value="in_progress">En cotización</option>
          <option value="ready_for_review">Lista para revisión</option>
          <option value="sent">Enviada al cliente</option>
          <option value="accepted">Aceptada</option>
          <option value="rejected">No aceptada</option>
        </select>
      </div>

      {/* Quotes List */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scroll">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <i className="fa-solid fa-folder-open text-2xl text-slate-300 mb-2 block"></i>
            <p className="text-xs font-medium text-slate-500">
              No hay solicitudes de cotización que coincidan.
            </p>
            {isSeller && (
              <button
                onClick={onStartNewQuote}
                className="mt-3 text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
              >
                <i className="fa-solid fa-plus"></i> Crear la primera solicitud
              </button>
            )}
          </div>
        ) : (
          filteredQuotes.map((q) => {
            const isOwner =
              user.role === 'admin' ||
              q.seller_id === user.id ||
              q.seller_name === user.display_name;

            return (
              <div
                key={q.id}
                onClick={() => onOpenQuote(q.id)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/40 cursor-pointer transition shadow-xs group"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 group-hover:bg-teal-600 group-hover:text-white transition">
                    {q.folio || 'Sin folio'}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-900 transition flex items-center gap-2">
                      <span>{q.client_name || 'Cliente Particular'}</span>
                      {!isOwner && isSeller && (
                        <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Consulta (Creado por {q.seller_name})
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      <i className="fa-solid fa-store mr-1 text-slate-400"></i>
                      {q.store} · Vendedor: {q.seller_name || 'No asignado'}
                      {q.technician_name && (
                        <span className="ml-2 text-indigo-600">
                          · Técnico: {q.technician_name}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                  <span className="text-[11px] text-slate-400">
                    {new Date(q.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                    {STATUS_LABELS[q.status] || q.status}
                  </span>
                  <i className="fa-solid fa-chevron-right text-xs text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition"></i>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

