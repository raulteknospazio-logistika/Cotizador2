import React, { useEffect, useRef, useState } from 'react';
import {
  CatalogItem,
  MaterialItem,
  Quote,
  QuoteStatus,
  Room,
  Store,
  UserProfile,
} from './types';
import {
  createUniqueId,
  generateNextFolio,
  getStoredCatalog,
  getStoredQuotes,
  getStoredSession,
  getStoredStaff,
  getStoredStores,
  saveStoredCatalog,
  saveStoredDraft,
  saveStoredQuotes,
  saveStoredSession,
  saveStoredStaff,
  saveStoredStores,
} from './utils/storage';
import { AuthModal } from './components/AuthModal';
import { Sidebar } from './components/Sidebar';
import { QuoteWorkflowBar } from './components/QuoteWorkflowBar';
import { TabClient } from './components/TabClient';
import { TabQuotation } from './components/TabQuotation';
import { TabBudget } from './components/TabBudget';
import { TabCatalog } from './components/TabCatalog';
import { AdminPanel } from './components/AdminPanel';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { ToastContainer, ToastMessage } from './components/ToastContainer';
import {
  clearCloudCatalog,
  deleteCloudCatalogItem,
  deleteCloudQuote,
  deleteCloudStaff,
  deleteCloudStore,
  fetchCloudCatalog,
  fetchCloudQuotes,
  fetchCloudStaff,
  fetchCloudStores,
  isSupabaseConnected,
  saveCloudQuote,
  saveCloudStaff,
  saveCloudStore,
  upsertCloudCatalog,
} from './utils/supabase';

function mergeQuotes(localQuotes: Quote[], cloudQuotes: Quote[]): Quote[] {
  if (!cloudQuotes || cloudQuotes.length === 0) return localQuotes;
  if (!localQuotes || localQuotes.length === 0) return cloudQuotes;

  const merged = [...localQuotes];

  cloudQuotes.forEach((cq) => {
    const existingIdx = merged.findIndex(
      (lq) => (lq.id && lq.id === cq.id) || (lq.folio && cq.folio && lq.folio === cq.folio)
    );

    if (existingIdx >= 0) {
      const lq = merged[existingIdx];
      merged[existingIdx] = {
        ...cq,
        ...lq,
        technician_id: lq.technician_id || cq.technician_id || '',
        technician_name: lq.technician_name || cq.technician_name || '',
        status: lq.status || cq.status,
        id: lq.id || cq.id,
        folio: lq.folio || cq.folio,
      };
    } else {
      merged.push(cq);
    }
  });

  return merged;
}

export default function App() {
  // Session & Auth
  const [user, setUser] = useState<UserProfile | null>(() => getStoredSession());
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);

  // App Database States
  const [stores, setStores] = useState<Store[]>(() => getStoredStores());
  const [staff, setStaff] = useState<UserProfile[]>(() => getStoredStaff());
  const [catalog, setCatalog] = useState<CatalogItem[]>(() => getStoredCatalog());
  const [quotes, setQuotes] = useState<Quote[]>(() => getStoredQuotes());

  // Validate stored session against current staff list (clears deleted demo accounts)
  useEffect(() => {
    if (user && !staff.some((s) => s.id === user.id)) {
      setUser(null);
      saveStoredSession(null);
      setCurrentQuote(null);
      setIsEditingQuote(false);
    }
  }, [user, staff]);

  // UI Navigation
  const [activeTab, setActiveTab] = useState<'cliente' | 'cotizador' | 'presupuesto' | 'catalogo' | 'admin'>('cliente');
  const [isEditingQuote, setIsEditingQuote] = useState(false);

  // Active Quote Draft
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string>('');

  // Modals & Feedback
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [viewerPhoto, setViewerPhoto] = useState<{ url: string; title: string } | null>(null);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const toast: ToastMessage = { id: createUniqueId('toast'), message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3500);
  };

  // Helper to build initial room
  const createDefaultRoom = (name = ''): Room => ({
    id: createUniqueId('room'),
    name,
    length: 4.0,
    width: 3.0,
    wastePct: 10,
    notes: '',
    workDuration: '',
    workStartTime: '',
    workEndTime: '',
    workStartDate: '',
    materials: [],
    photos: [],
  });

  // Initialize Supabase sync and load cloud data
  useEffect(() => {
    async function syncCloud() {
      const connected = await isSupabaseConnected();
      setCloudConnected(connected);

      if (connected) {
        const [cloudStores, cloudStaff, cloudCatalog] = await Promise.all([
          fetchCloudStores(),
          fetchCloudStaff(),
          fetchCloudCatalog(),
        ]);

        if (cloudStores.length > 0) {
          setStores(cloudStores);
          saveStoredStores(cloudStores);
        }
        if (cloudStaff.length > 0) {
          setStaff(cloudStaff);
          saveStoredStaff(cloudStaff);
        }
        if (cloudCatalog.length > 0) {
          setCatalog(cloudCatalog);
          saveStoredCatalog(cloudCatalog);
        }

        if (user) {
          const cloudQuotes = await fetchCloudQuotes(user);
          const localQuotes = getStoredQuotes();
          const merged = cloudQuotes.length > 0 ? mergeQuotes(localQuotes, cloudQuotes) : localQuotes;
          setQuotes(merged);
          saveStoredQuotes(merged);
          setCurrentQuote((prev) =>
            prev && prev.id && !merged.some((q) => q.id === prev.id) ? null : prev
          );
        }
      }
    }
    syncCloud();
  }, [user?.id]);

  // Clear any legacy local draft when user logs in so no phantom client is pre-selected
  useEffect(() => {
    if (user) {
      saveStoredDraft(user.id, null);
    }
  }, [user?.id]);

  // Persist Catalog changes (local + Supabase)
  const handleUpdateCatalog = async (newCatalog: CatalogItem[], changedItems?: CatalogItem[]) => {
    const previousCatalog = catalog;
    setCatalog(newCatalog);
    saveStoredCatalog(newCatalog);
    if (cloudConnected) {
      if (newCatalog.length === 0) {
        await clearCloudCatalog();
      } else {
        const nextIds = new Set(newCatalog.map((item) => item.id));
        const removedItems = previousCatalog.filter((item) => !nextIds.has(item.id));
        for (const removed of removedItems) {
          await deleteCloudCatalogItem(removed.id);
        }
        if (changedItems) {
          if (changedItems.length > 0) {
            await upsertCloudCatalog(changedItems);
          }
        } else {
          await upsertCloudCatalog(newCatalog);
        }
      }
    }
  };

  // Delete Handlers (local + Supabase)
  const handleDeleteStore = async (storeId: string) => {
    const updated = stores.filter((s) => s.id !== storeId);
    setStores(updated);
    saveStoredStores(updated);
    if (cloudConnected) await deleteCloudStore(storeId);
    showToast('Sucursal eliminada.', 'info');
  };

  const handleDeleteStaff = async (userId: string) => {
    const updated = staff.filter((u) => u.id !== userId);
    setStaff(updated);
    saveStoredStaff(updated);
    if (cloudConnected) await deleteCloudStaff(userId);
    showToast('Colaborador eliminado del equipo.', 'info');
  };

  const handleDeleteQuote = async (quoteId: string) => {
    const updated = quotes.filter((q) => q.id !== quoteId);
    setQuotes(updated);
    saveStoredQuotes(updated);

    if (currentQuote && currentQuote.id === quoteId) {
      setCurrentQuote(null);
      setIsEditingQuote(false);
      setActiveTab('cliente');
    }

    if (cloudConnected) await deleteCloudQuote(quoteId);
    showToast('Cotización eliminada permanentemente.', 'info');
  };

  // Auth Handlers
  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    saveStoredSession(newUser);
    saveStoredDraft(newUser.id, null);
    setCurrentQuote(null);
    setIsEditingQuote(false);
    setActiveTab('cliente');
    const stored = getStoredQuotes();
    setQuotes(stored);
    showToast(`Bienvenido(a), ${newUser.display_name}`, 'success');
  };

  // Debounced auto-persistence for active quote edits (local + Supabase)
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCloudQuoteRef = useRef<{ quote: Quote; userId: string } | null>(null);

  const flushCloudQuoteSave = async () => {
    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }
    const pending = pendingCloudQuoteRef.current;
    if (pending) {
      pendingCloudQuoteRef.current = null;
      await saveCloudQuote(pending.quote, pending.userId);
    }
  };

  const persistQuoteChange = (updated: Quote, immediateCloud = false) => {
    if (updated.id) {
      setQuotes((prev) => {
        const exists = prev.some((q) => q.id === updated.id);
        const nextQuotes = exists
          ? prev.map((q) => (q.id === updated.id ? updated : q))
          : [updated, ...prev];
        saveStoredQuotes(nextQuotes);
        return nextQuotes;
      });

      if (user) {
        pendingCloudQuoteRef.current = { quote: updated, userId: user.id };
        if (cloudSaveTimerRef.current) {
          clearTimeout(cloudSaveTimerRef.current);
          cloudSaveTimerRef.current = null;
        }
        if (immediateCloud) {
          const pending = pendingCloudQuoteRef.current;
          pendingCloudQuoteRef.current = null;
          void saveCloudQuote(pending.quote, pending.userId);
        } else {
          cloudSaveTimerRef.current = setTimeout(() => {
            cloudSaveTimerRef.current = null;
            const pending = pendingCloudQuoteRef.current;
            if (pending) {
              pendingCloudQuoteRef.current = null;
              void saveCloudQuote(pending.quote, pending.userId);
            }
          }, 400);
        }
      }
    } else if (user) {
      saveStoredDraft(user.id, updated);
    }
  };

  const handleLogout = () => {
    void flushCloudQuoteSave();
    setUser(null);
    saveStoredSession(null);
    setCurrentQuote(null);
    setIsEditingQuote(false);
  };

  // Room Management
  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
  };

  const handleAddRoom = (name?: string) => {
    if (!currentQuote) return;
    const newRoom = createDefaultRoom(name ?? '');
    const updated = { ...currentQuote, rooms: [...currentQuote.rooms, newRoom] };
    setCurrentQuote(updated);
    setActiveRoomId(newRoom.id);
    persistQuoteChange(updated, true);
  };

  const handleRemoveRoom = (roomId: string) => {
    if (!currentQuote) return;
    if (currentQuote.rooms.length <= 1) {
      showToast('Debes conservar al menos un área en la cotización.', 'warning');
      return;
    }
    const filtered = currentQuote.rooms.filter((r) => r.id !== roomId);
    const updated = { ...currentQuote, rooms: filtered };
    setCurrentQuote(updated);
    setActiveRoomId(filtered[0].id);
    persistQuoteChange(updated, true);
  };

  const handleUpdateRoomField = (roomId: string, field: keyof Room, value: any) => {
    if (!currentQuote) return;
    const updatedRooms = currentQuote.rooms.map((r) => {
      if (r.id === roomId) {
        return { ...r, [field]: value };
      }
      return r;
    });
    const updated = { ...currentQuote, rooms: updatedRooms };
    setCurrentQuote(updated);
    persistQuoteChange(updated, false);
  };

  // Material Management
  const handleAddMaterial = (roomId: string, item?: Partial<MaterialItem>) => {
    if (!currentQuote) return;
    const newMat: MaterialItem = {
      id: createUniqueId('mat'),
      sku: item?.sku || '',
      name: item?.name || '',
      description: item?.description || '',
      photoUrl: item?.photoUrl || '',
      productUrl: item?.productUrl || '',
      pieces: item?.pieces ?? '',
      yield: item?.yield ?? '',
      price: item?.price ?? '',
      discountPct: item?.discountPct ?? 0,
      showInBudget: item?.showInBudget ?? true,
    };

    const updatedRooms = currentQuote.rooms.map((r) => {
      if (r.id === roomId) {
        return { ...r, materials: [...r.materials, newMat] };
      }
      return r;
    });

    const updated = { ...currentQuote, rooms: updatedRooms };
    setCurrentQuote(updated);
    persistQuoteChange(updated, true);
  };

  const handleRemoveMaterial = (roomId: string, materialId: string) => {
    if (!currentQuote) return;
    const updatedRooms = currentQuote.rooms.map((r) => {
      if (r.id === roomId) {
        return { ...r, materials: r.materials.filter((m) => m.id !== materialId) };
      }
      return r;
    });
    const updated = { ...currentQuote, rooms: updatedRooms };
    setCurrentQuote(updated);
    persistQuoteChange(updated, true);
  };

  const handleUpdateMaterialField = (
    roomId: string,
    materialId: string,
    field: keyof MaterialItem,
    value: any
  ) => {
    if (!currentQuote) return;
    const updatedRooms = currentQuote.rooms.map((r) => {
      if (r.id === roomId) {
        const updatedMaterials = r.materials.map((m) => {
          if (m.id === materialId) {
            const updatedMat = { ...m, [field]: value };
            if (field === 'pieces' && value !== '') updatedMat.yield = '';
            if (field === 'yield' && value !== '') updatedMat.pieces = '';
            return updatedMat;
          }
          return m;
        });
        return { ...r, materials: updatedMaterials };
      }
      return r;
    });
    const updated = { ...currentQuote, rooms: updatedRooms };
    setCurrentQuote(updated);
    persistQuoteChange(updated, false);
  };

  const handleUpdateMaterialFields = (
    roomId: string,
    materialId: string,
    patch: Partial<MaterialItem>
  ) => {
    if (!currentQuote) return;
    const updatedRooms = currentQuote.rooms.map((r) => {
      if (r.id === roomId) {
        const updatedMaterials = r.materials.map((m) =>
          m.id === materialId ? { ...m, ...patch } : m
        );
        return { ...r, materials: updatedMaterials };
      }
      return r;
    });
    const updated = { ...currentQuote, rooms: updatedRooms };
    setCurrentQuote(updated);
    persistQuoteChange(updated, false);
  };

  // Helper to read & compress uploaded image files to keep localStorage & Supabase fast
  const readImageAsOptimizedDataUrl = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawUrl = e.target?.result as string;
        if (!rawUrl) {
          resolve(null);
          return;
        }
        if (file.size <= 250 * 1024) {
          resolve(rawUrl);
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 1280;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width >= height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawUrl);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            resolve(compressed || rawUrl);
          } catch {
            resolve(rawUrl);
          }
        };
        img.onerror = () => resolve(rawUrl);
        img.src = rawUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Photo Management
  const handleAddRoomPhoto = (roomId: string, files: FileList) => {
    if (!currentQuote) return;
    const fileArray = Array.from(files);
    fileArray.forEach((file) => {
      void readImageAsOptimizedDataUrl(file).then((url) => {
        if (!url) return;

        const photoObj = {
          id: createUniqueId('pic'),
          roomId,
          name: file.name,
          url,
          createdAt: new Date().toISOString(),
        };

        setCurrentQuote((prev) => {
          if (!prev) return null;
          const updatedRooms = prev.rooms.map((r) => {
            if (r.id === roomId) {
              return { ...r, photos: [...(r.photos || []), photoObj] };
            }
            return r;
          });
          const nextQuote = { ...prev, rooms: updatedRooms };
          Promise.resolve().then(() => persistQuoteChange(nextQuote, true));
          return nextQuote;
        });
      });
    });
    showToast(`${fileArray.length} foto(s) agregada(s).`, 'success');
  };

  const handleRemoveRoomPhoto = (roomId: string, photoId: string) => {
    if (!currentQuote) return;
    const updatedRooms = currentQuote.rooms.map((r) => {
      if (r.id === roomId) {
        return { ...r, photos: (r.photos || []).filter((p) => p.id !== photoId) };
      }
      return r;
    });
    const updated = { ...currentQuote, rooms: updatedRooms };
    setCurrentQuote(updated);
    persistQuoteChange(updated, true);
  };

  const applyBudgetPhoto = (
    roomId: string,
    slot: 'actual' | 'proposal',
    name: string,
    url: string
  ) => {
    const photoObj = {
      id: createUniqueId('budget_pic'),
      roomId,
      slot,
      name,
      url,
      createdAt: new Date().toISOString(),
    };

    setCurrentQuote((prev) => {
      if (!prev) return null;
      const updatedRooms = prev.rooms.map((r) => {
        if (r.id === roomId) {
          const currentBudget = r.budgetPhotos || {};
          return { ...r, budgetPhotos: { ...currentBudget, [slot]: photoObj } };
        }
        return r;
      });

      const updated = { ...prev, rooms: updatedRooms };
      Promise.resolve().then(() => persistQuoteChange(updated, true));
      return updated;
    });
    showToast(
      slot === 'actual'
        ? 'Foto "Antes" cargada para el presupuesto.'
        : 'Foto "Después" cargada para el presupuesto.',
      'success'
    );
  };

  const handleSetBudgetPhoto = (
    roomId: string,
    slot: 'actual' | 'proposal',
    source: File | { name: string; url: string }
  ) => {
    if (source instanceof File) {
      void readImageAsOptimizedDataUrl(source).then((url) => {
        if (!url) return;
        applyBudgetPhoto(roomId, slot, source.name, url);
      });
    } else if (source?.url) {
      applyBudgetPhoto(roomId, slot, source.name || 'Foto de Levantamiento', source.url);
    }
  };

  const handleRemoveBudgetPhoto = (roomId: string, slot: 'actual' | 'proposal') => {
    if (!currentQuote) return;
    const updatedRooms = currentQuote.rooms.map((r) => {
      if (r.id === roomId && r.budgetPhotos) {
        const nextBudget = { ...r.budgetPhotos };
        delete nextBudget[slot];
        return { ...r, budgetPhotos: nextBudget };
      }
      return r;
    });
    const updated = { ...currentQuote, rooms: updatedRooms };
    setCurrentQuote(updated);
    persistQuoteChange(updated, true);
  };

  // Client Details Updates
  const handleUpdateClientDetails = async (
    quoteId: string,
    updates: { client_name: string; client_phone: string; project_address: string }
  ) => {
    if (!user) return;
    const target =
      quotes.find((q) => q.id === quoteId) ||
      (currentQuote && currentQuote.id === quoteId ? currentQuote : null);
    if (!target) return;

    const updatedQuote: Quote = {
      ...target,
      client_name: updates.client_name,
      client_phone: updates.client_phone,
      project_address: updates.project_address,
    };

    const updatedQuotes = quotes.map((q) => (q.id === quoteId ? updatedQuote : q));
    setQuotes(updatedQuotes);
    saveStoredQuotes(updatedQuotes);

    if (currentQuote && currentQuote.id === quoteId) {
      setCurrentQuote(updatedQuote);
    }

    const cloudSaved = await saveCloudQuote(updatedQuote, user.id);
    if (cloudSaved) {
      const syncedQuote = { ...updatedQuote, ...cloudSaved };
      const syncedQuotes = updatedQuotes.map((q) => (q.id === quoteId ? syncedQuote : q));
      setQuotes(syncedQuotes);
      saveStoredQuotes(syncedQuotes);
      if (currentQuote && currentQuote.id === quoteId) {
        setCurrentQuote(syncedQuote);
      }
    }

    showToast(`Datos de cliente "${updates.client_name}" actualizados.`, 'success');
  };

  // Workflow Action Handlers
  const handleSaveRequest = async () => {
    if (!currentQuote || !user) return;
    if (!currentQuote.client_name.trim()) {
      showToast('Ingresa el nombre del cliente antes de enviar la solicitud.', 'warning');
      setActiveTab('cliente');
      return;
    }

    const folio = generateNextFolio(quotes);
    const localQuote: Quote = {
      ...currentQuote,
      id: createUniqueId('quote'),
      folio,
      status: 'requested',
      created_at: new Date().toISOString(),
      seller_name: currentQuote.seller_name || user.display_name,
      store: user.role === 'seller' ? (user.store_name || user.store || 'Tekno Cuajimalpa') : (currentQuote.store || 'Tekno Cuajimalpa'),
    };

    // Try cloud save first
    const cloudSaved = await saveCloudQuote(localQuote, user.id);
    const finalQuote = cloudSaved || localQuote;

    const updatedQuotes = [finalQuote, ...quotes.filter((q) => q.id !== finalQuote.id)];
    setQuotes(updatedQuotes);
    saveStoredQuotes(updatedQuotes);
    saveStoredDraft(user.id, null);

    setCurrentQuote(finalQuote);
    showToast(`Solicitud enviada con éxito. Folio: ${finalQuote.folio}`, 'success');
  };

  const handleAssignTechnician = async () => {
    if (!currentQuote || !currentQuote.id || !user) return;
    const updated = { ...currentQuote, status: 'in_progress' as QuoteStatus };
    
    await saveCloudQuote(updated, user.id);

    const updatedQuotes = quotes.map((q) => (q.id === updated.id ? updated : q));
    setQuotes(updatedQuotes);
    saveStoredQuotes(updatedQuotes);
    setCurrentQuote(updated);
    showToast(`Solicitud asignada a ${updated.technician_name}.`, 'success');
  };

  const handleSelectTechnician = async (techId: string, techName: string) => {
    if (!currentQuote || !user) return;
    const nextStatus: QuoteStatus =
      currentQuote.status === 'requested' || currentQuote.status === 'draft'
        ? 'in_progress'
        : currentQuote.status;

    let updated: Quote = {
      ...currentQuote,
      technician_id: techId,
      technician_name: techName,
      status: nextStatus,
    };

    // If quote is a draft without ID, assign ID and Folio so it persists into quotes list for technician view
    if (!updated.id) {
      const folio = generateNextFolio(quotes);
      updated = {
        ...updated,
        id: createUniqueId('quote'),
        folio,
        created_at: new Date().toISOString(),
        store: user.role === 'seller' ? (user.store_name || user.store || 'Tekno Cuajimalpa') : (updated.store || 'Tekno Cuajimalpa'),
        seller_name: updated.seller_name || user.display_name,
      };
    }

    setCurrentQuote(updated);
    if (user) saveStoredDraft(user.id, updated);

    // Save locally first so UI updates instantly and persists in localStorage
    const localQuotes = getStoredQuotes();
    let updatedQuotes = localQuotes.map((q) =>
      (q.id && q.id === updated.id) || (q.folio && updated.folio && q.folio === updated.folio)
        ? updated
        : q
    );
    if (!updatedQuotes.some((q) => (q.id && q.id === updated.id) || (q.folio && updated.folio && q.folio === updated.folio))) {
      updatedQuotes.unshift(updated);
    }
    setQuotes(updatedQuotes);
    saveStoredQuotes(updatedQuotes);

    // Sync to cloud
    const cloudSaved = await saveCloudQuote(updated, user.id);
    if (cloudSaved) {
      const finalQuote = { ...updated, ...cloudSaved };
      setCurrentQuote(finalQuote);
      const syncedQuotes = updatedQuotes.map((q) =>
        (q.id && q.id === finalQuote.id) || (q.folio && finalQuote.folio && q.folio === finalQuote.folio)
          ? finalQuote
          : q
      );
      setQuotes(syncedQuotes);
      saveStoredQuotes(syncedQuotes);
    }

    if (techName) {
      showToast(`Técnico "${techName}" asignado a la cotización ${updated.folio}.`, 'success');
    }
  };

  const handleTechSaveProgress = async (completed: boolean) => {
    if (!currentQuote || !currentQuote.id || !user) return;
    const status: QuoteStatus = completed ? 'ready_for_review' : 'in_progress';
    const updated = { ...currentQuote, status };

    await saveCloudQuote(updated, user.id);

    const updatedQuotes = quotes.map((q) => (q.id === updated.id ? updated : q));
    setQuotes(updatedQuotes);
    saveStoredQuotes(updatedQuotes);
    setCurrentQuote(updated);
    showToast(
      completed
        ? 'Cotización completada y enviada a revisión del vendedor.'
        : 'Avances guardados correctamente.',
      'success'
    );
  };

  const handleSetSellerStatus = async (status: QuoteStatus) => {
    if (!currentQuote || !currentQuote.id || !user) return;
    const updated = { ...currentQuote, status };

    await saveCloudQuote(updated, user.id);

    const updatedQuotes = quotes.map((q) => (q.id === updated.id ? updated : q));
    setQuotes(updatedQuotes);
    saveStoredQuotes(updatedQuotes);
    setCurrentQuote(updated);
    showToast(`Estado actualizado: ${status}`, 'success');
  };

  const handleStartNewQuoteWithClient = async (
    clientName: string,
    clientPhone: string,
    projectAddress: string
  ) => {
    if (!user) return;
    const initialRoom = createDefaultRoom();
    const folio = generateNextFolio(quotes);
    const newQuote: Quote = {
      id: createUniqueId('quote'),
      folio,
      store_id: user.store_id,
      store: user.role === 'seller' ? (user.store_name || user.store || 'Tekno Cuajimalpa') : (user.store_name || 'Tekno Cuajimalpa'),
      seller_id: user.id,
      seller_name: user.display_name,
      created_by: user.id,
      client_name: clientName,
      client_phone: clientPhone,
      project_address: projectAddress,
      status: 'requested',
      created_at: new Date().toISOString(),
      rooms: [initialRoom],
    };

    setCurrentQuote(newQuote);
    setActiveRoomId(initialRoom.id);

    // Save immediately to quotes state and persistent storage with permanent Folio & ID
    const updatedQuotes = [newQuote, ...quotes.filter((q) => q.id !== newQuote.id)];
    setQuotes(updatedQuotes);
    saveStoredQuotes(updatedQuotes);
    await saveCloudQuote(newQuote, user.id);

    setIsEditingQuote(true);
    setActiveTab('cotizador');
    showToast(`Cliente "${clientName}" registrado con Folio ${folio}.`, 'success');
  };

  const handleOpenQuote = (quoteId: string) => {
    void flushCloudQuoteSave();
    const target = quotes.find((q) => q.id === quoteId);
    if (!target) return;

    setCurrentQuote(target);
    setActiveRoomId(target.rooms[0]?.id || '');
    setIsEditingQuote(true);
    setActiveTab('cotizador');
  };

  const handleReturnToDashboard = () => {
    void flushCloudQuoteSave();
    setIsEditingQuote(false);
    setActiveTab('cliente');
  };

  if (!user) {
    return <AuthModal onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row antialiased bg-slate-50 text-slate-800 font-sans">
      <Sidebar
        user={user}
        activeTab={activeTab}
        cloudConnected={cloudConnected}
        onSelectTab={(tab) => {
          void flushCloudQuoteSave();
          if (tab === 'cotizador' || tab === 'presupuesto') {
            setIsEditingQuote(true);
          }
          setActiveTab(tab);
        }}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col justify-between min-w-0">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full">
          {/* Admin Panel */}
          {activeTab === 'admin' && user.role === 'admin' && (
            <AdminPanel
              currentUserId={user.id}
              cloudConnected={cloudConnected}
              stores={stores}
              staff={staff}
              quotes={quotes}
              onUpdateStores={(newStores) => {
                setStores(newStores);
                saveStoredStores(newStores);
                if (cloudConnected) {
                  newStores.forEach((s) => {
                    saveCloudStore(s);
                  });
                }
              }}
              onUpdateStaff={(newStaff) => {
                setStaff(newStaff);
                saveStoredStaff(newStaff);

                if (cloudConnected) {
                  newStaff.forEach((member) => {
                    saveCloudStaff(member);
                  });
                }

                if (user) {
                  const currentUpdated = newStaff.find((u) => u.id === user.id);
                  if (currentUpdated) {
                    setUser(currentUpdated);
                    saveStoredSession(currentUpdated);
                  }
                }
              }}
              onUpdateQuotes={(newQuotes) => {
                setQuotes(newQuotes);
                saveStoredQuotes(newQuotes);
                if (cloudConnected && user) {
                  newQuotes.forEach((q) => {
                    saveCloudQuote(q, user.id);
                  });
                }
              }}
              onDeleteStore={handleDeleteStore}
              onDeleteStaff={handleDeleteStaff}
              onDeleteQuote={handleDeleteQuote}
              onShowToast={showToast}
            />
          )}

          {/* Quote Workflow Header Bar */}
          {isEditingQuote && currentQuote && ['cotizador', 'presupuesto'].includes(activeTab) && (
            <QuoteWorkflowBar
              quote={currentQuote}
              user={user}
              staff={staff}
              selectedTechnicianId={currentQuote.technician_id || ''}
              onSelectTechnician={handleSelectTechnician}
              onSaveRequest={handleSaveRequest}
              onAssignTechnician={handleAssignTechnician}
              onTechSaveProgress={handleTechSaveProgress}
              onSetSellerStatus={handleSetSellerStatus}
              onReturnToDashboard={handleReturnToDashboard}
            />
          )}

          {/* Tab 1: Clientes */}
          {activeTab === 'cliente' && (
            <TabClient
              quote={currentQuote}
              user={user}
              stores={stores}
              staff={staff}
              quotes={quotes}
              onUpdateClientDetails={handleUpdateClientDetails}
              onStartNewQuoteWithClient={handleStartNewQuoteWithClient}
              onOpenQuote={handleOpenQuote}
              onDeleteQuote={handleDeleteQuote}
              onGoToCotizador={() => {
                setIsEditingQuote(true);
                setActiveTab('cotizador');
              }}
              onShowToast={showToast}
            />
          )}

          {/* Prompt when navigating to Cotización / Presupuesto without selecting a client */}
          {['cotizador', 'presupuesto'].includes(activeTab) && !currentQuote && (
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto text-xl">
                <i className="fa-solid fa-user-check"></i>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Ningún cliente seleccionado todavía
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Selecciona un cliente existente o registra uno nuevo en la pestaña{' '}
                  <strong>1. Clientes</strong> para comenzar a cotizar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingQuote(false);
                  setActiveTab('cliente');
                }}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition shadow-sm inline-flex items-center gap-2"
              >
                <i className="fa-solid fa-users"></i> Ir a 1. Clientes
              </button>
            </div>
          )}

          {/* Tab 2: Cotización */}
          {isEditingQuote && activeTab === 'cotizador' && currentQuote && (
            <TabQuotation
              quote={currentQuote}
              user={user}
              catalog={catalog}
              activeRoomId={activeRoomId}
              onSelectRoom={handleSelectRoom}
              onAddRoom={handleAddRoom}
              onRemoveRoom={handleRemoveRoom}
              onUpdateRoomField={handleUpdateRoomField}
              onAddMaterial={handleAddMaterial}
              onRemoveMaterial={handleRemoveMaterial}
              onUpdateMaterialField={handleUpdateMaterialField}
              onUpdateMaterialFields={handleUpdateMaterialFields}
              onAddRoomPhoto={handleAddRoomPhoto}
              onRemoveRoomPhoto={handleRemoveRoomPhoto}
              onSetBudgetPhoto={handleSetBudgetPhoto}
              onRemoveBudgetPhoto={handleRemoveBudgetPhoto}
              onOpenPhotoViewer={(url, title) => setViewerPhoto({ url, title })}
              onGoToPresupuesto={() => setActiveTab('presupuesto')}
            />
          )}

          {/* Tab 3: Presupuesto */}
          {isEditingQuote && activeTab === 'presupuesto' && currentQuote && (
            <TabBudget quote={currentQuote} catalog={catalog} onShowToast={showToast} />
          )}

          {/* Tab 4: Catálogo */}
          {activeTab === 'catalogo' && (
            <TabCatalog
              catalog={catalog}
              onUpdateCatalog={handleUpdateCatalog}
              onShowToast={showToast}
            />
          )}
        </main>

        {/* Photo Viewer Modal */}
        {viewerPhoto && (
          <PhotoViewerModal
            url={viewerPhoto.url}
            title={viewerPhoto.title}
            onClose={() => setViewerPhoto(null)}
          />
        )}

        {/* Feedback Toast Container */}
        <ToastContainer toasts={toasts} />

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 text-xs py-4 text-center border-t border-slate-800 no-print">
          <div className="max-w-7xl mx-auto px-4">
            Teknospazio México © {new Date().getFullYear()} | Sistema Express de Cotizaciones para
            Remodelación y Recubrimientos
          </div>
        </footer>
      </div>
    </div>
  );
}
