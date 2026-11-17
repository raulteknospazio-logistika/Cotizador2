import React, { useState } from 'react';
import { Quote, Store, UserProfile } from '../types';
import { STATUS_LABELS } from './QuoteWorkflowBar';

interface TabClientProps {
  quote: Quote | null;
  user: UserProfile;
  stores: Store[];
  staff?: UserProfile[];
  quotes: Quote[];
  onUpdateClientDetails: (
    quoteId: string,
    updates: { client_name: string; client_phone: string; project_address: string }
  ) => Promise<void> | void;
  onStartNewQuoteWithClient: (name: string, phone: string, address: string) => void;
  onOpenQuote: (quoteId: string) => void;
  onDeleteQuote?: (quoteId: string) => void;
  onGoToCotizador: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const TabClient: React.FC<TabClientProps> = ({
  quote,
  user,
  stores,
  staff = [],
  quotes,
  onUpdateClientDetails,
  onStartNewQuoteWithClient,
  onOpenQuote,
  onDeleteQuote,
  onGoToCotizador,
  onShowToast,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Modal State for New Client
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newProjectAddress, setNewProjectAddress] = useState('');

  // Modal State for Editing Existing Client
  const [editingClientQuote, setEditingClientQuote] = useState<Quote | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editProjectAddress, setEditProjectAddress] = useState('');

  const isSeller = user.role === 'seller';
  const isMasterTech = user.role === 'master_technician';
  const isStandardTech =
    user.role === 'technician' || (user.role as string) === 'tecnico';
  const isTechnician = isStandardTech || isMasterTech;
  const userStoreName = user.store_name || user.store || 'Tekno Cuajimalpa';

  // Handle Add New Client Submit
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTechnician) return;
    if (!newClientName.trim()) {
      onShowToast('Ingresa el nombre del cliente.', 'warning');
      return;
    }

    onStartNewQuoteWithClient(
      newClientName.trim(),
      newClientPhone.trim(),
      newProjectAddress.trim()
    );

    setNewClientName('');
    setNewClientPhone('');
    setNewProjectAddress('');
    setIsAddModalOpen(false);
  };

  // Handle Edit Existing Client Modal
  const handleOpenEditModal = (q: Quote, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTechnician) return;
    setEditingClientQuote(q);
    setEditClientName(q.client_name || '');
    setEditClientPhone(q.client_phone || '');
    setEditProjectAddress(q.project_address || '');
  };

  const handleSaveEditedClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTechnician || !editingClientQuote) return;
    if (!editClientName.trim()) {
      onShowToast('Ingresa el nombre del cliente.', 'warning');
      return;
    }

    await onUpdateClientDetails(editingClientQuote.id, {
      client_name: editClientName.trim(),
      client_phone: editClientPhone.trim(),
      project_address: editProjectAddress.trim(),
    });

    setEditingClientQuote(null);
  };

  // Filter clients/quotes based on store, search, and technician assignment
  const filteredQuotes = quotes.filter((q) => {
    // Standard Technician: ONLY show quotes assigned to them
    if (isStandardTech) {
      const matchTechId = Boolean(q.technician_id && user.id && q.technician_id === user.id);

      const userClean = (user.display_name || '').trim().toLowerCase().replace(/\s*\(master\)/gi, '');
      const techClean = (q.technician_name || '').trim().toLowerCase().replace(/\s*\(master\)/gi, '');

      const matchTechName =
        Boolean(techClean && userClean && (techClean.includes(userClean) || userClean.includes(techClean)));

      if (!matchTechId && !matchTechName) return false;
    }

    // Seller: ONLY show quotes belonging to their store
    // Master Technician & Admin: see ALL quotes across all stores
    if (isSeller) {
      const matchStoreId = q.store_id && user.store_id && q.store_id === user.store_id;
      const matchStoreName = q.store && userStoreName && q.store === userStoreName;
      if (q.store_id || q.store) {
        if (!matchStoreId && !matchStoreName) return false;
      }
    }

    if (searchQuery.trim()) {
      const term = searchQuery.trim().toLowerCase();
      const matchFolio = (q.folio || '').toLowerCase().includes(term);
      const matchClient = (q.client_name || '').toLowerCase().includes(term);
      const matchPhone = (q.client_phone || '').toLowerCase().includes(term);
      const matchAddress = (q.project_address || '').toLowerCase().includes(term);
      const matchSeller = (q.seller_name || '').toLowerCase().includes(term);
      if (!matchFolio && !matchClient && !matchPhone && !matchAddress && !matchSeller) return false;
    }

    if (filterStore !== 'all') {
      const matchStoreId = q.store_id === filterStore;
      const matchStoreName = q.store === filterStore;
      if (!matchStoreId && !matchStoreName) return false;
    }

    if (filterStatus !== 'all' && q.status !== filterStatus) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 no-print">
      {/* HEADER BAR & ACTION */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-users text-teal-600"></i>
            {isStandardTech
              ? 'Mis Clientes y Cotizaciones Asignadas'
              : isMasterTech
              ? 'Todas las Cotizaciones (Técnico Master)'
              : isSeller
              ? `Clientes y Cotizaciones de ${userStoreName}`
              : '1. Clientes y Solicitudes General'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStandardTech
              ? 'Proyectos de levantamiento de obra asignados expresamente a tu usuario.'
              : isMasterTech
              ? 'Visualiza todas las cotizaciones para revisar levantamientos y asignar a un Técnico de Obra.'
              : 'Directorio de clientes de la sucursal, datos de obras y bandeja de proyectos.'}
          </p>
        </div>

        {!isTechnician && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-5 py-3 text-xs sm:text-sm font-bold transition shadow-md flex items-center gap-2"
          >
            <i className="fa-solid fa-user-plus text-teal-200"></i> + Añadir Nuevo Cliente
          </button>
        )}
      </div>

      {/* ACTIVE QUOTE SUMMARY BANNER (ONLY IF USER SELECTED A REAL EXISTING QUOTE) */}
      {quote && quote.id && quote.client_name && quotes.some((item) => item.id === quote.id) && (
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-teal-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950 px-2.5 py-0.5 rounded-md border border-teal-700/60">
              Cliente Seleccionado Actualmente
            </span>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-user text-teal-400"></i> {quote.client_name}
              <span className="text-xs font-mono font-normal text-teal-200 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
                Folio: {quote.folio}
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              <i className="fa-solid fa-location-dot text-teal-400 mr-1"></i>
              {quote.project_address || 'Sin dirección registrada'} · 
              <i className="fa-solid fa-phone text-teal-400 ml-2 mr-1"></i>
              {quote.client_phone || 'Sin teléfono'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGoToCotizador}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-sm flex items-center gap-2"
            >
              Ir a Cotización <i className="fa-solid fa-calculator"></i>
            </button>
          </div>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-slate-400"></i>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente por nombre, teléfono, folio o dirección..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
          </div>

          {!isSeller && (
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Todas las sucursales</option>
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
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Todos los estados</option>
            <option value="requested">Solicitud nueva</option>
            <option value="in_progress">En cotización por técnico</option>
            <option value="ready_for_review">Lista para revisión</option>
            <option value="sent">Enviada al cliente</option>
            <option value="accepted">Aceptada</option>
            <option value="rejected">No aceptada</option>
          </select>
        </div>

        {/* CLIENT CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredQuotes.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <i className="fa-solid fa-users text-3xl text-slate-300 mb-2 block"></i>
              <p className="text-sm font-semibold text-slate-600">
                {isStandardTech
                  ? 'No tienes proyectos asignados actualmente.'
                  : 'No hay clientes registrados en esta consulta.'}
              </p>
              {!isTechnician && (
                <>
                  <p className="text-xs text-slate-400 mt-1">Da clic en el botón de arriba para añadir un nuevo cliente.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-4 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-user-plus"></i> Añadir Nuevo Cliente
                  </button>
                </>
              )}
            </div>
          ) : (
            filteredQuotes.map((q) => {
              const isSelected = quote && quote.id === q.id;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition space-y-4 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-teal-50/60 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                      : 'bg-white border-slate-200 shadow-2xs hover:border-teal-300 hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <i className="fa-solid fa-user text-teal-600"></i>
                          <span>{q.client_name || 'Cliente Particular'}</span>
                        </h4>
                        <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-1">
                          Folio: {q.folio || 'Borrador'}
                        </span>
                      </div>
                      <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold text-white shrink-0">
                        {STATUS_LABELS[q.status] || q.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="flex items-center gap-2 text-slate-800 font-medium">
                        <i className="fa-solid fa-phone text-teal-600 w-4"></i>
                        <span>{q.client_phone || 'Sin teléfono'}</span>
                      </p>

                      <p className="flex items-start gap-2 text-slate-600">
                        <i className="fa-solid fa-location-dot text-slate-400 w-4 mt-0.5"></i>
                        <span className="line-clamp-2">{q.project_address || 'Sin dirección de obra'}</span>
                      </p>

                      <div className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-0.5">
                        <p><i className="fa-solid fa-store mr-1 text-slate-400"></i> {q.store}</p>
                        <p><i className="fa-solid fa-user-tie mr-1 text-slate-400"></i> Vendedor: {q.seller_name}</p>
                        {(() => {
                          const assignedTechObj = (staff || []).find((s) => s.id === q.technician_id);
                          const currentTechDisplayName = assignedTechObj
                            ? assignedTechObj.display_name
                            : q.technician_name;
                          return (
                            (currentTechDisplayName || q.technician_id) && (
                              <p>
                                <i className="fa-solid fa-user-gear mr-1 text-indigo-500"></i> Técnico:{' '}
                                {currentTechDisplayName || 'Sin asignar'}
                              </p>
                            )
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {confirmDeleteId === q.id ? (
                      <div className="flex-1 flex items-center justify-between gap-2 bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5">
                        <span className="text-[11px] font-bold text-red-800">¿Eliminar?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteQuote?.(q.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenQuote(q.id)}
                          className="flex-1 py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5"
                        >
                          <i className="fa-solid fa-folder-open text-teal-400"></i> Abrir / Cotizar
                        </button>

                        {!isTechnician && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(q, e)}
                              className="py-2 px-3 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 transition"
                              title="Editar datos del cliente"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>

                            {onDeleteQuote && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(q.id);
                                }}
                                className="py-2 px-3 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition"
                                title="Eliminar cotización"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL: + AÑADIR NUEVO CLIENTE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl my-auto max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-user-plus text-teal-600"></i> Añadir Nuevo Cliente
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 text-lg font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="flex flex-col flex-1 overflow-hidden pt-3">
              <div className="overflow-y-auto space-y-3.5 pr-1 text-xs flex-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre del Cliente / Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Ej. Sra. María López / Constructora Alfa"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="Ej. 55 1234 5678"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dirección / Ubicación de Obra
                  </label>
                  <textarea
                    rows={2}
                    value={newProjectAddress}
                    onChange={(e) => setNewProjectAddress(e.target.value)}
                    placeholder="Ej. Av. Vasco de Quiroga 1200, Col. Santa Fe, CDMX"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition"
                >
                  Registrar y Cotizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR DATOS DE CLIENTE EXISTENTE */}
      {editingClientQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl my-auto max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-teal-600"></i> Editar Datos de Cliente
              </h3>
              <button
                type="button"
                onClick={() => setEditingClientQuote(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 text-lg font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedClient} className="flex flex-col flex-1 overflow-hidden pt-3">
              <div className="overflow-y-auto space-y-3.5 pr-1 text-xs flex-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre del Cliente / Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dirección / Ubicación de Obra
                  </label>
                  <textarea
                    rows={2}
                    value={editProjectAddress}
                    onChange={(e) => setEditProjectAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setEditingClientQuote(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
