import React, { useMemo, useState } from 'react';
import { CatalogItem } from '../types';
import { formatMXN } from '../utils/storage';
import {
  parseCatalogFromArrayBuffer,
  parseCatalogFromCSVString,
  parseYieldPerM2,
} from '../utils/catalogParser';

interface TabCatalogProps {
  catalog: CatalogItem[];
  onUpdateCatalog: (newCatalog: CatalogItem[], changedItems?: CatalogItem[]) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const ITEMS_PER_PAGE = 50;

export const TabCatalog: React.FC<TabCatalogProps> = ({
  catalog,
  onUpdateCatalog,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [detailItem, setDetailItem] = useState<CatalogItem | null>(null);
  const [page, setPage] = useState(1);

  // New item form matching extended columns
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newRegularPrice, setNewRegularPrice] = useState<number | ''>('');
  const [newDiscountPrice, setNewDiscountPrice] = useState<number | ''>('');
  const [newYield, setNewYield] = useState('');
  const [newPiecesPerBox, setNewPiecesPerBox] = useState('');
  const [newLength, setNewLength] = useState('');
  const [newWidth, setNewWidth] = useState('');
  const [newThickness, setNewThickness] = useState('');
  const [newWeightKg, setNewWeightKg] = useState('');
  const [newWarranty, setNewWarranty] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newProductUrl, setNewProductUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit product modal state
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editRegularPrice, setEditRegularPrice] = useState<number | ''>('');
  const [editDiscountPrice, setEditDiscountPrice] = useState<number | ''>('');
  const [editYield, setEditYield] = useState('');
  const [editPiecesPerBox, setEditPiecesPerBox] = useState('');
  const [editLength, setEditLength] = useState('');
  const [editWidth, setEditWidth] = useState('');
  const [editThickness, setEditThickness] = useState('');
  const [editWeightKg, setEditWeightKg] = useState('');
  const [editWarranty, setEditWarranty] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editProductUrl, setEditProductUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((i) => {
      if (selectedCategory !== 'ALL' && i.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        (i.sku && i.sku.toLowerCase().includes(q)) ||
        (i.articleNumber && i.articleNumber.toLowerCase().includes(q)) ||
        (i.productId && i.productId.toLowerCase().includes(q)) ||
        i.category.toLowerCase().includes(q)
      );
    });
  }, [catalog, search, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedCatalog = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCatalog.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCatalog, currentPage]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.trim() || !newName.trim() || newDiscountPrice === '') {
      onShowToast('Completa al menos SKU, Nombre del Producto y Precio Descuento (MXN).', 'warning');
      return;
    }

    const cleanSku = newSku.trim().toUpperCase();
    const parsedYield = parseYieldPerM2(newYield);
    const discountNum = typeof newDiscountPrice === 'number' ? newDiscountPrice : 0;
    const regularNum = typeof newRegularPrice === 'number' ? newRegularPrice : discountNum;

    const existing = catalog.find((c) => c.id.toUpperCase() === cleanSku);

    const item: CatalogItem = {
      ...(existing || {}),
      id: cleanSku,
      sku: cleanSku,
      name: newName.trim(),
      category: newCategory.trim() || 'General',
      regularPrice: regularNum,
      price: discountNum,
      yieldPerM2: parsedYield,
      yieldRaw: newYield.trim() || undefined,
      piecesPerBox: newPiecesPerBox.trim() || undefined,
      length: newLength.trim() || undefined,
      width: newWidth.trim() || undefined,
      thickness: newThickness.trim() || undefined,
      weightKg: newWeightKg.trim() || undefined,
      warranty: newWarranty.trim() || undefined,
      photoUrl: newPhotoUrl.trim() || undefined,
      productUrl: newProductUrl.trim() || undefined,
      description: newDescription.trim() || undefined,
      unit: parsedYield !== '' ? 'caja' : newPiecesPerBox.trim() === '1' ? 'pieza' : 'unidad',
    };

    if (existing) {
      const updated = catalog.map((c) => (c.id.toUpperCase() === cleanSku ? item : c));
      onUpdateCatalog(updated, [item]);
      onShowToast(`SKU ${cleanSku} actualizado en el catálogo.`, 'success');
    } else {
      onUpdateCatalog([item, ...catalog], [item]);
      onShowToast(`Producto ${cleanSku} agregado al catálogo.`, 'success');
    }

    setNewSku('');
    setNewName('');
    setNewCategory('');
    setNewRegularPrice('');
    setNewDiscountPrice('');
    setNewYield('');
    setNewPiecesPerBox('');
    setNewLength('');
    setNewWidth('');
    setNewThickness('');
    setNewWeightKg('');
    setNewWarranty('');
    setNewPhotoUrl('');
    setNewProductUrl('');
    setNewDescription('');
    setShowAddForm(false);
  };

  const handleStartEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setEditSku(item.sku || item.id);
    setEditName(item.name || '');
    setEditCategory(item.category || '');
    setEditRegularPrice(typeof item.regularPrice === 'number' ? item.regularPrice : item.price);
    setEditDiscountPrice(typeof item.price === 'number' ? item.price : '');
    setEditYield(
      item.yieldRaw || (typeof item.yieldPerM2 === 'number' ? String(item.yieldPerM2) : '')
    );
    setEditPiecesPerBox(item.piecesPerBox || '');
    setEditLength(item.length || '');
    setEditWidth(item.width || '');
    setEditThickness(item.thickness || '');
    setEditWeightKg(item.weightKg || '');
    setEditWarranty(item.warranty || '');
    setEditPhotoUrl(item.photoUrl || '');
    setEditProductUrl(item.productUrl || '');
    setEditDescription(item.description || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editSku.trim() || !editName.trim() || editDiscountPrice === '') {
      onShowToast('Completa al menos SKU, Nombre del Producto y Precio Descuento (MXN).', 'warning');
      return;
    }

    const nextSku = editSku.trim().toUpperCase();
    const isRenaming = nextSku !== editingItem.id.toUpperCase();
    if (isRenaming && catalog.some((c) => c.id.toUpperCase() === nextSku)) {
      onShowToast(`Ya existe otro producto con el SKU ${nextSku}.`, 'warning');
      return;
    }

    const parsedYield = parseYieldPerM2(editYield);
    const discountNum = typeof editDiscountPrice === 'number' ? editDiscountPrice : 0;
    const regularNum = typeof editRegularPrice === 'number' ? editRegularPrice : discountNum;

    const updatedItem: CatalogItem = {
      ...editingItem,
      id: isRenaming ? nextSku : editingItem.id,
      sku: nextSku,
      name: editName.trim(),
      category: editCategory.trim() || 'General',
      regularPrice: regularNum,
      price: discountNum,
      yieldPerM2: parsedYield,
      yieldRaw: editYield.trim() || undefined,
      piecesPerBox: editPiecesPerBox.trim() || undefined,
      length: editLength.trim() || undefined,
      width: editWidth.trim() || undefined,
      thickness: editThickness.trim() || undefined,
      weightKg: editWeightKg.trim() || undefined,
      warranty: editWarranty.trim() || undefined,
      photoUrl: editPhotoUrl.trim() || undefined,
      productUrl: editProductUrl.trim() || undefined,
      description: editDescription.trim() || undefined,
      unit:
        parsedYield !== ''
          ? 'caja'
          : editPiecesPerBox.trim() === '1'
          ? 'pieza'
          : editingItem.unit || 'unidad',
    };

    const nextCatalog = catalog.map((c) => (c.id === editingItem.id ? updatedItem : c));
    onUpdateCatalog(nextCatalog, [updatedItem]);

    if (detailItem && detailItem.id === editingItem.id) {
      setDetailItem(updatedItem);
    }

    setEditingItem(null);
    onShowToast(`Producto "${updatedItem.name}" actualizado en Supabase y en el catálogo.`, 'success');
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsImporting(true);
    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
      let parsed: CatalogItem[];

      if (isCsv) {
        const text = await file.text();
        parsed = parseCatalogFromCSVString(text);
      } else {
        const buffer = await file.arrayBuffer();
        parsed = parseCatalogFromArrayBuffer(buffer);
      }

      if (parsed.length > 0) {
        onUpdateCatalog(parsed);
        setPage(1);
        setSelectedCategory('ALL');
        onShowToast(
          `Se importaron ${parsed.length} productos (precios tomados de Precio Descuento MXN).`,
          'success'
        );
      } else {
        onShowToast('No se encontraron productos válidos en el archivo seleccionado.', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Ocurrió un error al procesar el archivo CSV/Excel.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleLoadAttachedCatalog = async () => {
    setIsImporting(true);
    try {
      const res = await fetch('/assets/aistudio/Teknospazio_Scraping_OK_2afe1517');
      if (!res.ok) {
        throw new Error('No se pudo cargar el archivo adjunto.');
      }
      const csvText = await res.text();
      const parsed = parseCatalogFromCSVString(csvText);

      if (parsed.length > 0) {
        onUpdateCatalog(parsed);
        setPage(1);
        setSelectedCategory('ALL');
        onShowToast(
          `Catálogo Teknospazio cargado: ${parsed.length} productos con Precio Descuento (MXN) y M²/Caja.`,
          'success'
        );
      } else {
        onShowToast('El archivo no contenía filas válidas.', 'error');
      }
    } catch (err) {
      console.error(err);
      onShowToast('No se pudo cargar el archivo adjunto automáticamente.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearCatalog = () => {
    onUpdateCatalog([]);
    setConfirmClear(false);
    setPage(1);
    onShowToast('Todos los productos han sido eliminados del catálogo.', 'info');
  };

  const handleRemoveProduct = (id: string) => {
    onUpdateCatalog(
      catalog.filter((item) => item.id !== id),
      []
    );
    onShowToast(`Producto ${id} eliminado.`, 'info');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
        {/* Header & Import Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-boxes-stacked text-teal-600"></i> Catálogo de Productos
              Teknospazio
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Importa tu hoja exportada en CSV o Excel (toma automáticamente <strong>SKU</strong>,{' '}
              <strong>M²/Caja</strong> y <strong>Precio Descuento MXN</strong>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isImporting}
              onClick={handleLoadAttachedCatalog}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm flex items-center gap-2"
              title="Cargar los productos del archivo Teknospazio_Scraping_OK adjunto"
            >
              <i className="fa-solid fa-cloud-arrow-down"></i>
              {isImporting ? 'Cargando...' : 'Cargar Hoja Adjunta (Teknospazio)'}
            </button>

            <label className="cursor-pointer rounded-xl bg-teal-700 hover:bg-teal-800 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm flex items-center gap-2">
              <i className="fa-solid fa-file-csv"></i> Importar Archivo CSV / Excel
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="sr-only"
                onChange={handleFileImport}
              />
            </label>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-plus text-teal-400"></i> Nuevo Producto
            </button>

            {catalog.length > 0 && !confirmClear && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2.5 text-xs font-semibold text-red-700 transition flex items-center gap-1.5"
                title="Vaciar catálogo actual"
              >
                <i className="fa-solid fa-trash-can"></i> Vaciar
              </button>
            )}

            {confirmClear && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-red-800">¿Eliminar todo?</span>
                <button
                  type="button"
                  onClick={handleClearCatalog}
                  className="px-2 py-1 text-[11px] font-bold bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Sí, vaciar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Format hint */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div>
            <i className="fa-solid fa-circle-info text-teal-600 mr-1.5"></i>
            Columnas admitidas: <span className="font-mono text-[10px]">ID Producto, SKU, Nombre del Producto, Precio Regular (MXN), Precio Descuento (MXN), Categoría y Subcategorías, Ruta Breadcrumbs, Número de artículo, Largo, Ancho, Espesor, M²/Caja, Pz/Caja, Kg/Caja, Garantía, Foto, Descripción, URL Producto Web</span>.
          </div>
        </div>

        {/* Add product form */}
        {showAddForm && (
          <form
            onSubmit={handleAddItem}
            className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Agregar Producto Manualmente
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">SKU *</label>
                <input
                  type="text"
                  required
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="Ej. TS-SPC6.5M-8126"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. PISO SPC ACABADO MARMOL TRAVERTINO"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Categoría y Subcategorías
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Ej. PISOS SPC"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Precio Regular (MXN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newRegularPrice}
                  onChange={(e) =>
                    setNewRegularPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Precio Descuento (MXN) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newDiscountPrice}
                  onChange={(e) =>
                    setNewDiscountPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className="w-full text-xs p-2.5 bg-white border border-teal-300 rounded-lg font-bold text-teal-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  M²/Caja (Rendimiento)
                </label>
                <input
                  type="text"
                  value={newYield}
                  onChange={(e) => setNewYield(e.target.value)}
                  placeholder="Ej. 2.256"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pz/Caja</label>
                <input
                  type="text"
                  value={newPiecesPerBox}
                  onChange={(e) => setNewPiecesPerBox(e.target.value)}
                  placeholder="Ej. 5"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Largo</label>
                <input
                  type="text"
                  value={newLength}
                  onChange={(e) => setNewLength(e.target.value)}
                  placeholder="Ej. 950 mm"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ancho</label>
                <input
                  type="text"
                  value={newWidth}
                  onChange={(e) => setNewWidth(e.target.value)}
                  placeholder="Ej. 475 mm"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Espesor</label>
                <input
                  type="text"
                  value={newThickness}
                  onChange={(e) => setNewThickness(e.target.value)}
                  placeholder="Ej. 5 mm + IXPE 1.5"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Garantía / Kg/Caja
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWarranty}
                    onChange={(e) => setNewWarranty(e.target.value)}
                    placeholder="25 años"
                    className="w-1/2 text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newWeightKg}
                    onChange={(e) => setNewWeightKg(e.target.value)}
                    placeholder="20.5 kg"
                    className="w-1/2 text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Foto (URL)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="https://teknospazio.com/wp-content/uploads/..."
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  />
                  {newPhotoUrl.trim() && (
                    <img
                      src={newPhotoUrl.trim()}
                      alt="Vista previa"
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  URL Producto Web
                </label>
                <input
                  type="url"
                  value={newProductUrl}
                  onChange={(e) => setNewProductUrl(e.target.value)}
                  placeholder="https://teknospazio.com/product/..."
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Descripción (aparece en el Presupuesto PDF si es el primer material del área)
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ej. Revestimiento decorativo de PVC tipo mármol ideal para interiores..."
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                Guardar Producto
              </button>
            </div>
          </form>
        )}

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-slate-400"></i>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por SKU, nombre, ID producto o categoría..."
              className="w-full text-xs pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-xs"
          >
            <option value="ALL">Todas las categorías ({catalog.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-500 shrink-0 text-right">
            {filteredCatalog.length} de {catalog.length} productos
          </span>
        </div>

        {/* Table */}
        {catalog.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3 bg-slate-50/70">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-table"></i>
            </div>
            <h3 className="text-sm font-bold text-slate-800">El catálogo está vacío</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Se eliminaron los productos demo. Carga tu hoja real con{' '}
              <strong>&quot;Cargar Hoja Adjunta (Teknospazio)&quot;</strong> o importa un archivo{' '}
              <strong>CSV / Excel</strong> exportado desde tu hoja de cálculo.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto custom-scroll border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <th className="p-3">Producto / SKU</th>
                    <th className="p-3">Nombre y Categoría</th>
                    <th className="p-3">Medidas (L × A × E)</th>
                    <th className="p-3 text-center">M²/Caja</th>
                    <th className="p-3 text-center">Pz / Kg</th>
                    <th className="p-3 text-right">Precio Regular</th>
                    <th className="p-3 text-right text-teal-800">Precio Descuento</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedCatalog.map((item) => (
                    <tr key={item.id} className="hover:bg-teal-50/40 transition">
                      <td className="p-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {item.photoUrl ? (
                            <img
                              src={item.photoUrl}
                              alt={item.name}
                              loading="lazy"
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                              <i className="fa-solid fa-box"></i>
                            </div>
                          )}
                          <div>
                            <div className="font-mono font-bold text-teal-800">{item.id}</div>
                            {item.productId && (
                              <div className="text-[10px] text-slate-400">
                                ID: {item.productId}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3 align-top max-w-xs">
                        <div className="font-semibold text-slate-900 leading-snug">{item.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                          {item.category}
                        </div>
                        {item.warranty && (
                          <span className="inline-block mt-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                            Garantía: {item.warranty}
                          </span>
                        )}
                      </td>

                      <td className="p-3 align-top text-[11px] text-slate-600 whitespace-nowrap">
                        {[item.length, item.width, item.thickness].filter(Boolean).length > 0 ? (
                          <div>
                            <div>
                              {item.length || '-'} × {item.width || '-'}
                            </div>
                            {item.thickness && (
                              <div className="text-[10px] text-slate-400">
                                Espesor: {item.thickness}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-3 align-top text-center whitespace-nowrap">
                        {typeof item.yieldPerM2 === 'number' && item.yieldPerM2 > 0 ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[11px]">
                            {item.yieldPerM2} m²
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {item.yieldRaw || 'N/A'}
                          </span>
                        )}
                      </td>

                      <td className="p-3 align-top text-center whitespace-nowrap text-[11px] text-slate-600">
                        <div>{item.piecesPerBox ? `${item.piecesPerBox} pz` : '—'}</div>
                        {item.weightKg && (
                          <div className="text-[10px] text-slate-400">{item.weightKg} kg</div>
                        )}
                      </td>

                      <td className="p-3 align-top text-right whitespace-nowrap text-slate-400 line-through">
                        {typeof item.regularPrice === 'number' && item.regularPrice > 0
                          ? `$${formatMXN(item.regularPrice)}`
                          : '—'}
                      </td>

                      <td className="p-3 align-top text-right whitespace-nowrap font-extrabold text-teal-800">
                        ${formatMXN(item.price)}
                      </td>

                      <td className="p-3 align-top text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
                            title="Ver ficha completa"
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                            title="Editar producto"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar producto"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
                <span>
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto custom-scroll">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                  SKU: {detailItem.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">{detailItem.name}</h3>
                {detailItem.breadcrumbs && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{detailItem.breadcrumbs}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {detailItem.photoUrl && (
                <div className="sm:col-span-1">
                  <img
                    src={detailItem.photoUrl}
                    alt={detailItem.name}
                    className="w-full h-40 object-cover rounded-xl border border-slate-200 bg-slate-100"
                  />
                </div>
              )}

              <div
                className={`${
                  detailItem.photoUrl ? 'sm:col-span-2' : 'sm:col-span-3'
                } grid grid-cols-2 gap-2.5 text-xs`}
              >
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Precio Descuento (MXN)
                  </span>
                  <span className="text-sm font-extrabold text-teal-800">
                    ${formatMXN(detailItem.price)}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Precio Regular (MXN)
                  </span>
                  <span className="text-sm font-bold text-slate-600">
                    ${formatMXN(detailItem.regularPrice ?? detailItem.price)}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    M² / Caja
                  </span>
                  <span className="font-bold text-slate-800">
                    {detailItem.yieldRaw || detailItem.yieldPerM2 || 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Pz / Caja &amp; Kg / Caja
                  </span>
                  <span className="font-bold text-slate-800">
                    {detailItem.piecesPerBox || '—'} pz / {detailItem.weightKg || '—'} kg
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Dimensiones
                  </span>
                  <span className="font-semibold text-slate-700">
                    {detailItem.length || '-'} × {detailItem.width || '-'} ×{' '}
                    {detailItem.thickness || '-'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Garantía / ID Prod.
                  </span>
                  <span className="font-semibold text-slate-700">
                    {detailItem.warranty || '—'} (ID: {detailItem.productId || '—'})
                  </span>
                </div>
              </div>
            </div>

            {detailItem.description && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Descripción
                </span>
                {detailItem.description}
              </div>
            )}

            {detailItem.productUrl && (
              <div className="text-[11px] text-slate-500 break-all">
                <span className="font-bold">URL Web:</span>{' '}
                <a
                  href={detailItem.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 underline hover:text-teal-900"
                >
                  {detailItem.productUrl}
                </a>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const target = detailItem;
                  setDetailItem(null);
                  handleStartEdit(target);
                }}
                className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5"
              >
                <i className="fa-solid fa-pen-to-square"></i> Editar Producto
              </button>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-pen-to-square text-indigo-600"></i> Editar Producto del Catálogo
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Los cambios se guardan directamente en el catálogo y en Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 text-lg font-bold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden pt-4">
              <div className="overflow-y-auto custom-scroll pr-1 flex-1 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      SKU *
                    </label>
                    <input
                      type="text"
                      required
                      value={editSku}
                      onChange={(e) => setEditSku(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Categoría y Subcategorías
                    </label>
                    <input
                      type="text"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Precio Regular (MXN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editRegularPrice}
                      onChange={(e) =>
                        setEditRegularPrice(
                          e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Precio Descuento (MXN) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editDiscountPrice}
                      onChange={(e) =>
                        setEditDiscountPrice(
                          e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full text-xs p-2.5 bg-white border border-teal-300 rounded-lg font-bold text-teal-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      M²/Caja (Rendimiento)
                    </label>
                    <input
                      type="text"
                      value={editYield}
                      onChange={(e) => setEditYield(e.target.value)}
                      placeholder="Ej. 2.256"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pz/Caja
                    </label>
                    <input
                      type="text"
                      value={editPiecesPerBox}
                      onChange={(e) => setEditPiecesPerBox(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Largo
                    </label>
                    <input
                      type="text"
                      value={editLength}
                      onChange={(e) => setEditLength(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ancho
                    </label>
                    <input
                      type="text"
                      value={editWidth}
                      onChange={(e) => setEditWidth(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Espesor
                    </label>
                    <input
                      type="text"
                      value={editThickness}
                      onChange={(e) => setEditThickness(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Garantía / Kg/Caja
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editWarranty}
                        onChange={(e) => setEditWarranty(e.target.value)}
                        placeholder="Garantía"
                        className="w-1/2 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                      <input
                        type="text"
                        value={editWeightKg}
                        onChange={(e) => setEditWeightKg(e.target.value)}
                        placeholder="Kg/Caja"
                        className="w-1/2 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Foto (URL)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={editPhotoUrl}
                        onChange={(e) => setEditPhotoUrl(e.target.value)}
                        placeholder="https://teknospazio.com/wp-content/uploads/..."
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                      {editPhotoUrl.trim() && (
                        <img
                          src={editPhotoUrl.trim()}
                          alt="Vista previa"
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      URL Producto Web
                    </label>
                    <input
                      type="url"
                      value={editProductUrl}
                      onChange={(e) => setEditProductUrl(e.target.value)}
                      placeholder="https://teknospazio.com/product/..."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Descripción del producto..."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg resize-y"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition"
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
