'use client';

import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { LEAVE_TYPES } from '../../lib/ghana-data';

/**
 * Embedded leave CRUD — used inside StaffFormModal only (no separate overlay).
 * Uses div + button handlers so it can sit inside a parent form without nested <form>.
 */
export function LeaveManagerPanel({ hospitalId, staff, onUpdated }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [leaveType, setLeaveType] = useState('Annual');
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [busyDeleteId, setBusyDeleteId] = useState(null);

    const records = (staff.leaveRecords || []).slice().sort(
        (a, b) => new Date(b.startDate) - new Date(a.startDate)
    );

    const recordId = (r, idx) => r.id || r._id || `${r.startDate || ''}-${r.endDate || ''}-${r.leaveType || ''}-${idx}`;

    const handleAdd = async () => {
        if (!startDate || !endDate) { setError('Both dates are required'); return; }
        setBusy(true);
        setError('');
        try {
            await apiFetch(`/api/hospitals/${hospitalId}/staff/${staff._id}/leave`, {
                method: 'POST',
                body: JSON.stringify({ startDate, endDate, leaveType, notes }),
            });
            setStartDate('');
            setEndDate('');
            setNotes('');
            await onUpdated?.();
        } catch (err) {
            setError(err.message || 'Failed to add leave');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (leaveId) => {
        setBusyDeleteId(leaveId);
        try {
            await apiFetch(`/api/hospitals/${hospitalId}/staff/${staff._id}/leave?leaveId=${leaveId}`, { method: 'DELETE' });
            await onUpdated?.();
        } catch (err) {
            alert(err.message || 'Failed to remove leave');
        } finally {
            setBusyDeleteId(null);
        }
    };

    const formatDate = (d) =>
        new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className="space-y-8">
            <p className="text-xs font-medium text-synclly-muted">
                Annual leave balance recorded on file:{' '}
                <span className="font-extrabold text-synclly-deep">{staff.annualLeaveBalance ?? 15} days</span>
                {' · '}
                Edit the balance under the Employment tab.
            </p>

            <div className="space-y-4 pb-6 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-synclly-deep">Add leave period</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest ml-1">Start</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-bold text-synclly-deep focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest ml-1">End</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-bold text-synclly-deep focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest ml-1">Type</label>
                        <select
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value)}
                            className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-bold text-synclly-deep focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral cursor-pointer"
                        >
                            {LEAVE_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest ml-1">Notes</label>
                        <input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-medium text-synclly-deep placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
                            placeholder="Optional"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-xs font-bold text-rose-600">
                        {error}
                    </div>
                )}

                <p className="text-[11px] font-medium text-synclly-muted leading-relaxed">
                    Shifts that fall inside this window are removed automatically from active schedules.
                </p>

                <button
                    type="button"
                    disabled={busy}
                    onClick={handleAdd}
                    className="w-full h-12 rounded-2xl bg-synclly-coral text-white font-bold text-sm hover:bg-synclly-coral-hover shadow-xl shadow-synclly-coral/20 disabled:opacity-50"
                >
                    {busy ? 'Adding...' : 'Add leave period'}
                </button>
            </div>

            <div>
                <h3 className="text-sm font-extrabold text-synclly-deep mb-4">Recorded periods ({records.length})</h3>
                {records.length === 0 ? (
                    <p className="text-synclly-muted text-sm font-medium">None yet.</p>
                ) : (
                    <div className="space-y-2">
                        {records.map((r, idx) => (
                            <div key={recordId(r, idx)} className="flex items-center justify-between p-3 bg-synclly-surface rounded-2xl">
                                <div>
                                    <div className="text-sm font-extrabold text-synclly-deep">
                                        {formatDate(r.startDate)} → {formatDate(r.endDate)}
                                    </div>
                                    <div className="text-[11px] text-synclly-muted font-bold uppercase tracking-wider mt-0.5">
                                        {r.leaveType}{r.notes ? ` · ${r.notes}` : ''}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={busyDeleteId === recordId(r, idx)}
                                    onClick={() => handleDelete(r.id || r._id)}
                                    className="text-rose-400 hover:text-rose-500 hover:bg-rose-50 w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-50"
                                    aria-label="Remove leave period"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
