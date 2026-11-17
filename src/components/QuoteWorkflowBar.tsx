import React from 'react';
import { Quote, QuoteStatus, UserProfile } from '../types';

interface QuoteWorkflowBarProps {
  quote: Quote | null;
  user: UserProfile;
  staff?: UserProfile[];
  selectedTechnicianId?: string;
  onSelectTechnician?: (techId: string, techName: string) => void;
  onSaveRequest: () => void;
  onAssignTechnician: () => void;
  onTechSaveProgress: (completed: boolean) => void;
  onSetSellerStatus: (status: QuoteStatus) => void;
  onReturnToDashboard: () => void;
}

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  requested: 'Solicitud nueva',
  in_progress: 'En cotización por técnico',
  ready_for_review: 'Lista para revisión',
  sent: 'Enviada al cliente',
  accepted: 'Aceptada por cliente',
  rejected: 'No aceptada',
};

export const QuoteWorkflowBar: React.FC<QuoteWorkflowBarProps> = ({
  quote,
  user,
  staff = [],
  selectedTechnicianId = '',
  onSelectTechnician,
  onSaveRequest,
  onAssignTechnician,
  onTechSaveProgress,
  onSetSellerStatus,
  onReturnToDashboard,
}) => {
  if (!quote) return null;

  const isSeller = user.role === 'seller';
  const isTechnician = user.role === 'technician';
  const isMasterTechnician = user.role === 'master_technician';
  const isAdmin = user.role === 'admin';
  const isTechOrMaster = isTechnician || isMasterTechnician;

  const isNewDraft = !quote.id || quote.status === 'draft';
  const canAssignTechnician = (isTechOrMaster || isAdmin) && quote.id && quote.status === 'requested';
  
  const userClean = (user.display_name || '').trim().toLowerCase().replace(/\s*\(master\)/gi, '');
  const techClean = (quote.technician_name || '').trim().toLowerCase().replace(/\s*\(master\)/gi, '');
  const matchTechName = Boolean(techClean && userClean && (techClean.includes(userClean) || userClean.includes(techClean)));

  const isAssignedTechnician =
    (isTechOrMaster && (quote.technician_id === user.id || matchTechName || !quote.technician_id)) || isMasterTechnician || isAdmin;

  const canTechEdit =
    isAssignedTechnician &&
    ['requested', 'in_progress', 'ready_for_review', 'draft'].includes(quote.status);

  const isCurrentSeller = isSeller && (quote.seller_name === user.display_name || !quote.created_by);

  // Available technicians list (both standard and master technicians)
  const availableTechnicians = staff.filter(
    (u) => (u.role === 'technician' || u.role === 'master_technician') && u.active !== false
  );

  return (
    <section className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 p-4 shadow-sm text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-slate-600">Folio:</span>
        <span className="font-bold text-teal-900 bg-white px-2.5 py-1 rounded-lg border border-teal-200 text-sm font-mono">
          {quote.folio || 'Se asignará al guardar'}
        </span>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          {STATUS_LABELS[quote.status] || quote.status}
        </span>

        {/* TECHNICIAN SELECTOR / DISPLAY BADGE */}
        <div className="ml-0 sm:ml-2">
          {isMasterTechnician || isAdmin || isSeller ? (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
              <i className="fa-solid fa-user-gear text-indigo-600"></i>
              <span className="text-xs font-bold text-slate-700">Técnico Asignado:</span>
              <select
                value={quote.technician_id || selectedTechnicianId || ''}
                onChange={(e) => {
                  const techId = e.target.value;
                  const techObj = availableTechnicians.find((t) => t.id === techId);
                  if (onSelectTechnician) {
                    onSelectTechnician(techId, techObj ? techObj.display_name : '');
                  }
                }}
                className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- Asignar Técnico --</option>
                {availableTechnicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name} ({t.role === 'master_technician' ? 'Técnico Master' : 'Técnico'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <i className="fa-solid fa-user-gear text-slate-500"></i>
              <span className="text-xs font-semibold text-slate-600">Técnico:</span>
              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {quote.technician_name || user.display_name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Seller Submit New Request */}
        {isSeller && isNewDraft && (
          <button
            type="button"
            onClick={onSaveRequest}
            className="rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-800 transition shadow-sm flex items-center gap-1.5"
          >
            <i className="fa-solid fa-paper-plane"></i> Enviar solicitud y generar folio
          </button>
        )}

        {/* Technician Edit & Complete */}
        {canTechEdit && (
          <>
            <button
              type="button"
              onClick={() => onTechSaveProgress(false)}
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900 transition shadow-sm"
            >
              <i className="fa-solid fa-floppy-disk mr-1 text-teal-400"></i> Guardar avances
            </button>
            <button
              type="button"
              onClick={() => onTechSaveProgress(true)}
              className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-sm"
            >
              <i className="fa-solid fa-circle-check mr-1"></i> Lista para revisión
            </button>
          </>
        )}

        {/* Seller Client Actions */}
        {isCurrentSeller && quote.status === 'ready_for_review' && (
          <button
            type="button"
            onClick={() => onSetSellerStatus('sent')}
            className="rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-800 transition shadow-sm"
          >
            <i className="fa-solid fa-paper-plane mr-1"></i> Marcar como enviada al cliente
          </button>
        )}

        {isCurrentSeller && quote.status === 'sent' && (
          <>
            <button
              type="button"
              onClick={() => onSetSellerStatus('accepted')}
              className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-sm"
            >
              <i className="fa-solid fa-thumbs-up mr-1"></i> Aceptada
            </button>
            <button
              type="button"
              onClick={() => onSetSellerStatus('rejected')}
              className="rounded-xl bg-slate-600 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 transition shadow-sm"
            >
              <i className="fa-solid fa-thumbs-down mr-1"></i> No aceptada
            </button>
          </>
        )}
      </div>
    </section>
  );
};
