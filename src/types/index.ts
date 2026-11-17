export type UserRole = 'seller' | 'technician' | 'master_technician' | 'admin';

export type StoreLocation = string;

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  active: boolean;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  email?: string;
  password?: string;
  role: UserRole;
  store_id: string;
  store_name: string;
  store?: string;
  active: boolean;
}

export interface CatalogItem {
  id: string;
  sku?: string;
  productId?: string;
  name: string;
  regularPrice?: number;
  price: number;
  category: string;
  breadcrumbs?: string;
  articleNumber?: string;
  length?: string;
  width?: string;
  thickness?: string;
  yieldPerM2?: number | '';
  yieldRaw?: string;
  piecesPerBox?: string;
  weightKg?: string;
  warranty?: string;
  photoUrl?: string;
  description?: string;
  productUrl?: string;
  lastExtracted?: string;
  unit: string;
}

export interface MaterialItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  photoUrl?: string;
  productUrl?: string;
  pieces: number | '';
  yield: number | '';
  price: number | '';
  discountPct: number;
  showInBudget: boolean;
}

export interface RoomPhoto {
  id: string;
  roomId: string;
  name: string;
  url: string;
  createdAt: string;
}

export type BudgetPhotoSlot = 'actual' | 'proposal';

export interface BudgetPhoto {
  id: string;
  roomId: string;
  slot: BudgetPhotoSlot;
  name: string;
  url: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  length: number | '';
  width: number | '';
  wastePct: number;
  notes: string;
  workDuration: number | '';
  workStartTime: string;
  workEndTime: string;
  workStartDate: string;
  materials: MaterialItem[];
  photos?: RoomPhoto[];
  budgetPhotos?: {
    actual?: BudgetPhoto | null;
    proposal?: BudgetPhoto | null;
  };
}

export type QuoteStatus =
  | 'draft'
  | 'requested'
  | 'in_progress'
  | 'ready_for_review'
  | 'sent'
  | 'accepted'
  | 'rejected';

export interface Quote {
  id: string;
  folio: string;
  store_id?: string;
  store: string;
  seller_id?: string;
  seller_name: string;
  created_by: string;
  technician_id?: string;
  technician_name?: string;
  client_name: string;
  client_phone: string;
  project_address: string;
  status: QuoteStatus;
  created_at: string;
  rooms: Room[];
  profitMargin?: number;
  reassigned_by?: string;
}
