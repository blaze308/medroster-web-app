'use client';

import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import DepartmentTemplatePicker from '../modals/DepartmentTemplatePicker';
import { getDisplayWardsForDepartment } from '../../lib/org-units';
import { getDefaultWardGuidelines } from '../../lib/ghana-data';

export default function DepartmentsTab({ hospital, onChange, onWardOpen, canWrite = true }) {
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [wardDrafts, setWardDrafts] = useState({});
    const [wardGuidelinesOpen, setWardGuidelinesOpen] = useState({});
    const [wardGuidelineDrafts, setWardGuidelineDrafts] = useState({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const departments = hospital.departments || [];
    const wards = hospital.wards || [];
    const defaultGuidelines = getDefaultWardGuidelines(hospital.settings || {});

    const guidelinesFor = (departmentId) =>
        wardGuidelineDrafts[departmentId] || defaultGuidelines;

    const handleAddBulk = async (deps) => {
        setBusy(true);
        setError('');
        try {
            await apiFetch(`/api/hospitals/${hospital._id}/departments`, {
                method: 'POST',
                body: JSON.stringify({ departments: deps }),
            });
            setShowAdd(false);
            await onChange();
        } catch (err) {
            setError(err.message || 'Failed to add departments');
        } finally {
            setBusy(false);
        }
    };

    const startEdit = (dept) => {
        setEditingId(dept._id);
        setEditName(dept.name);
        setEditDesc(dept.description || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditDesc('');
    };

    const saveEdit = async (depId) => {
        if (!editName.trim()) return;
        try {
            await apiFetch(`/api/hospitals/${hospital._id}/departments/${depId}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() }),
            });
            cancelEdit();
            await onChange();
        } catch (err) {
            alert(err.message || 'Failed to update');
        }
    };

    const handleDelete = async (dept) => {
        if (!confirm(`Delete ${dept.name}? Staff in this department must be moved first.`)) return;
        try {
            await apiFetch(`/api/hospitals/${hospital._id}/departments/${dept._id}`, { method: 'DELETE' });
            await onChange();
        } catch (err) {
            alert(err.message || 'Failed to delete');
        }
    };

    const handleAddWard = async (departmentId) => {
        const name = (wardDrafts[departmentId] || '').trim();
        if (!name) return;
        const guidelines = guidelinesFor(departmentId);
        try {
            const data = await apiFetch(`/api/hospitals/${hospital._id}/wards`, {
                method: 'POST',
                body: JSON.stringify({
                    departmentId,
                    name,
                    guidelines: {
                        minSeniorPerShift: Math.max(0, Number(guidelines.minSeniorPerShift) || 0),
                        expectInCharge: guidelines.expectInCharge !== false,
                        notes: String(guidelines.notes || '').trim(),
                    },
                }),
            });
            setWardDrafts((drafts) => ({ ...drafts, [departmentId]: '' }));
            setWardGuidelinesOpen((open) => ({ ...open, [departmentId]: false }));
            await onChange();
            onWardOpen?.(data._id);
        } catch (err) {
            alert(err.message || 'Failed to add ward');
        }
    };

    if (showAdd) {
        return (
            <div className="mr-enter">
                <DepartmentTemplatePicker
                    onSave={handleAddBulk}
                    onSkip={() => setShowAdd(false)}
                    busy={busy}
                    error={error}
                    existingNames={departments.map((d) => d.name)}
                />
            </div>
        );
    }

    return (
        <div className="mr-enter">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">{wards.length} {wards.length === 1 ? 'Ward / Unit' : 'Wards / Units'}</h2>
                    <p className="text-synclly-muted font-medium text-sm mt-1">Departments group the work. Wards and units are where the roster happens.</p>
                </div>
                {canWrite && (
                <button
                    onClick={() => setShowAdd(true)}
                    className="btn btn-primary text-xs py-2"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Department Group
                </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {departments.map((d) => {
                    const isEditing = editingId === d._id;
                    const departmentWards = getDisplayWardsForDepartment(d, wards);
                    return (
                        <div key={d._id} className="group bg-white rounded-[24px] border border-slate-50 p-6 transition-all hover:shadow-synclly hover:-translate-y-0.5">
                            {isEditing ? (
                                <div className="space-y-3">
                                    <input
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full h-11 bg-synclly-surface border border-slate-100 rounded-xl px-3 text-sm font-bold text-synclly-deep focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
                                    />
                                    <input
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                        placeholder="Description"
                                        className="w-full h-11 bg-synclly-surface border border-slate-100 rounded-xl px-3 text-sm font-medium text-synclly-deep placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={cancelEdit} className="flex-1 h-10 rounded-xl bg-white border border-slate-200 text-synclly-muted text-xs font-bold hover:bg-slate-50 cursor-pointer">Cancel</button>
                                        <button onClick={() => saveEdit(d._id)} className="flex-1 h-10 rounded-xl bg-synclly-coral text-white text-xs font-bold hover:bg-synclly-coral-hover cursor-pointer">Save</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <h3 className="text-lg font-extrabold text-synclly-deep leading-tight">{d.name}</h3>
                                        {canWrite && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(d)}
                                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-synclly-coral hover:bg-synclly-coral/5 flex items-center justify-center cursor-pointer"
                                                title="Edit"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M12 20h9" />
                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(d)}
                                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                                                title="Delete"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                                                </svg>
                                            </button>
                                        </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-synclly-muted font-medium leading-relaxed min-h-[2.5em]">
                                        {d.description || 'No description'}
                                    </p>
                                    <div className="mt-5 pt-4 border-t border-slate-50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest">Wards</span>
                                            <span className="text-[10px] font-extrabold text-synclly-coral">{departmentWards.length}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {departmentWards.map((ward) => (
                                                <button
                                                    key={ward._id}
                                                    type="button"
                                                    onClick={() => onWardOpen?.(ward._id)}
                                                    className="px-2 py-1 rounded-lg bg-synclly-surface text-[10px] font-bold text-synclly-deep hover:bg-synclly-coral hover:text-white transition-colors cursor-pointer"
                                                    title="Open ward"
                                                >
                                                    {ward.name}
                                                </button>
                                            ))}
                                            {departmentWards.length === 0 && (
                                                <span className="text-[11px] font-medium text-synclly-muted">
                                                    Add the first ward or unit for this department.
                                                </span>
                                            )}
                                        </div>
                                        {canWrite && (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    value={wardDrafts[d._id] || ''}
                                                    onChange={(e) => setWardDrafts((drafts) => ({ ...drafts, [d._id]: e.target.value }))}
                                                    placeholder="New ward name"
                                                    className="min-w-0 flex-1 h-9 bg-synclly-surface border border-slate-100 rounded-xl px-3 text-xs font-medium text-synclly-deep placeholder:text-slate-300 focus:outline-none focus:border-synclly-coral"
                                                />
                                                <button
                                                    onClick={() => handleAddWard(d._id)}
                                                    className="h-9 px-3 rounded-xl bg-synclly-coral text-white text-[10px] font-bold hover:bg-synclly-coral-hover"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setWardGuidelinesOpen((open) => ({ ...open, [d._id]: !open[d._id] }))}
                                                className="text-[10px] font-bold text-synclly-muted hover:text-synclly-coral uppercase tracking-widest"
                                            >
                                                {wardGuidelinesOpen[d._id] ? 'Hide guidelines' : 'Roster guidelines'}
                                            </button>
                                            {wardGuidelinesOpen[d._id] && (
                                                <div className="rounded-xl bg-amber-50/80 border border-amber-100 p-3 space-y-2">
                                                    <p className="text-[11px] font-medium text-amber-900/80 leading-snug">
                                                        Soft tips only — missing seniors or an in-charge never blocks saving.
                                                    </p>
                                                    <label className="flex items-start gap-2 text-[11px] font-medium text-synclly-deep">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5"
                                                            checked={guidelinesFor(d._id).expectInCharge !== false}
                                                            onChange={(e) =>
                                                                setWardGuidelineDrafts((drafts) => ({
                                                                    ...drafts,
                                                                    [d._id]: { ...guidelinesFor(d._id), expectInCharge: e.target.checked },
                                                                }))
                                                            }
                                                        />
                                                        Expect a ward in-charge on staff (tip only)
                                                    </label>
                                                    <label className="flex items-center gap-2 text-[11px] font-medium text-synclly-deep">
                                                        <span className="shrink-0">Min senior / shift</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={10}
                                                            value={guidelinesFor(d._id).minSeniorPerShift ?? 1}
                                                            onChange={(e) =>
                                                                setWardGuidelineDrafts((drafts) => ({
                                                                    ...drafts,
                                                                    [d._id]: {
                                                                        ...guidelinesFor(d._id),
                                                                        minSeniorPerShift: Math.max(0, Number(e.target.value) || 0),
                                                                    },
                                                                }))
                                                            }
                                                            className="w-14 h-8 rounded-lg border border-amber-200 bg-white px-2 text-xs font-bold"
                                                        />
                                                    </label>
                                                    <p className="text-[10px] font-medium text-synclly-muted leading-snug">
                                                        Prefer a senior or in-charge on Morning, Afternoon, and Night. Labour hours/rest stay warnings on the roster.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {departments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[40px] border border-slate-100 shadow-synclly">
                    <h3 className="text-xl font-extrabold text-synclly-deep">No departments yet</h3>
                    <p className="text-synclly-muted text-sm font-medium max-w-xs mt-2 mb-6">
                        {canWrite
                            ? 'Add department groups first, then add the wards or units that staff actually work in.'
                            : 'An admin has not set up departments yet.'}
                    </p>
                    {canWrite && (
                    <button onClick={() => setShowAdd(true)} className="btn btn-primary text-xs py-2">
                        Add Departments
                    </button>
                    )}
                </div>
            )}
        </div>
    );
}
