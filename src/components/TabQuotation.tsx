import React, { useState } from 'react';
import { CatalogItem, MaterialItem, Quote, Room, UserProfile } from '../types';
import { createUniqueId, formatMXN } from '../utils/storage';

interface TabQuotationProps {
  quote: Quote;
  user: UserProfile;
  catalog: CatalogItem[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onAddRoom: (name?: string) => void;
  onRemoveRoom: (roomId: string) => void;
  onUpdateRoomField: (roomId: string, field: keyof Room, value: any) => void;
  onAddMaterial: (roomId: string, item?: Partial<MaterialItem>) => void;
  onRemoveMaterial: (roomId: string, materialId: string) => void;
  onUpdateMaterialField: (
    roomId: string,
    materialId: string,
    field: keyof MaterialItem,
    value: any
  ) => void;
  onUpdateMaterialFields: (
    roomId: string,
    materialId: string,
    patch: Partial<MaterialItem>
  ) => void;
  onAddRoomPhoto: (roomId: string, files: FileList) => void;
  onRemoveRoomPhoto: (roomId: string, photoId: string) => void;
  onSetBudgetPhoto: (roomId: string, slot: 'actual' | 'proposal', file: File) => void;
  onRemoveBudgetPhoto: (roomId: string, slot: 'actual' | 'proposal') => void;
  onOpenPhotoViewer: (photoUrl: string, title: string) => void;
  onGoToPresupuesto: () => void;
}

export const TabQuotation: React.FC<TabQuotationProps> = ({
  quote,
  user,
  catalog,
  activeRoomId,
  onSelectRoom,
  onAddRoom,
  onRemoveRoom,
  onUpdateRoomField,
  onAddMaterial,
  onRemoveMaterial,
  onUpdateMaterialField,
  onUpdateMaterialFields,
  onAddRoomPhoto,
  onRemoveRoomPhoto,
  onSetBudgetPhoto,
  onRemoveBudgetPhoto,
  onOpenPhotoViewer,
  onGoToPresupuesto,
}) => {
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  const isTechnician =
    user.role === 'technician' ||
    user.role === 'master_technician' ||
    (user.role as string) === 'tecnico';

  const activeRoom = quote.rooms.find((r) => r.id === activeRoomId) || quote.rooms[0];

  if (!activeRoom) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-medium text-slate-500 mb-3">No hay áreas configuradas.</p>
        <button
          onClick={() => onAddRoom('')}
          className="px-4 py-2 bg-teal-700 text-white font-bold rounded-xl text-xs hover:bg-teal-800"
        >
          <i className="fa-solid fa-plus mr-1"></i> Agregar primera área
        </button>
      </div>
    );
  }

  // Calculation helpers per room
  const getRoomCalc = (room: Room) => {
    const l = typeof room.length === 'number' ? room.length : 0;
    const w = typeof room.width === 'number' ? room.width : 0;
    const areaNet = l * w;
    const waste = typeof room.wastePct === 'number' ? room.wastePct : 10;
    const areaGross = areaNet * (1 + waste / 100);

    const materialsCalc = room.materials.map((m) => {
      const y = typeof m.yield === 'number' ? m.yield : 0;
      const p = typeof m.price === 'number' ? m.price : 0;
      const hasManualPcs = m.pieces !== '' && m.pieces !== null && m.pieces !== undefined;

      const qty = hasManualPcs
        ? typeof m.pieces === 'number'
          ? m.pieces
          : 0
        : y > 0 && areaGross > 0
        ? Math.ceil(areaGross / y)
        : 0;

      const grossTotal = qty * p;
      const discountPct = Math.min(100, Math.max(0, m.discountPct || 0));
      const discountAmt = (grossTotal * discountPct) / 100;
      const netTotal = grossTotal - discountAmt;

      return {
        ...m,
        calculatedQty: qty,
        grossTotal,
        discountAmt,
        netTotal,
      };
    });

    const subtotal = materialsCalc.reduce((sum, item) => sum + item.netTotal, 0);

    return { areaNet, areaGross, materialsCalc, subtotal };
  };

  const activeCalc = getRoomCalc(activeRoom);

  // Overall quote subtotal
  const grandTotal = quote.rooms.reduce((acc, r) => acc + getRoomCalc(r).subtotal, 0);

  const findCatalogBySku = (rawSku: string): CatalogItem | undefined => {
    const clean = rawSku.trim().toUpperCase();
    if (!clean) return undefined;
    return (
      catalog.find((item) => item.id.trim().toUpperCase() === clean) ||
      catalog.find((item) => item.sku && item.sku.trim().toUpperCase() === clean) ||
      catalog.find((item) => item.articleNumber && item.articleNumber.trim().toUpperCase() === clean)
    );
  };

  const handleSkuInputChange = (materialId: string, rawSku: string) => {
    const matched = findCatalogBySku(rawSku);
    if (matched) {
      const nextYield =
        typeof matched.yieldPerM2 === 'number' && matched.yieldPerM2 > 0
          ? matched.yieldPerM2
          : '';
      onUpdateMaterialFields(activeRoom.id, materialId, {
        sku: matched.id,
        name: matched.name,
        description: matched.description || '',
        photoUrl: matched.photoUrl || '',
        productUrl: matched.productUrl || '',
        yield: nextYield,
        price: matched.price, // Precio Descuento (MXN)
        ...(nextYield !== '' ? { pieces: '' } : {}),
      });
    } else {
      onUpdateMaterialField(activeRoom.id, materialId, 'sku', rawSku);
    }
  };

  const handleSelectFromCatalog = (item: CatalogItem) => {
    const nextYield =
      typeof item.yieldPerM2 === 'number' && item.yieldPerM2 > 0 ? item.yieldPerM2 : '';
    onAddMaterial(activeRoom.id, {
      sku: item.id,
      name: item.name,
      description: item.description || '',
      photoUrl: item.photoUrl || '',
      productUrl: item.productUrl || '',
      price: item.price, // Precio Descuento (MXN)
      yield: nextYield,
      pieces: nextYield !== '' ? '' : 1,
      showInBudget: true,
    });
    setShowCatalogModal(false);
  };

  const filteredCatalog = catalog.filter((item) => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.articleNumber && item.articleNumber.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Area Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Áreas a Recubrir & Remodelar</h2>
            <p className="text-xs text-slate-500">
              Define las dimensiones de cada área, selecciona materiales y programa tiempos de obra.
            </p>
          </div>
          <button
            onClick={() => onAddRoom('')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition"
          >
            <i className="fa-solid fa-plus text-teal-400"></i> Agregar Área
          </button>
        </div>

        {/* Room Tab Selector */}
        <div className="custom-scroll flex gap-2 overflow-x-auto border-b border-slate-200 pb-1">
          {quote.rooms.map((room, idx) => {
            const isActive = room.id === activeRoom.id;
            const roomCalc = getRoomCalc(room);
            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-teal-600 bg-white text-teal-900 shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <span className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                  #{idx + 1}
                </span>
                <span>{room.name?.trim() || `Área ${idx + 1}`}</span>
                <span className="text-[10px] text-slate-400">
                  {!isTechnician ? `($${formatMXN(roomCalc.subtotal)})` : `(${roomCalc.areaGross.toFixed(1)} m²)`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Room Card Editor */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-6">
        {/* Room Title & Delete */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="bg-teal-50 text-teal-700 font-bold px-2.5 py-1 rounded-lg text-xs font-mono">
              #{quote.rooms.indexOf(activeRoom) + 1}
            </span>
            <input
              type="text"
              value={activeRoom.name ?? ''}
              onChange={(e) => onUpdateRoomField(activeRoom.id, 'name', e.target.value)}
              placeholder="Escribe el nombre del Área (ej. Sala, Baño Principal, Cocina)"
              className="font-bold text-slate-800 text-base placeholder:font-normal placeholder:text-slate-400 bg-slate-50 hover:bg-slate-100 focus:bg-white px-3 py-1.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:outline-none transition w-full max-w-md"
            />
          </div>
          <div className="flex items-center gap-3">
            {!isTechnician ? (
              <span className="text-xs font-bold text-slate-500">
                Subtotal Área:{' '}
                <span className="text-teal-700 font-extrabold text-sm">
                  ${formatMXN(activeCalc.subtotal)} MXN
                </span>
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-500">
                Superficie con merma:{' '}
                <span className="text-teal-700 font-extrabold text-sm">
                  {activeCalc.areaGross.toFixed(2)} m²
                </span>
              </span>
            )}
            {quote.rooms.length > 1 && (
              <button
                onClick={() => onRemoveRoom(activeRoom.id)}
                className="text-slate-400 hover:text-red-500 p-1.5 transition rounded-lg hover:bg-red-50"
                title="Eliminar esta Área"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            )}
          </div>
        </div>

        {/* Room Dimensions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Largo (metros)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={activeRoom.length}
              onChange={(e) =>
                onUpdateRoomField(
                  activeRoom.id,
                  'length',
                  e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                )
              }
              placeholder="0.00"
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Ancho (metros)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={activeRoom.width}
              onChange={(e) =>
                onUpdateRoomField(
                  activeRoom.id,
                  'width',
                  e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                )
              }
              placeholder="0.00"
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Factor Merma (%)
            </label>
            <select
              value={activeRoom.wastePct}
              onChange={(e) =>
                onUpdateRoomField(activeRoom.id, 'wastePct', parseFloat(e.target.value) || 10)
              }
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
            >
              <option value={5}>5% (Corte recto básico)</option>
              <option value={10}>10% (Estándar recomendado)</option>
              <option value={15}>15% (Diagonal / Mosaicos)</option>
              <option value={20}>20% (Formatos irregulares)</option>
            </select>
          </div>

          <div className="flex flex-col justify-center bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Área Calculada
            </span>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              Neto: <span className="text-teal-600">{activeCalc.areaNet.toFixed(2)} m²</span>
              <br />
              Con merma:{' '}
              <span className="text-emerald-700">{activeCalc.areaGross.toFixed(2)} m²</span>
            </div>
          </div>
        </div>

        {/* Materials Table Section */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <i className="fa-solid fa-layer-group text-teal-600"></i> Materiales e Insumos
              </h3>
              <p className="text-[11px] text-slate-500">
                {isTechnician
                  ? 'Materiales e insumos definidos por el Vendedor (Modo Técnico: Solo Lectura).'
                  : 'Agrega recubrimientos, adhesivos, mano de obra o insumos.'}
              </p>
            </div>

            {!isTechnician && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className="px-3 py-2 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-list-check text-teal-600"></i> Seleccionar del Catálogo
                </button>

                <button
                  type="button"
                  onClick={() => onAddMaterial(activeRoom.id)}
                  className="px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-plus text-teal-400"></i> Agregar Material Manual
                </button>
              </div>
            )}
          </div>

          {activeRoom.materials.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <p className="text-xs text-slate-500">
                {isTechnician
                  ? 'El vendedor asignará la lista de materiales requerida.'
                  : 'Aún no has agregado materiales a esta área. Haz clic en "Seleccionar del Catálogo" o "Agregar Material Manual".'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {!isTechnician && catalog.length > 0 && (
                <datalist id={`catalog-sku-options-${activeRoom.id}`}>
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </datalist>
              )}

              {activeCalc.materialsCalc.map((m) => {
                const skuMatched = !isTechnician && Boolean(findCatalogBySku(m.sku));
                return (
                <div
                  key={m.id}
                  className={`grid grid-cols-1 sm:grid-cols-2 ${
                    isTechnician
                      ? 'lg:grid-cols-4'
                      : 'lg:grid-cols-[1.2fr_2fr_1fr_1fr_1fr_1fr_1fr_auto]'
                  } gap-3 items-end p-3.5 rounded-xl border transition ${
                    isTechnician
                      ? 'bg-slate-100/70 border-slate-200'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <label className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      <span>SKU</span>
                      {skuMatched && (
                        <span className="text-[9px] font-bold text-emerald-700 normal-case">
                          ✓ Catálogo
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      disabled={isTechnician}
                      list={!isTechnician ? `catalog-sku-options-${activeRoom.id}` : undefined}
                      value={m.sku}
                      onChange={(e) => handleSkuInputChange(m.id, e.target.value)}
                      placeholder="Escribe SKU..."
                      className={`w-full text-xs p-2 border rounded-lg font-mono font-bold ${
                        isTechnician
                          ? 'bg-slate-200/60 border-slate-200 text-slate-600 cursor-not-allowed'
                          : skuMatched
                          ? 'bg-emerald-50/40 border-emerald-400 text-teal-900'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      Nombre del Material
                    </label>
                    <input
                      type="text"
                      disabled={isTechnician}
                      value={m.name}
                      onChange={(e) =>
                        onUpdateMaterialField(activeRoom.id, m.id, 'name', e.target.value)
                      }
                      placeholder="Descripción del material o servicio"
                      className={`w-full text-xs p-2 border rounded-lg font-medium ${
                        isTechnician
                          ? 'bg-slate-200/60 border-slate-200 text-slate-600 cursor-not-allowed'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      No. Piezas (manual)
                    </label>
                    <input
                      type="number"
                      disabled={isTechnician}
                      step="0.01"
                      min="0"
                      value={m.pieces}
                      onChange={(e) =>
                        onUpdateMaterialField(
                          activeRoom.id,
                          m.id,
                          'pieces',
                          e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="Ej. 12 pcs"
                      className={`w-full text-xs p-2 border rounded-lg ${
                        isTechnician
                          ? 'bg-slate-200/60 border-slate-200 text-slate-600 cursor-not-allowed'
                          : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      Rendimiento (m²/unid)
                    </label>
                    <input
                      type="number"
                      disabled={isTechnician}
                      step="0.01"
                      min="0"
                      value={m.yield}
                      onChange={(e) =>
                        onUpdateMaterialField(
                          activeRoom.id,
                          m.id,
                          'yield',
                          e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="Ej. 1 m²"
                      className={`w-full text-xs p-2 border rounded-lg ${
                        isTechnician
                          ? 'bg-slate-200/60 border-slate-200 text-slate-600 cursor-not-allowed'
                          : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>

                  {!isTechnician && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                          Precio Unit (MXN)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={m.price}
                          onChange={(e) =>
                            onUpdateMaterialField(
                              activeRoom.id,
                              m.id,
                              'price',
                              e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0.00"
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-bold text-teal-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                          Descuento (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={m.discountPct}
                          onChange={(e) =>
                            onUpdateMaterialField(
                              activeRoom.id,
                              m.id,
                              'discountPct',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-emerald-700 font-bold"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Importe</span>
                        <span className="text-xs font-extrabold text-slate-900">
                          ${formatMXN(m.netTotal)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveMaterial(activeRoom.id, m.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"
                        title="Eliminar material"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Room Photos Upload */}
        <div className="space-y-3 border-t border-slate-200 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <i className="fa-solid fa-camera text-teal-600"></i> Fotos del Área / Levamiento
              </h3>
              <p className="text-[11px] text-slate-500">
                Sube fotos capturadas en sitio para documentar el estado actual del área.
              </p>
            </div>

            <label className="cursor-pointer rounded-xl bg-teal-50 px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 border border-teal-200 transition flex items-center gap-1.5">
              <i className="fa-solid fa-upload"></i> Agregar Fotos
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) onAddRoomPhoto(activeRoom.id, e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {activeRoom.photos && activeRoom.photos.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto py-2 custom-scroll">
              {activeRoom.photos.map((p) => (
                <div key={p.id} className="relative group shrink-0">
                  <img
                    src={p.url}
                    alt={p.name}
                    onClick={() => onOpenPhotoViewer(p.url, p.name)}
                    className="h-24 w-28 rounded-xl object-cover border border-slate-200 cursor-pointer group-hover:opacity-90 transition shadow-2xs"
                  />
                  <button
                    onClick={() => onRemoveRoomPhoto(activeRoom.id, p.id)}
                    className="absolute right-1 top-1 rounded-full bg-slate-900/80 text-white w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
                    title="Eliminar foto"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Aún no hay fotos cargadas para este área.
            </p>
          )}
        </div>

        {/* Room Notes */}
        <div className="space-y-2 border-t border-slate-200 pt-5">
          <label className="block text-sm font-bold text-slate-800">
            Notas e Indicaciones de Instalación para esta Área
          </label>
          <textarea
            rows={3}
            maxLength={3000}
            value={activeRoom.notes || ''}
            onChange={(e) => onUpdateRoomField(activeRoom.id, 'notes', e.target.value)}
            placeholder="Ej. Se requiere retiro previo de piso existente, colocar zoclo a 10cm, usar boquilla libre de polvo..."
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Work Planning */}
        <div className="space-y-3 border-t border-slate-200 pt-5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <i className="fa-solid fa-calendar-days text-teal-600"></i> Planeación de Obra e
            Instalación
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tiempo de Obra (días hábiles)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={activeRoom.workDuration ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    onUpdateRoomField(activeRoom.id, 'workDuration', '');
                  } else {
                    const parsed = parseFloat(raw);
                    onUpdateRoomField(
                      activeRoom.id,
                      'workDuration',
                      Number.isNaN(parsed) ? '' : parsed
                    );
                  }
                }}
                placeholder="Ej. 3 días"
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Horario in situ: Desde
              </label>
              <input
                type="time"
                value={activeRoom.workStartTime || ''}
                onChange={(e) => onUpdateRoomField(activeRoom.id, 'workStartTime', e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Horario in situ: Hasta
              </label>
              <input
                type="time"
                value={activeRoom.workEndTime || ''}
                onChange={(e) => onUpdateRoomField(activeRoom.id, 'workEndTime', e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Fecha propuesta de Inicio
              </label>
              <input
                type="date"
                value={activeRoom.workStartDate || ''}
                onChange={(e) => onUpdateRoomField(activeRoom.id, 'workStartDate', e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating live summary bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 border border-slate-800 sticky bottom-4 z-30">
        <div className="space-y-1 text-center md:text-left">
          <span className="text-xs font-semibold text-teal-400 uppercase tracking-widest">
            {isTechnician ? 'Levantamiento Técnico de Obra' : 'Resumen General de la Cotización'}
          </span>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 justify-center md:justify-start">
            {!isTechnician ? (
              <>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  ${formatMXN(grandTotal)} MXN
                </div>
                <div className="text-xs text-slate-300">
                  {quote.rooms.length} área(s) en total | Precios Netos con IVA incluido
                </div>
              </>
            ) : (
              <div className="text-base sm:text-lg font-bold text-white flex items-center gap-3">
                <span><i className="fa-solid fa-ruler-combined text-teal-400 mr-1.5"></i>{quote.rooms.length} área(s) registradas</span>
                <span className="text-slate-500">|</span>
                <span className="text-teal-300">
                  {quote.rooms.reduce((sum, r) => {
                    const l = typeof r.length === 'number' ? r.length : 0;
                    const w = typeof r.width === 'number' ? r.width : 0;
                    const waste = typeof r.wastePct === 'number' ? r.wastePct : 10;
                    return sum + (l * w * (1 + waste / 100));
                  }, 0).toFixed(2)} m² totales con merma
                </span>
              </div>
            )}
          </div>
        </div>
        <div>
          {!isTechnician && (
            <button
              onClick={onGoToPresupuesto}
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold rounded-xl shadow-lg text-xs sm:text-sm flex items-center justify-center gap-2 transition"
            >
              <i className="fa-solid fa-file-invoice"></i> Generar Presupuesto Cliente
            </button>
          )}
        </div>
      </div>

      {/* Catalog Item Modal Picker */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-boxes-stacked text-teal-600"></i> Seleccionar del Catálogo
              </h3>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ×
              </button>
            </div>

            <input
              type="search"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Buscar por clave, nombre o categoría..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            <div className="overflow-y-auto flex-1 custom-scroll divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {filteredCatalog.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500">
                  No se encontraron productos en el catálogo.
                </p>
              ) : (
                filteredCatalog.slice(0, 100).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectFromCatalog(item)}
                    className="p-3 hover:bg-teal-50 cursor-pointer flex items-center justify-between gap-3 transition"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded mr-2">
                        {item.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Categoría: {item.category}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-teal-800 block">
                        ${formatMXN(item.price)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {typeof item.yieldPerM2 === 'number' && item.yieldPerM2 > 0
                          ? `${item.yieldPerM2} m²/caja`
                          : item.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
