import { CatalogItem, Quote, Store, UserProfile } from '../types';

export const INITIAL_STORES: Store[] = [
  {
    id: 'str_cuajimalpa',
    name: 'Tekno Cuajimalpa',
    address: 'Av. José María Castorena 315, Cuajimalpa, CDMX',
    phone: '55 5812 4000',
    active: true,
  },
];

export const INITIAL_STAFF: UserProfile[] = [
  {
    id: 'usr_admin',
    display_name: 'Raúl Teknospazio (Admin)',
    email: 'admin@teknospazio.com',
    password: '8888',
    role: 'admin',
    store_id: 'str_cuajimalpa',
    store_name: 'Tekno Cuajimalpa',
    store: 'Tekno Cuajimalpa',
    active: true,
  },
];

export const INITIAL_TECNICOS = INITIAL_STAFF.filter(
  (s) => s.role === 'technician' || s.role === 'master_technician'
);

export const DEMO_CATALOG: CatalogItem[] = [];

export const INITIAL_QUOTES: Quote[] = [];
