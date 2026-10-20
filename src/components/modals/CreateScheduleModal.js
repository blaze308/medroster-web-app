'use client';

import { useState } from 'react';
import { apiFetch } from '../../lib/api';

function todayInput() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

function defaultEndDate(startDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 29);
    return d.toISOString().split('T')[0];
}

export default function CreateScheduleModal({ hospitalId, wards = [], departments = [], onClose, onCreated }) {
    const initialStart = todayInput();
    const [wardId, setWardId] = useState(wards[0]?._id || '');
    const [startDate, setStartDate] = useState(initialStart);
    const [endDate, setEndDate] = useState(defaultEndDate(initialStart));
    const [name, setName] = useState('');
    const [hasHolidays, setHasHolidays] = useState(false);
    const [holidays, setHolidays] = useState([{ date: '', name: '' }]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const wardOptions = wards.map((ward) => {
        const department = departments.find((d) => String(d._id) === String(ward.departmentId));
        return { ...ward, label: `${department?.name || 'Department'} / ${ward.name}` };
    });

    const updateHoliday = (index, key, value) => {
        setHolidays((items) => items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!wardId) {
            setError('Choose a ward for this roster');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const selectedHolidays = hasHolidays
                ? holidays
                    .filter((h) => h.date)
                    .map((h) => ({ date: h.date, name: h.name.trim() }))
                : [];
            const data = await apiFetch(`/api/hospitals/${hospitalId}/schedules`, {
                method: 'POST',
                body: JSON.stringify({ wardId, startDate, endDate, holidays: selectedHolidays, name: name.trim() }),
            });
            onCreated(data);
        } catch (err) {
            setError(err.message || 'Failed to create schedule');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-synclly-lg border border-slate-50 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-10">
                    <h2 className="text-xl md:text-2xl font-extrabold text-synclly-deep tracking-tight mb-2">New Schedule</h2>
                    <p className="text-synclly-muted font-medium text-sm mb-6">
                        Choose the ward, cycle dates, and any holidays inside the roster.
                    </p>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest ml-1">Ward</label>
                            <select
                                required
                                value={wardId}
                                onChange={(e) => setWardId(e.target.value)}
                                className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-bold text-synclly-deep focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
                            >
                                <option value="">Select ward</option>
                                {wardOptions.map((ward) => (
                                    <option key={ward._id} value={ward._id}>{ward.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest ml-1">Cycle Dates</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    type="date"
                                    required
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setEndDate(defaultEndDate(e.target.value));
                                    }}
                                    className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-bold text-synclly-deep focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
                                />
                                <input
                                    type="date"
                                    required
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-bold text-synclly-deep focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest ml-1">Label (optional)</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Easter week roster"
                                className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-medium text-synclly-deep placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
                            />
                        </div>

                        <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-synclly-surface border border-slate-100">
                            <span>
                                <span className="block text-sm font-extrabold text-synclly-deep">Holidays in this cycle?</span>
                                <span className="block text-xs font-medium text-synclly-muted">Marked holidays add to each regular staff member off-day target.</span>
                            </span>
                            <input type="checkbox" checked={hasHolidays} onChange={(e) => setHasHolidays(e.target.checked)} />
                        </label>

                        {hasHolidays && (
                            <div className="space-y-3">
                                {holidays.map((holiday, index) => (
                                    <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                                        <input
                                            type="date"
                                            value={holiday.date}
                                            min={startDate}
                                            max={endDate}
                                            onChange={(e) => updateHoliday(index, 'date', e.target.value)}
                                            className="h-11 bg-synclly-surface border border-slate-100 rounded-xl px-3 text-xs font-bold text-synclly-deep focus:outline-none focus:border-synclly-coral"
                                        />
                                        <input
                                            value={holiday.name}
                                            onChange={(e) => updateHoliday(index, 'name', e.target.value)}
                                            placeholder="Holiday name"
                                            className="h-11 bg-synclly-surface border border-slate-100 rounded-xl px-3 text-xs font-medium text-synclly-deep focus:outline-none focus:border-synclly-coral"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setHolidays((items) => items.filter((_, i) => i !== index))}
                                            className="h-11 w-11 rounded-xl text-rose-400 hover:bg-rose-50"
                                        >
                                            x
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setHolidays((items) => [...items, { date: '', name: '' }])}
                                    className="text-xs font-bold text-synclly-coral"
                                >
                                    Add another holiday
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-xs font-bold text-rose-600">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 h-12 rounded-2xl bg-white border border-slate-200 text-synclly-muted font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-[2] h-12 rounded-2xl bg-synclly-coral text-white font-bold text-sm hover:bg-synclly-coral-hover shadow-xl shadow-synclly-coral/20 disabled:opacity-50"
                        >
                            {submitting ? 'Creating...' : 'Create Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
