'use client';

import Link from 'next/link';
import MsIcon from '../landing/MsIcon';
import { getDisplayWardsForDepartment } from '../../lib/org-units';

const itemClass = (on) =>
  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
    on ? 'bg-primary-container text-on-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container-high'
  }`;

export default function HospitalSidebar({
  hospital,
  active = 'overview',
  scheduleHref,
  isOpen,
  onClose,
  onSignOut,
  initials,
  userLabel,
  activeTab,
  activeWardId,
  onTabChange,
  onWardOpen,
  canWrite = true,
  showSettings = true,
}) {
  const id = hospital?._id;
  const departments = hospital?.departments || [];
  const wards = hospital?.wards || [];
  const schedulesHref = scheduleHref || (id ? `/hospital/${id}` : '/');

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed left-0 top-0 h-full w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between transform transition-transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col min-h-0">
          <div className="px-5 pt-5 pb-3">
            <Link href="/" className="flex items-center gap-2" onClick={onClose}>
              <img src="/logo.svg" alt="MedRoster" className="w-9 h-9 object-contain" />
              <span>
                <span className="block text-base font-semibold text-stitch-primary leading-tight">MedRoster</span>
                <span className="block text-[11px] text-slate-muted">Ghana Health Service</span>
              </span>
            </Link>
            <div className="mt-3 px-2 py-1.5 rounded bg-mint-surface flex items-center gap-1.5 text-[11px] font-semibold text-emerald-deep">
              <MsIcon name="verified" className="text-[16px]" />
              GHS Accredited Institutional Roster
            </div>
          </div>
          {hospital && (
            <div className="px-4">
              <div className="p-3 rounded-lg bg-surface-container-low">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-slate-black truncate">{hospital.name}</span>
                  <span className="text-[11px] uppercase text-slate-body bg-surface-container-high px-1.5 py-0.5 rounded shrink-0">{hospital.type || 'Hospital'}</span>
                </div>
                <p className="text-xs text-slate-muted mt-1 truncate">{hospital.region}</p>
              </div>
            </div>
          )}
          <div className="px-5 pt-4 pb-1 text-[11px] uppercase tracking-wider font-semibold text-slate-muted">Clinical Modules</div>
          <nav className="px-3 flex flex-col gap-1">
            <Link href={id ? `/hospital/${id}` : '/'} className={itemClass(active === 'overview')} onClick={onClose}>
              <MsIcon name="grid_view" className="text-[20px]" /> Hospital Overview
            </Link>
            <Link href={schedulesHref} className={itemClass(active === 'schedules')} onClick={onClose}>
              <MsIcon name="calendar_month" className="text-[20px]" /> Ward Schedules
              <span className="ml-auto px-1.5 py-0.5 rounded-full bg-mint-surface text-emerald-deep text-[11px]">{wards.length}</span>
            </Link>
            {canWrite && (
              <Link href={id ? `/hospital/${id}/setup` : '/'} className={itemClass(active === 'setup')} onClick={onClose}>
                <MsIcon name="tune" className="text-[20px]" /> Hospital Setup
              </Link>
            )}
            <Link href="/individual" className={itemClass(active === 'clinician')} onClick={onClose}>
              <MsIcon name="badge" className="text-[20px]" /> Clinician Portal
            </Link>
            <Link href="/roster-rules" className={itemClass(active === 'compliance')} onClick={onClose}>
              <MsIcon name="gavel" className="text-[20px]" /> Statutory Compliance
            </Link>
          </nav>
          {(onWardOpen || onTabChange) && (
            <div className="px-3 mt-4 overflow-y-auto">
              <div className="px-2 text-[11px] uppercase tracking-wider font-semibold text-slate-muted mb-2">Wards</div>
              {departments.map((department) => (
                <div key={department._id} className="mb-2">
                  <div className="px-2 text-xs font-semibold text-slate-black truncate">{department.name}</div>
                  {getDisplayWardsForDepartment(department, wards).map((ward) => (
                    <button
                      key={ward._id}
                      type="button"
                      onClick={() => { onWardOpen?.(ward._id); onClose?.(); }}
                      className={`block w-full text-left text-xs px-2 py-1 rounded cursor-pointer ${
                        activeTab === 'ward' && String(activeWardId) === String(ward._id)
                          ? 'bg-mint-surface text-emerald-deep font-semibold'
                          : 'text-slate-muted hover:text-slate-black'
                      }`}
                    >
                      {ward.name}
                    </button>
                  ))}
                </div>
              ))}
              {canWrite && onTabChange && (
                <button type="button" onClick={() => { onTabChange('departments'); onClose?.(); }} className={`w-full text-left mt-2 ${itemClass(activeTab === 'departments')}`}>
                  Add / edit wards
                </button>
              )}
              {showSettings && onTabChange && (
                <button type="button" onClick={() => { onTabChange('settings'); onClose?.(); }} className={`w-full text-left mt-1 ${itemClass(activeTab === 'settings')}`}>
                  Settings
                </button>
              )}
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="p-2 rounded-lg bg-surface-container-low flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-deep text-on-primary text-[13px] font-bold flex items-center justify-center shrink-0">{initials}</div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-black truncate">{userLabel}</div>
                <div className="text-[11px] text-slate-muted truncate">{hospital?.name}</div>
              </div>
            </div>
            <button type="button" onClick={onSignOut} className="text-slate-muted hover:text-crimson-alert cursor-pointer" aria-label="Sign out">
              <MsIcon name="logout" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
