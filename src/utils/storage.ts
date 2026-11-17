import { CatalogItem, Quote, Store, UserProfile } from '../types';
import { INITIAL_STAFF, INITIAL_STORES } from '../data/demoCatalog';

const SESSION_KEY = 'teknospazio_user_session';
const CATALOG_KEY = 'teknospazio_catalog_v2';
const QUOTES_KEY = 'teknospazio_quotes_v3';
const STORES_KEY = 'teknospazio_stores_v3';
const STAFF_KEY = 'teknospazio_staff_v3';
const DRAFT_PREFIX = 'teknospazio_draft_';

// SESSION STORAGE
export function getStoredSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error loading session:', e);
    return null;
  }
}

export function saveStoredSession(user: UserProfile | null): void {
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.error('Error saving session:', e);
  }
}

// STORES DB STORAGE
export function getStoredStores(): Store[] {
  try {
    localStorage.removeItem('teknospazio_stores_db');
    const raw = localStorage.getItem(STORES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading stores:', e);
  }
  return INITIAL_STORES;
}

export function saveStoredStores(stores: Store[]): void {
  try {
    localStorage.setItem(STORES_KEY, JSON.stringify(stores));
  } catch (e) {
    console.error('Error saving stores:', e);
  }
}

// STAFF DB STORAGE
export function getStoredStaff(): UserProfile[] {
  try {
    localStorage.removeItem('teknospazio_staff_db');
    const raw = localStorage.getItem(STAFF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading staff:', e);
  }
  return INITIAL_STAFF;
}

export function saveStoredStaff(staff: UserProfile[]): void {
  try {
    localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  } catch (e) {
    console.error('Error saving staff:', e);
  }
}

// CATALOG STORAGE
export function getStoredCatalog(): CatalogItem[] {
  try {
    localStorage.removeItem('teknospazio_catalog');
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading catalog:', e);
  }
  return [];
}

export function saveStoredCatalog(catalog: CatalogItem[]): void {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  } catch (e) {
    console.error('Error saving catalog:', e);
  }
}

// QUOTES DB STORAGE
export function getStoredQuotes(): Quote[] {
  try {
    localStorage.removeItem('teknospazio_quotes_db');
    const raw = localStorage.getItem(QUOTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading quotes:', e);
  }
  return [];
}

export function saveStoredQuotes(quotes: Quote[]): void {
  try {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
  } catch (e) {
    console.error('Error saving quotes:', e);
  }
}

export function generateNextFolio(quotes: Quote[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `TK-${currentYear}-`;
  let maxNum = 0;
  quotes.forEach((q) => {
    if (q.folio && q.folio.startsWith(prefix)) {
      const numPart = parseInt(q.folio.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });
  const nextNum = (maxNum + 1).toString().padStart(3, '0');
  return `${prefix}${nextNum}`;
}

// DRAFT STORAGE PER USER
export function getStoredDraft(userId: string): Partial<Quote> | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error loading draft:', e);
    return null;
  }
}

export function saveStoredDraft(userId: string, draft: Partial<Quote> | null): void {
  try {
    if (draft) {
      localStorage.setItem(`${DRAFT_PREFIX}${userId}`, JSON.stringify(draft));
    } else {
      localStorage.removeItem(`${DRAFT_PREFIX}${userId}`);
    }
  } catch (e) {
    console.error('Error saving draft:', e);
  }
}

// HELPERS
export function formatMXN(amount: number): string {
  return (amount || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function createUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}
