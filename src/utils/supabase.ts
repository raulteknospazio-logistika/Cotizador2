import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CatalogItem, Quote, Store, UserProfile } from '../types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = (): boolean => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export async function isSupabaseConnected(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('staff_users')
      .select('id', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}

// AUTH & PROFILES (legacy fallback)
export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('staff_users')
      .select('id, display_name, email, password, role, store_id, store_name, active')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      display_name: data.display_name,
      email: data.email || '',
      password: data.password || '',
      role: data.role,
      store_id: data.store_id || 'str_cuajimalpa',
      store_name: data.store_name || 'Tekno Cuajimalpa',
      store: data.store_name || 'Tekno Cuajimalpa',
      active: data.active !== false,
    };
  } catch {
    return null;
  }
}

export async function signUpUser(
  email: string,
  pass: string,
  name: string,
  role: string,
  store: string
) {
  if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
  return supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        display_name: name,
        role,
        store: role === 'seller' ? store : null,
      },
    },
  });
}

export async function signInUser(email: string, pass: string) {
  if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
  return supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
}

// STORES SYNC
export async function fetchCloudStores(): Promise<Store[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, address, phone, active, created_at')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map((s: any) => ({
      id: s.id,
      name: s.name,
      address: s.address || '',
      phone: s.phone || '',
      active: s.active !== false,
      created_at: s.created_at,
    }));
  } catch {
    return [];
  }
}

export async function saveCloudStore(store: Store): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('stores').upsert({
      id: store.id,
      name: store.name,
      address: store.address || '',
      phone: store.phone || '',
      active: store.active !== false,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCloudStore(storeId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('stores').delete().eq('id', storeId);
    return !error;
  } catch {
    return false;
  }
}

// STAFF USERS SYNC
export async function fetchCloudStaff(): Promise<UserProfile[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('staff_users')
      .select('id, display_name, email, password, role, store_id, store_name, active')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map((u: any) => ({
      id: u.id,
      display_name: u.display_name,
      email: u.email || '',
      password: u.password || '',
      role: u.role,
      store_id: u.store_id || '',
      store_name: u.store_name || '',
      store: u.store_name || '',
      active: u.active !== false,
    }));
  } catch {
    return [];
  }
}

export async function saveCloudStaff(member: UserProfile): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('staff_users').upsert({
      id: member.id,
      display_name: member.display_name,
      email: member.email || '',
      password: member.password || '',
      role: member.role,
      store_id: member.store_id || null,
      store_name: member.store_name || member.store || '',
      active: member.active !== false,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCloudStaff(userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('staff_users').delete().eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}

// CATALOG PRODUCTS SYNC
export async function fetchCloudCatalog(): Promise<CatalogItem[]> {
  if (!supabase) return [];
  try {
    const allRows: CatalogItem[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('catalog_products')
        .select('*')
        .order('name', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error || !data || data.length === 0) break;

      data.forEach((row: any) => {
        allRows.push({
          id: row.id,
          sku: row.sku || row.id,
          productId: row.product_id || undefined,
          name: row.name,
          regularPrice: row.regular_price != null ? Number(row.regular_price) : undefined,
          price: Number(row.price ?? 0),
          category: row.category || 'General',
          breadcrumbs: row.breadcrumbs || undefined,
          articleNumber: row.article_number || undefined,
          length: row.length || undefined,
          width: row.width || undefined,
          thickness: row.thickness || undefined,
          yieldPerM2:
            row.yield_per_m2 != null && Number(row.yield_per_m2) > 0
              ? Number(row.yield_per_m2)
              : '',
          yieldRaw: row.yield_raw || undefined,
          piecesPerBox: row.pieces_per_box || undefined,
          weightKg: row.weight_kg || undefined,
          warranty: row.warranty || undefined,
          photoUrl: row.photo_url || undefined,
          description: row.description || undefined,
          productUrl: row.product_url || undefined,
          lastExtracted: row.last_extracted || undefined,
          unit: row.unit || 'unidad',
        });
      });

      if (data.length < pageSize) break;
      from += pageSize;
    }

    return allRows;
  } catch {
    return [];
  }
}

export async function upsertCloudCatalog(items: CatalogItem[]): Promise<boolean> {
  if (!supabase || items.length === 0) return false;
  try {
    const chunkSize = 200;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize).map((it) => ({
        id: it.id,
        sku: it.sku || it.id,
        product_id: it.productId || null,
        name: it.name,
        regular_price: it.regularPrice ?? it.price ?? 0,
        price: it.price ?? 0,
        category: it.category || 'General',
        breadcrumbs: it.breadcrumbs || null,
        article_number: it.articleNumber || null,
        length: it.length || null,
        width: it.width || null,
        thickness: it.thickness || null,
        yield_per_m2:
          typeof it.yieldPerM2 === 'number' && it.yieldPerM2 > 0 ? it.yieldPerM2 : null,
        yield_raw: it.yieldRaw || null,
        pieces_per_box: it.piecesPerBox || null,
        weight_kg: it.weightKg || null,
        warranty: it.warranty || null,
        photo_url: it.photoUrl || null,
        description: it.description || null,
        product_url: it.productUrl || null,
        last_extracted: it.lastExtracted || null,
        unit: it.unit || 'unidad',
      }));

      const { error } = await supabase.from('catalog_products').upsert(chunk);
      if (error) {
        console.warn('Supabase catalog upsert error:', error);
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function deleteCloudCatalogItem(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('catalog_products').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function clearCloudCatalog(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('catalog_products').delete().neq('id', '__never__');
    return !error;
  } catch {
    return false;
  }
}

// QUOTES SYNC
export async function fetchCloudQuotes(user: UserProfile): Promise<Quote[]> {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('quotes')
      .select(
        'id, folio, store_id, store, seller_id, seller_name, created_by, technician_id, technician_name, client_name, client_phone, project_address, status, rooms, profit_margin, reassigned_by, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(250);

    const storeName = user.store_name || user.store;
    if (user.role === 'seller' && storeName) {
      query = query.eq('store', storeName);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((q: any) => ({
      id: q.id,
      folio: q.folio || 'Sin folio',
      store_id: q.store_id || '',
      store: q.store || storeName || 'Tekno Cuajimalpa',
      seller_id: q.seller_id || q.created_by || '',
      seller_name: q.seller_name || '',
      created_by: q.created_by || '',
      technician_id: q.technician_id || '',
      technician_name: q.technician_name || '',
      client_name: q.client_name || '',
      client_phone: q.client_phone || '',
      project_address: q.project_address || '',
      status: q.status || 'requested',
      created_at: q.created_at,
      rooms: Array.isArray(q.rooms) ? q.rooms : [],
      profitMargin: q.profit_margin != null ? Number(q.profit_margin) : undefined,
      reassigned_by: q.reassigned_by || undefined,
    }));
  } catch (e) {
    console.warn('Supabase quotes fetch fallback:', e);
    return [];
  }
}

export async function saveCloudQuote(quote: Quote, userId: string): Promise<Quote | null> {
  if (!supabase || !quote.id) return null;
  try {
    const record = {
      id: quote.id,
      folio: quote.folio,
      store_id: quote.store_id || null,
      store: quote.store || '',
      seller_id: quote.seller_id || userId || null,
      seller_name: quote.seller_name || '',
      created_by: quote.created_by || userId || null,
      technician_id: quote.technician_id || null,
      technician_name: quote.technician_name || '',
      client_name: quote.client_name || '',
      client_phone: quote.client_phone || '',
      project_address: quote.project_address || '',
      status: quote.status || 'requested',
      rooms: quote.rooms || [],
      profit_margin: quote.profitMargin ?? 0,
      reassigned_by: quote.reassigned_by || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('quotes').upsert(record).select().single();
    if (error || !data) return null;

    return {
      ...quote,
      id: data.id,
      folio: data.folio || quote.folio,
      status: data.status,
    };
  } catch (e) {
    console.warn('Supabase save quote fallback:', e);
    return null;
  }
}

export async function deleteCloudQuote(quoteId: string): Promise<boolean> {
  if (!supabase || !quoteId) return false;
  try {
    const { error } = await supabase.from('quotes').delete().eq('id', quoteId);
    return !error;
  } catch {
    return false;
  }
}
