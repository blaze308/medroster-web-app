'use client';

import Link from 'next/link';
import { getDisplayWardsForDepartment } from '../../lib/org-units';

export default function HospitalSidebar({
    hospital,
    activeTab,
    activeWardId,
    onTabChange,
    onWardOpen,
    isOpen,
    onToggle,
    canWrite = true,
    showSettings = true,
}) {
    const departments = hospital.departments || [];
    const wards = hospital.wards || [];

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={onToggle}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 w-64 max-w-[85vw] bg-white border-r border-slate-100 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:max-w-none flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 md:p-6 mb-2 flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90 transition-opacity">
                        <img src="/logo.svg" alt="MedRoster" className="w-10 h-10 rounded-xl shadow-lg shadow-ghs-teal/20 shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-base font-extrabold text-ghs-deep leading-tight">MedRoster</span>
                            <span className="text-[10px] font-bold text-ghs-muted uppercase tracking-wider">Dashboard</span>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={onToggle}
                        className="md:hidden w-9 h-9 shrink-0 rounded-xl bg-ghs-surface flex items-center justify-center text-ghs-muted hover:text-ghs-deep"
                        aria-label="Close menu"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 space-y-8">
                    <div className="space-y-1">
                        <h4 className="px-4 mb-3">Wards</h4>
                        {departments.length === 0 ? (
                            <p className="px-4 text-[11px] font-medium text-ghs-muted">Add a department group first.</p>
                        ) : (
                            <div className="space-y-1">
                                {departments.map((d) => {
                                    const departmentWards = getDisplayWardsForDepartment(d, wards);
                                    return (
                                        <div key={d._id} className="px-3 py-2 rounded-xl bg-slate-50/50">
                                            <div className="flex items-center gap-2 text-[12px] font-bold text-ghs-deep">
                                                <div className="w-2 h-2 rounded-full bg-ghs-teal/60" />
                                                <span className="flex-1 truncate">{d.name}</span>
                                            </div>
                                            {departmentWards.length > 0 && (
                                                <div className="mt-2 ml-4 space-y-1">
                                                    {departmentWards.map((ward) => {
                                                        const active = activeTab === 'ward' && String(activeWardId) === String(ward._id);
                                                        return (
                                                            <button
                                                                key={ward._id}
                                                                type="button"
                                                                onClick={() => onWardOpen?.(ward._id)}
                                                                className={`block w-full text-left text-[11px] font-bold truncate rounded-lg px-2 py-1 ${
                                                                    active
                                                                        ? 'bg-ghs-teal-light text-ghs-teal'
                                                                        : 'text-ghs-muted hover:text-ghs-teal'
                                                                }`}
                                                            >
                                                                {ward.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <h4 className="px-4 mb-3">Hospital</h4>
                        {canWrite && (
                            <button
                                className={`w-full sidebar-item ${activeTab === 'departments' ? 'sidebar-item-active' : 'text-ghs-muted hover:bg-slate-50'}`}
                                onClick={() => onTabChange('departments')}
                            >
                                Add / edit wards
                            </button>
                        )}
                        {showSettings && (
                            <button
                                className={`w-full sidebar-item ${activeTab === 'settings' ? 'sidebar-item-active' : 'text-ghs-muted hover:bg-slate-50'}`}
                                onClick={() => onTabChange('settings')}
                            >
                                Settings
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-50">
                    <div className="p-3 bg-ghs-surface rounded-2xl">
                        <p className="text-xs font-bold text-ghs-deep truncate">{hospital.name}</p>
                        <p className="text-[10px] font-medium text-ghs-muted truncate">{hospital.type} · {hospital.region}</p>
                    </div>
                </div>
            </aside>
        </>
    );
}
