import React, { useState } from 'react';
import { Quote, Store, UserProfile, UserRole } from '../types';
import { createUniqueId } from '../utils/storage';

interface AdminPanelProps {
  currentUserId: string;
  cloudConnected?: boolean;
  stores: Store[];
  staff: UserProfile[];
  quotes: Quote[];
  onUpdateStores: (stores: Store[]) => void;
  onUpdateStaff: (staff: UserProfile[]) => void;
  onUpdateQuotes: (quotes: Quote[]) => void;
  onDeleteStore: (storeId: string) => void;
  onDeleteStaff: (userId: string) => void;
  onDeleteQuote: (quoteId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const generate4CharPassword = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUserId,
  cloudConnected = false,
  stores,
  staff,
  quotes,
  onUpdateStores,
  onUpdateStaff,
  onUpdateQuotes,
  onDeleteStore,
  onDeleteStaff,
  onDeleteQuote,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'tiendas' | 'personal' | 'reasignacion' | 'basedatos'>('tiendas');
  const [confirmDeleteStoreId, setConfirmDeleteStoreId] = useState<string | null>(null);
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);
  const [confirmDeleteQuoteId, setConfirmDeleteQuoteId] = useState<string | null>(null);

  // New Store Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');

  // Editing Store State
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editStoreName, setEditStoreName] = useState('');
  const [editStoreAddress, setEditStoreAddress] = useState('');
  const [editStorePhone, setEditStorePhone] = useState('');

  // New Staff Form State
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState<string>(() => generate4CharPassword());
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('seller');
  const [newStaffStoreId, setNewStaffStoreId] = useState<string>(stores[0]?.id || '');

  // Editing Staff State
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffEmail, setEditStaffEmail] = useState('');
  const [editStaffPassword, setEditStaffPassword] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<UserRole>('seller');
  const [editStaffStoreId, setEditStaffStoreId] = useState<string>('');
  const [editStaffActive, setEditStaffActive] = useState<boolean>(true);

  // Search & Filter
  const [searchStaff, setSearchStaff] = useState('');
  const [filterStoreStaff, setFilterStoreStaff] = useState<string>('all');

  // Reassignment State
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [newSellerForQuote, setNewSellerForQuote] = useState<string>('');

  // Store Handlers
  const handleAddStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      onShowToast('Ingresa el nombre de la nueva tienda.', 'warning');
      return;
    }

    const newStore: Store = {
      id: createUniqueId('str'),
      name: newStoreName.trim(),
      address: newStoreAddress.trim(),
      phone: newStorePhone.trim(),
      active: true,
      created_at: new Date().toISOString(),
    };

    onUpdateStores([...stores, newStore]);
    onShowToast(`Tienda "${newStore.name}" creada con éxito.`, 'success');

    setNewStoreName('');
    setNewStoreAddress('');
    setNewStorePhone('');
  };

  const handleOpenEditStore = (store: Store) => {
    setEditingStore(store);
    setEditStoreName(store.name);
    setEditStoreAddress(store.address || '');
    setEditStorePhone(store.phone || '');
  };

  const handleSaveEditedStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore || !editStoreName.trim()) return;

    const updatedStores = stores.map((s) => {
      if (s.id === editingStore.id) {
        return {
          ...s,
          name: editStoreName.trim(),
          address: editStoreAddress.trim(),
          phone: editStorePhone.trim(),
        };
      }
      return s;
    });

    onUpdateStores(updatedStores);

    if (editStoreName.trim() !== editingStore.name) {
      const updatedStaff = staff.map((u) => {
        if (u.store_id === editingStore.id) {
          return { ...u, store_name: editStoreName.trim(), store: editStoreName.trim() };
        }
        return u;
      });
      onUpdateStaff(updatedStaff);
    }

    onShowToast(`Información de "${editStoreName.trim()}" actualizada.`, 'success');
    setEditingStore(null);
  };

  const handleToggleStoreActive = (storeId: string) => {
    const updated = stores.map((s) => (s.id === storeId ? { ...s, active: !s.active } : s));
    onUpdateStores(updated);
    onShowToast('Estado de la tienda actualizado.', 'info');
  };

  // Staff Handlers
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      onShowToast('Ingresa el nombre completo del colaborador.', 'warning');
      return;
    }

    const assignedStore = stores.find((s) => s.id === newStaffStoreId) || stores[0];
    const pass = newStaffPassword.trim() || generate4CharPassword();

    const newMember: UserProfile = {
      id: createUniqueId('usr'),
      display_name: newStaffName.trim(),
      email: newStaffEmail.trim() || `${newStaffName.trim().toLowerCase().replace(/\s+/g, '.')}@teknospazio.com`,
      password: pass,
      role: newStaffRole,
      store_id: assignedStore ? assignedStore.id : '',
      store_name: assignedStore ? assignedStore.name : 'Sin tienda',
      store: assignedStore ? assignedStore.name : 'Sin tienda',
      active: true,
    };

    onUpdateStaff([...staff, newMember]);
    onShowToast(
      `Colaborador ${newMember.display_name} creado. Usuario: "${newMember.display_name}" | Contraseña: "${pass}"`,
      'success'
    );

    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPassword(generate4CharPassword());
  };

  const handleOpenEditStaff = (user: UserProfile) => {
    setEditingStaff(user);
    setEditStaffName(user.display_name);
    setEditStaffEmail(user.email || '');
    setEditStaffPassword(user.password || generate4CharPassword());
    setEditStaffRole(user.role);
    setEditStaffStoreId(user.store_id || stores[0]?.id || '');
    setEditStaffActive(user.active !== false);
  };

  const handleSaveEditedStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editStaffName.trim()) return;

    const assignedStore = stores.find((s) => s.id === editStaffStoreId) || stores[0];

    const updatedStaff = staff.map((u) => {
      if (u.id === editingStaff.id) {
        return {
          ...u,
          display_name: editStaffName.trim(),
          email: editStaffEmail.trim() || `${editStaffName.trim().toLowerCase().replace(/\s+/g, '.')}@teknospazio.com`,
          password: editStaffPassword.trim() || generate4CharPassword(),
          role: editStaffRole,
          store_id: assignedStore ? assignedStore.id : u.store_id,
          store_name: assignedStore ? assignedStore.name : u.store_name,
          store: assignedStore ? assignedStore.name : u.store,
          active: editStaffActive,
        };
      }
      return u;
    });

    onUpdateStaff(updatedStaff);
    onShowToast(`Información de ${editStaffName.trim()} actualizada.`, 'success');
    setEditingStaff(null);
  };

  const handleTransferSellerStore = (userId: string, newStoreId: string) => {
    const targetStore = stores.find((s) => s.id === newStoreId);
    if (!targetStore) return;

    const updated = staff.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          store_id: targetStore.id,
          store_name: targetStore.name,
          store: targetStore.name,
        };
      }
      return u;
    });

    onUpdateStaff(updated);
    onShowToast(`Tienda de usuario actualizada a ${targetStore.name}`, 'success');
  };

  const handleToggleStaffActive = (userId: string) => {
    const updated = staff.map((u) => (u.id === userId ? { ...u, active: !u.active } : u));
    onUpdateStaff(updated);
    onShowToast('Estado de usuario actualizado.', 'info');
  };

  const handleConfirmDeleteStaff = (targetUser: UserProfile) => {
    if (targetUser.id === currentUserId) {
      onShowToast('No puedes eliminar tu propio usuario mientras tienes sesión iniciada.', 'warning');
      setConfirmDeleteStaffId(null);
      return;
    }
    const adminCount = staff.filter((u) => u.role === 'admin' && u.active !== false).length;
    if (targetUser.role === 'admin' && adminCount <= 1) {
      onShowToast('Debe existir al menos un Administrador activo en el sistema.', 'warning');
      setConfirmDeleteStaffId(null);
      return;
    }
    onDeleteStaff(targetUser.id);
    setConfirmDeleteStaffId(null);
  };

  // Reassignment Handler
  const handleReassignQuote = () => {
    if (!selectedQuoteId || !newSellerForQuote) {
      onShowToast('Selecciona una cotización y un vendedor destino.', 'warning');
      return;
    }

    const sellerObj = staff.find((u) => u.id === newSellerForQuote);
    if (!sellerObj) return;

    const updatedQuotes = quotes.map((q) => {
      if (q.id === selectedQuoteId) {
        return {
          ...q,
          seller_id: sellerObj.id,
          seller_name: sellerObj.display_name,
          store_id: sellerObj.store_id,
          store: sellerObj.store_name || sellerObj.store || 'Tekno Cuajimalpa',
          reassigned_by: 'Administrador',
        };
      }
      return q;
    });

    onUpdateQuotes(updatedQuotes);
    onShowToast(`Cotización reasignada exitosamente a ${sellerObj.display_name}.`, 'success');
    setSelectedQuoteId('');
    setNewSellerForQuote('');
  };

  const filteredStaff = staff.filter((u) => {
    const matchesSearch =
      u.display_name.toLowerCase().includes(searchStaff.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchStaff.toLowerCase());
    const matchesStore = filterStoreStaff === 'all' || u.store_id === filterStoreStaff;
    return matchesSearch && matchesStore;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-6">
        {/* Header */}
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-user-shield text-teal-600"></i> Panel de Administración Central
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión exclusiva de Tiendas/Sucursales, Personal Vendedor/Técnico y Reasignaciones.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('tiendas')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'tiendas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-store mr-1.5"></i> 1. Sucursales ({stores.length})
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'personal'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-users mr-1.5"></i> 2. Equipo ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('reasignacion')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'reasignacion'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-arrows-rotate mr-1.5"></i> 3. Cotizaciones ({quotes.length})
          </button>
          <button
            onClick={() => setActiveTab('basedatos')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'basedatos'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200'
            }`}
          >
            <i className="fa-solid fa-database mr-1.5"></i> 4. Conexión Supabase
          </button>
        </div>

        {/* TAB 1: GESTIÓN DE TIENDAS */}
        {activeTab === 'tiendas' && (
          <div className="space-y-6">
            <form onSubmit={handleAddStore} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Alta de Nueva Tienda / Sucursal
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nombre de la Sucursal *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="Ej. Tekno Santa Fe"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Dirección de la Tienda
                  </label>
                  <input
                    type="text"
                    value={newStoreAddress}
                    onChange={(e) => setNewStoreAddress(e.target.value)}
                    placeholder="Ej. Av. Vasco de Quiroga 1200, CDMX"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    value={newStorePhone}
                    onChange={(e) => setNewStorePhone(e.target.value)}
                    placeholder="Ej. 55 5292 0000"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs"
                >
                  <i className="fa-solid fa-plus mr-1"></i> Registrar Tienda
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((s) => {
                const sellersCount = staff.filter((u) => u.store_id === s.id && u.role === 'seller').length;
                const quotesCount = quotes.filter((q) => q.store_id === s.id || q.store === s.name).length;

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-xl border transition space-y-3 ${
                      s.active ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-100 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{s.name}</h4>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditStore(s)}
                          className="px-2 py-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition"
                          title="Editar información de la tienda"
                        >
                          <i className="fa-solid fa-pen-to-square mr-1"></i>Editar
                        </button>

                        <button
                          onClick={() => handleToggleStoreActive(s.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            s.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {s.active ? 'Activa' : 'Inactiva'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      {s.phone ? (
                        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <i className="fa-solid fa-phone text-teal-600"></i>
                          <span>{s.phone}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Sin teléfono registrado</p>
                      )}

                      {s.address ? (
                        <p className="text-[11px] text-slate-500 truncate" title={s.address}>
                          <i className="fa-solid fa-location-dot mr-1.5 text-slate-400"></i>
                          {s.address}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Sin dirección registrada</p>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-2.5 text-[11px] flex items-center justify-between text-slate-600">
                      <div className="flex gap-3">
                        <span>Vendedores: <b className="text-slate-900">{sellersCount}</b></span>
                        <span>Cotizaciones: <b className="text-teal-700">{quotesCount}</b></span>
                      </div>

                      {stores.length > 1 && (
                        confirmDeleteStoreId === s.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteStore(s.id);
                                setConfirmDeleteStoreId(null);
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStoreId(null)}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStoreId(s.id)}
                            className="text-red-500 hover:text-red-700 font-semibold text-[11px]"
                            title="Eliminar tienda"
                          >
                            <i className="fa-solid fa-trash-can mr-1"></i>Eliminar
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: GESTIÓN DE PERSONAL */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            <form onSubmit={handleAddStaff} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Alta de Vendedor o Técnico de Obra
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nombre de Usuario Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Ej. José Domínguez"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Correo (Opcional)
                  </label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="jose.dominguez@teknospazio.com"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Contraseña (4 Caracteres) *
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      required
                      maxLength={8}
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value.toUpperCase())}
                      placeholder="4K9P"
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-teal-700 uppercase tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setNewStaffPassword(generate4CharPassword())}
                      title="Generar contraseña aleatoria de 4 caracteres"
                      className="px-2.5 py-2 text-xs bg-slate-200 hover:bg-slate-300 font-bold rounded-lg transition text-slate-700 flex items-center shrink-0"
                    >
                      🎲
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Rol en la Empresa
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="seller">Vendedor de Tienda</option>
                    <option value="technician">Técnico de Obra</option>
                    <option value="master_technician">Técnico Master</option>
                    <option value="admin">Administrador General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tienda Asignada
                  </label>
                  <select
                    value={newStaffStoreId}
                    onChange={(e) => setNewStaffStoreId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-medium"
                  >
                    {stores
                      .filter((s) => s.active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs"
                >
                  <i className="fa-solid fa-user-plus mr-1"></i> Dar de Alta Colaborador
                </button>
              </div>
            </form>

            {/* Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <input
                type="search"
                value={searchStaff}
                onChange={(e) => setSearchStaff(e.target.value)}
                placeholder="Buscar colaborador por nombre..."
                className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 w-full max-w-sm"
              />

              <select
                value={filterStoreStaff}
                onChange={(e) => setFilterStoreStaff(e.target.value)}
                className="text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="all">Todas las sucursales</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <th className="p-3">Nombre de Usuario</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Tienda Asignada</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-right">Opciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStaff.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{u.display_name}</span>
                        <span className="text-[10px] text-slate-400">Acceso: {u.display_name}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'master_technician'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : u.role === 'technician'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {u.role === 'admin'
                            ? 'Admin'
                            : u.role === 'master_technician'
                            ? 'Técnico Master'
                            : u.role === 'technician'
                            ? 'Técnico'
                            : 'Vendedor'}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {u.store_name || u.store || 'Sin tienda'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.active !== false
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {u.active !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {confirmDeleteStaffId === u.id ? (
                          <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                            <span className="text-[10px] font-bold text-red-800">¿Eliminar?</span>
                            <button
                              type="button"
                              onClick={() => handleConfirmDeleteStaff(u)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStaffId(null)}
                              className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 rounded"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditStaff(u)}
                              className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition shadow-2xs"
                              title="Editar información, clave, tienda o estado del colaborador"
                            >
                              <i className="fa-solid fa-pen-to-square mr-1"></i>Editar
                            </button>

                            {u.id !== currentUserId && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteStaffId(u.id)}
                                className="px-2.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition shadow-2xs"
                                title="Eliminar colaborador permanentemente"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: REASIGNACIÓN Y ELIMINACIÓN DE COTIZACIONES */}
        {activeTab === 'reasignacion' && (
          <div className="space-y-6">
            <div className="space-y-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reasignar Cotización a Otro Vendedor</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Utiliza este módulo cuando un vendedor cambie de tienda o se ausente, para transferir la titularidad de su cotización.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selecciona la Cotización
                  </label>
                  <select
                    value={selectedQuoteId}
                    onChange={(e) => setSelectedQuoteId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="">Selecciona una cotización...</option>
                    {quotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.folio} - {q.client_name || 'Sin cliente'} ({q.store} · Vendedor: {q.seller_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nuevo Vendedor Titular
                  </label>
                  <select
                    value={newSellerForQuote}
                    onChange={(e) => setNewSellerForQuote(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="">Selecciona el nuevo vendedor...</option>
                    {staff
                      .filter((u) => u.role === 'seller' || u.role === 'admin')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.display_name} ({u.store_name})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleReassignQuote}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
                >
                  Reasignar Titularidad
                </button>
              </div>
            </div>

            {/* Listado para eliminar cotizaciones de prueba / muestra */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Listado de Cotizaciones Registradas ({quotes.length})
              </h3>
              {quotes.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                  No hay cotizaciones registradas.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                        <th className="p-3">Folio</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Tienda</th>
                        <th className="p-3">Vendedor / Técnico</th>
                        <th className="p-3 text-right">Eliminar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotes.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-teal-800">{q.folio}</td>
                          <td className="p-3 font-semibold text-slate-900">{q.client_name || 'Sin nombre'}</td>
                          <td className="p-3 text-slate-600">{q.store}</td>
                          <td className="p-3 text-slate-600">
                            {q.seller_name}
                            {q.technician_name ? ` · Téc: ${q.technician_name}` : ''}
                          </td>
                          <td className="p-3 text-right">
                            {confirmDeleteQuoteId === q.id ? (
                              <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                                <span className="text-[10px] font-bold text-red-800">¿Eliminar?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteQuote(q.id);
                                    setConfirmDeleteQuoteId(null);
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded"
                                >
                                  Sí
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteQuoteId(null)}
                                  className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-200 rounded"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteQuoteId(q.id)}
                                className="px-2.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition"
                              >
                                <i className="fa-solid fa-trash-can mr-1"></i> Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ESTADO DE CONEXIÓN SUPABASE */}
        {activeTab === 'basedatos' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${cloudConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${cloudConnected ? 'text-emerald-900' : 'text-amber-900'}`}>
                <i className={`fa-solid ${cloudConnected ? 'fa-circle-check text-emerald-600' : 'fa-triangle-exclamation text-amber-600'}`}></i>
                {cloudConnected ? 'Conectado a Supabase correctamente' : 'Nueva Base de Datos Supabase pendiente de conectar'}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {cloudConnected
                  ? 'Tus tiendas, equipo, catálogo y cotizaciones están sincronizando en tiempo real con Supabase.'
                  : 'Ejecuta el script SQL en tu proyecto de Supabase y comparte tu Project URL y Anon/Publishable Key para enlazarlo.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* EDIT STORE MODAL */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl my-auto max-h-[90vh] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-teal-600"></i> Editar Información de Tienda
              </h3>
              <button
                type="button"
                onClick={() => setEditingStore(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 text-lg font-bold transition"
                title="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEditedStore} className="flex flex-col flex-1 overflow-hidden pt-3">
              <div className="overflow-y-auto space-y-3 pr-1 text-xs flex-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de la Sucursal *
                  </label>
                  <input
                    type="text"
                    required
                    value={editStoreName}
                    onChange={(e) => setEditStoreName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    value={editStorePhone}
                    onChange={(e) => setEditStorePhone(e.target.value)}
                    placeholder="Ej. 55 5812 4000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dirección de la Sucursal
                  </label>
                  <input
                    type="text"
                    value={editStoreAddress}
                    onChange={(e) => setEditStoreAddress(e.target.value)}
                    placeholder="Ej. Av. Castorena 315, Cuajimalpa"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
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

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl my-auto max-h-[90vh] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-user-pen text-teal-600"></i> Editar Colaborador
              </h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 text-lg font-bold transition"
                title="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEditedStaff} className="flex flex-col flex-1 overflow-hidden pt-3">
              <div className="overflow-y-auto space-y-3 pr-1 text-xs flex-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de Usuario Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editStaffName}
                    onChange={(e) => setEditStaffName(e.target.value)}
                    placeholder="Ej. José Domínguez"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Correo Electrónico (Opcional)
                  </label>
                  <input
                    type="email"
                    value={editStaffEmail}
                    onChange={(e) => setEditStaffEmail(e.target.value)}
                    placeholder="jose.dominguez@teknospazio.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contraseña de 4 Caracteres *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={editStaffPassword}
                      onChange={(e) => setEditStaffPassword(e.target.value.toUpperCase())}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-teal-700 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setEditStaffPassword(generate4CharPassword())}
                      className="px-3 py-2 text-xs bg-slate-200 hover:bg-slate-300 font-bold rounded-xl transition text-slate-700 shrink-0"
                      title="Regenerar contraseña aleatoria"
                    >
                      🎲 Regenerar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rol en la Empresa
                  </label>
                  <select
                    value={editStaffRole}
                    onChange={(e) => setEditStaffRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    <option value="seller">Vendedor de Tienda</option>
                    <option value="technician">Técnico de Obra</option>
                    <option value="master_technician">Técnico Master</option>
                    <option value="admin">Administrador General</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tienda Asignada
                  </label>
                  <select
                    value={editStaffStoreId}
                    onChange={(e) => setEditStaffStoreId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="staffActiveChk"
                    checked={editStaffActive}
                    onChange={(e) => setEditStaffActive(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="staffActiveChk" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Usuario Activo en el Sistema
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
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
