import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { getStoredStaff } from '../utils/storage';
import { signInUser, fetchProfile, fetchCloudStaff, isSupabaseConfigured } from '../utils/supabase';

interface AuthModalProps {
  onLogin: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const storedStaff = getStoredStaff();
  const adminAccount: UserProfile = storedStaff.find(
    (u) => u.role === 'admin' || u.id === 'usr_admin'
  ) || {
    id: 'usr_admin',
    display_name: 'Raúl Teknospazio (Admin)',
    email: 'admin@teknospazio.com',
    password: '8888',
    role: 'admin' as UserRole,
    store_id: 'str_cuajimalpa',
    store_name: 'Tekno Cuajimalpa',
    store: 'Tekno Cuajimalpa',
    active: true,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanId = identifier.trim().toLowerCase();
      let allStaff = getStoredStaff();

      if (isSupabaseConfigured()) {
        const cloudStaff = await fetchCloudStaff();
        if (cloudStaff.length > 0) {
          allStaff = cloudStaff;
        }
      }

      const staffMatch = allStaff.find((u) => {
        const nameMatch = u.display_name.trim().toLowerCase() === cleanId;
        const emailMatch = u.email && u.email.trim().toLowerCase() === cleanId;
        return nameMatch || emailMatch;
      });

      if (staffMatch) {
        if (staffMatch.active === false) {
          setError('Tu usuario se encuentra inactivo. Contacta al Administrador.');
          setLoading(false);
          return;
        }

        const assignedPass = (staffMatch.password || '').trim();
        const enteredPass = password.trim();

        const isPassValid =
          !assignedPass ||
          assignedPass.toUpperCase() === enteredPass.toUpperCase() ||
          assignedPass === enteredPass;

        if (!isPassValid) {
          setError('Contraseña incorrecta. Verifica la clave asignada por tu Administrador.');
          setLoading(false);
          return;
        }

        onLogin(staffMatch);
        setLoading(false);
        return;
      }

      if (cleanId.includes('@') && isSupabaseConfigured()) {
        const { data, error: signInErr } = await signInUser(cleanId, password);
        if (!signInErr && data?.user) {
          const profile = await fetchProfile(data.user.id);
          const user: UserProfile = profile || {
            id: data.user.id,
            display_name: data.user.user_metadata?.display_name || cleanId.split('@')[0],
            role: (data.user.user_metadata?.role as UserRole) || 'seller',
            store_id: 'str_cuajimalpa',
            store_name: (data.user.user_metadata?.store as string) || 'Tekno Cuajimalpa',
            store: (data.user.user_metadata?.store as string) || 'Tekno Cuajimalpa',
            active: true,
          };
          onLogin(user);
          setLoading(false);
          return;
        }
      }

      setError(
        'Usuario no registrado. Verifica que el colaborador haya sido dado de alta por el Administrador.'
      );
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-white p-6 sm:p-8 shadow-2xl">
        <div className="text-center space-y-3">
          <div className="bg-slate-950 p-4 rounded-xl inline-block shadow-inner">
            <img
              src="/assets/aistudio/logo-Tekno-Spazio-blanco-png_e3d30b93.png"
              alt="Tekno Spazio"
              className="w-48 mx-auto"
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Acceso al Cotizador Teknospazio</h1>
          <p className="text-xs text-slate-500">
            Ingresa tu Nombre de Usuario y Contraseña asignados por tu Administrador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Nombre de Usuario o Correo *
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ej. Raúl Teknospazio (Admin)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Contraseña *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Clave asignada"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition font-mono tracking-widest"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800 transition shadow-md disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="border-t border-slate-200 pt-3 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase text-center tracking-wider">
            Acceso Inicial de Administrador
          </p>
          <button
            type="button"
            onClick={() => onLogin(adminAccount)}
            className="w-full p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left flex items-center justify-between transition text-xs"
          >
            <div>
              <span className="font-bold text-purple-900 block">{adminAccount.display_name}</span>
              <span className="text-[11px] text-purple-700">
                Administrador Central (Gestión total)
              </span>
            </div>
            <i className="fa-solid fa-user-shield text-purple-700"></i>
          </button>
        </div>
      </div>
    </section>
  );
};
