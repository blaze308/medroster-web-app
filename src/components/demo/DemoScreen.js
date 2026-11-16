'use client';

import { useState } from 'react';
import MsIcon from '../landing/MsIcon';
import MarketingFrame from '../marketing/MarketingFrame';

const DAYS = ['Tue 01', 'Wed 02', 'Thu 03', 'Fri 04', 'Sat 05', 'Sun 06', 'Mon 07'];
const WEEKEND = new Set([4, 5]);

const STAFF = {
  'Faustina Mensah': { rank: 'Principal Nursing Officer (PNO)', short: 'PNO', pin: 'GHS-N-48201', hours: 158, target: 160, weekends: '2 of 4', fatigue: 'Low Risk', license: 'Valid', licenseNote: 'Exp: Dec 2025', initials: 'FM' },
  'Kwame Boateng': { rank: 'Senior Nursing Officer (SNO)', short: 'SNO', pin: 'GHS-N-51290', hours: 156, target: 160, weekends: '2 of 4', fatigue: 'Optimal', license: 'Valid', licenseNote: 'Exp: Aug 2026', initials: 'KB' },
  'Akua Serwaah': { rank: 'Nursing Officer (NO)', short: 'NO', pin: 'GHS-N-62044', hours: 160, target: 160, weekends: '3 of 4', fatigue: 'Moderate Risk', license: 'Valid', licenseNote: 'Exp: Nov 2024', initials: 'AS' },
  'Benedicta Osei': { rank: 'Staff Nurse (SN)', short: 'SN', pin: 'GHS-N-74199', hours: 162, target: 160, weekends: '2 of 4', fatigue: 'Low Risk', license: 'Valid', licenseNote: 'Exp: Mar 2025', initials: 'BO' },
  'Comfort Tetteh': { rank: 'Senior Nursing Officer (SNO)', short: 'SNO', pin: 'GHS-N-39182', hours: 160, target: 160, weekends: '0 of 4 (Annual Leave)', fatigue: 'None (On Leave)', license: 'Valid', licenseNote: 'Exp: Jan 2026', initials: 'CT', leave: true },
  'Emmanuel Donkor': { rank: 'Nursing Officer (NO)', short: 'NO', pin: 'GHS-N-80911', hours: 154, target: 160, weekends: '2 of 4', fatigue: 'Low Risk', license: 'Valid', licenseNote: 'Exp: Sep 2025', initials: 'ED' },
  'Doris Annan (Float)': { rank: 'Staff Nurse (SN)', short: 'SN', pin: 'GHS-N-90234', hours: 96, target: 160, weekends: '1 of 4', fatigue: 'Very Low (Float Pool)', license: 'Valid', licenseNote: 'Exp: Jul 2026', initials: 'DA', float: true },
};

const BASE_ROWS = [
  { id: 'faustina', name: 'Faustina Mensah', rank: 'PNO', shifts: ['M', 'M', 'A', 'OFF', 'N', 'N', 'OFF'], hours: '40 hrs', charge: true },
  { id: 'kwame', name: 'Kwame Boateng', rank: 'SNO', shifts: ['A', 'A', 'OFF', 'M', 'M', 'OFF', 'N'], hours: '39 hrs' },
  { id: 'akua', name: 'Akua Serwaah', rank: 'NO', shifts: ['N', 'OFF', 'OFF', 'M', 'A', 'A', 'OFF'], hours: '38 hrs' },
  { id: 'benedicta', name: 'Benedicta Osei', rank: 'SN', shifts: ['M', 'M', 'M', 'OFF', 'OFF', 'N', 'N'], hours: '41 hrs' },
  { id: 'comfort', name: 'Comfort Tetteh', rank: 'SNO', shifts: ['AL', 'AL', 'AL', 'AL', 'AL', 'AL', 'AL'], hours: '40 hrs (AL)', leave: true },
  { id: 'emmanuel', name: 'Emmanuel Donkor', rank: 'NO', shifts: ['A', 'OFF', 'M', 'A', 'N', 'OFF', 'M'], hours: '39 hrs' },
  { id: 'doris', name: 'Doris Annan (Float)', rank: 'SN', shifts: ['OFF', 'OFF', 'M', 'M', 'OFF', 'M', 'OFF'], hours: '24 hrs', float: true },
];

const SHIFT_CLASS = {
  M: 'bg-mint-surface text-emerald-deep',
  A: 'bg-secondary-container text-on-secondary-container',
  N: 'bg-slate-body text-surface',
  OFF: 'bg-surface-container text-slate-muted',
  AL: 'bg-amber-surface text-amber-shift',
  SICK: 'bg-crimson-surface text-crimson-alert font-bold animate-pulse',
};

const OPTIONS = [
  ['M', 'Morning (07:30 - 15:30)', 'bg-mint-surface text-emerald-deep'],
  ['A', 'Afternoon (13:30 - 20:30)', 'bg-secondary-container text-on-secondary-container'],
  ['N', 'Night (19:30 - 08:00)', 'bg-slate-body text-surface'],
  ['OFF', 'Off Duty (OFF)', 'bg-surface-container text-slate-black'],
  ['AL', 'Annual Leave (AL)', 'bg-amber-surface text-amber-shift'],
];

const BASE_LOG = [
  '[10:14:02] Ward 4B Matrix initialized (14/14 staff).',
  '[10:14:03] Section 40 Act 651 constraints active.',
  '[10:14:04] Skill mix balance verified (100% compliant).',
];

const CLEAR = {
  tone: 'mint',
  icon: 'verified',
  title: '0 Active Conflicts',
  desc: 'Every shift covers mandatory skill mix (at least 1 PNO/SNO + 2 Staff Nurses per ward wing).',
};

function stamp() {
  return new Date().toTimeString().split(' ')[0];
}

function cloneRows() {
  return BASE_ROWS.map((row) => ({ ...row, shifts: [...row.shifts], highlight: row.shifts.map(() => false) }));
}

export default function DemoScreen() {
  const [rows, setRows] = useState(cloneRows);
  const [selected, setSelected] = useState('Faustina Mensah');
  const [editor, setEditor] = useState(null);
  const [conflict, setConflict] = useState(CLEAR);
  const [logs, setLogs] = useState(BASE_LOG);
  const [notice, setNotice] = useState(false);
  const [printNote, setPrintNote] = useState('');
  const [rank, setRank] = useState('ALL');
  const [week, setWeek] = useState('1');
  const [balanced, setBalanced] = useState(false);

  const profile = STAFF[selected];
  const percent = Math.round((profile.hours / profile.target) * 1000) / 10;

  const log = (message) => {
    setLogs((current) => [`[${stamp()}] ${message}`, ...current].slice(0, 12));
  };

  const openCell = (row, day) => {
    setEditor({ id: row.id, day, name: row.name });
    log(`Opened shift editor for ${row.name.replace(' (Float)', '')}, ${DAYS[day]}.`);
  };

  const applyShift = (code) => {
    if (!editor) return;
    setRows((current) => current.map((row) => {
      if (row.id !== editor.id) return row;
      const shifts = [...row.shifts];
      shifts[editor.day] = code;
      return { ...row, shifts };
    }));
    log(`Manual shift override applied: Set to ${code}.`);
    setEditor(null);
  };

  const emergency = () => {
    log('EMERGENCY: Akua Serwaah reported sudden medical absence for Tue Oct 01 Night Shift.');
    setRows((current) => current.map((row) => {
      if (row.id !== 'akua') return row;
      const shifts = [...row.shifts];
      shifts[0] = 'SICK';
      return { ...row, shifts };
    }));
    setConflict({
      tone: 'amber',
      icon: 'warning',
      title: '1 Emergency Gap Detected',
      desc: 'Ward 4B Night Shift drops below required ratio. Float Pool allocation triggered.',
    });
    window.setTimeout(() => {
      log('AUTO-HEAL: Float Reserve Nurse Doris Annan drafted to cover Tue Oct 01 Night.');
      setRows((current) => current.map((row) => {
        if (row.id !== 'doris') return row;
        const shifts = [...row.shifts];
        const highlight = [...row.highlight];
        shifts[0] = 'N';
        highlight[0] = true;
        return { ...row, shifts, highlight, hours: '34 hrs' };
      }));
      setConflict({
        tone: 'mint',
        icon: 'verified',
        title: 'Conflict Resolved by Float',
        desc: 'Doris Annan (SN) assigned. Ward ratio restored to Act 651 safe standard.',
      });
      log('Ward integrity secured. Zero statutory breaches.');
    }, 1200);
  };

  const balance = () => {
    log('Re-computing linear programming matrix for 14 nurses across 31 days...');
    window.setTimeout(() => {
      setBalanced(true);
      log('Rebalancing night distribution: Night variance compressed to ±0.5 shifts.');
      log('Optimal roster generated. Compliance: 100% Section 40-44 Act 651.');
    }, 600);
  };

  const reset = () => {
    setRows(cloneRows());
    setSelected('Faustina Mensah');
    setEditor(null);
    setConflict(CLEAR);
    setLogs(BASE_LOG);
    setBalanced(false);
    setRank('ALL');
    setWeek('1');
    setPrintNote('');
    log('Sandbox ward reset to baseline state.');
  };

  const visible = rows.filter((row) => rank === 'ALL' || row.rank === rank);

  return (
    <MarketingFrame>
      <section className="w-full bg-surface-container-low py-3 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-surface text-amber-shift">
              <MsIcon name="bolt" className="text-[18px]" />
            </span>
            <div className="flex flex-wrap items-center gap-x-2 text-sm">
              <span className="font-bold text-slate-black">Interactive Guest Sandbox</span>
              <span className="text-slate-muted">•</span>
              <span className="font-semibold text-emerald-deep">Ridge Hospital (Greater Accra Regional Hospital)</span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] font-bold text-slate-body">Ward 4B Female Medical</span>
              <span className="text-[11px] text-slate-muted">October 2024 Cycle</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-surface text-forest-mid text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-deep animate-ping" />
              Live In-Memory Simulation
            </span>
            <button type="button" onClick={reset} className="px-3 py-1.5 rounded-lg bg-surface-container text-[13px] font-semibold text-slate-body flex items-center gap-1 cursor-pointer">
              <MsIcon name="restart_alt" className="text-[16px]" /> Reset Demo
            </button>
          </div>
        </div>
      </section>

      <section className="w-full px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-xl shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={balance} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-deep text-on-primary text-[13px] font-semibold cursor-pointer">
                <MsIcon name="auto_fix_high" className="text-[18px]" /> Balance Roster
              </button>
              <button type="button" onClick={emergency} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-crimson-surface text-crimson-alert text-[13px] font-semibold cursor-pointer">
                <MsIcon name="person_cancel" className="text-[18px]" /> Emergency Absence
              </button>
              <button type="button" onClick={() => { setNotice(true); setPrintNote(''); log('Exported GHS Certified Noticeboard preview document.'); }} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container text-slate-black text-[13px] font-semibold cursor-pointer">
                <MsIcon name="picture_as_pdf" className="text-[18px]" /> Export GHS Noticeboard PDF
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-muted">
              <MsIcon name="verified_user" className="text-[16px] text-teal-brand" />
              Ghana Labour Act 2003 (Act 651) Enforcement Mode: Active
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Clinical Ward Roster', '14 Nurses Active', '1 Float Reserve on Standby', 'group'],
              ['Shift Coverage Ratio', '100% Target Met', 'M (07:30) • A (13:30) • N (19:30)', 'event_available'],
              ['Act 651 Compliance', '100% Valid', 'Zero 48hr Continuous Breaches', 'gavel'],
              ['Senior Charge Status', 'PNO / SNO Covered', 'All 31 Shifts Supervised', 'shield_person'],
            ].map(([label, value, note, icon]) => (
              <div key={label} className="p-4 bg-surface-container-lowest rounded-xl shadow-sm flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-muted block">{label}</span>
                  <span className="text-base font-bold text-slate-black block">{value}</span>
                  <span className="text-xs text-slate-muted">{note}</span>
                </div>
                <span className="w-10 h-10 rounded-lg bg-mint-surface text-emerald-deep flex items-center justify-center shrink-0">
                  <MsIcon name={icon} className="text-[24px]" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full px-4 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-9 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-container-lowest rounded-xl shadow-sm">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[13px] text-slate-muted mr-1">Ranks:</span>
                {['ALL', 'PNO', 'SNO', 'NO', 'SN'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => { setRank(item); log(`Filtered grid by rank: ${item}`); }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${rank === item ? 'bg-emerald-deep text-on-primary' : 'bg-surface-container text-slate-body'}`}
                  >
                    {item === 'ALL' ? 'All Staff (7)' : item}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-surface-container rounded-lg p-0.5">
                {['1', '2', '3', '4'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => { setWeek(item); log(`Switched view to Week ${item}`); }}
                    className={`px-3 py-1 rounded text-[11px] font-semibold cursor-pointer ${week === item ? 'bg-surface-container-lowest text-slate-black shadow-sm' : 'text-slate-muted'}`}
                  >
                    Wk {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-1 text-[11px] text-slate-body">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-mint-surface" /> Morning (M)</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-secondary-container" /> Afternoon (A)</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-body" /> Night (N)</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-surface-container" /> Off</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-surface" /> Annual Leave</span>
            </div>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-surface-container-low text-slate-muted text-[11px] font-semibold">
                      <th className="py-3 px-4 w-60 uppercase tracking-wider">Clinician / Rank / PIN</th>
                      {DAYS.map((day, index) => (
                        <th key={day} className={`py-3 px-2 text-center w-16 ${WEEKEND.has(index) ? 'bg-surface-container' : ''}`}>{day}</th>
                      ))}
                      <th className="py-3 px-3 text-right w-20">Total Hrs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container text-sm">
                    {visible.map((row) => {
                      const staff = STAFF[row.name];
                      const active = selected === row.name;
                      return (
                        <tr
                          key={row.id}
                          onClick={() => { setSelected(row.name); log(`Inspecting profile for ${staff.rank.startsWith('Staff') && row.float ? 'Doris Annan (Float Reserve)' : row.name} (${staff.rank}).`); }}
                          className={`cursor-pointer ${active ? 'bg-mint-surface/30' : 'hover:bg-surface-container-low'} ${row.leave ? 'opacity-90' : ''}`}
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-black flex items-center gap-1.5">
                              {row.float ? 'Doris Annan' : row.name}
                              {row.charge && <MsIcon name="verified" className="text-[16px] text-teal-brand" />}
                              {row.float && <span className="px-1.5 rounded bg-mint-surface text-teal-brand text-[11px]">FLOAT</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-muted">
                              <span className={`px-1.5 rounded font-semibold ${row.leave ? 'bg-amber-surface text-amber-shift' : 'bg-surface-container text-forest-mid'}`}>
                                {row.leave ? 'SNO (Leave)' : row.rank}
                              </span>
                              <span>{staff.pin}</span>
                            </div>
                          </td>
                          {row.shifts.map((code, day) => (
                            <td key={day} className={`p-1.5 text-center ${WEEKEND.has(day) ? 'bg-surface-container-low/80' : ''}`}>
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); openCell(row, day); }}
                                className={`w-full py-2 rounded text-[13px] font-semibold cursor-pointer ${SHIFT_CLASS[code]} ${row.highlight[day] || (balanced && code === 'N') ? 'ring-2 ring-emerald-deep' : ''}`}
                              >
                                {code}
                              </button>
                            </td>
                          ))}
                          <td className={`py-3 px-3 text-right text-xs font-bold whitespace-nowrap ${row.leave ? 'text-amber-shift' : 'text-slate-black'}`}>{row.hours}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-muted">
                <span>Showing {visible.length} of 7 Ward Clinicians in this week</span>
                <span className="font-semibold text-slate-black">GHS Schedule Integrity Hash: #GH-ACC-4B-1024</span>
              </div>
            </div>

            {editor && (
              <div className="p-4 bg-surface-container-lowest rounded-xl shadow-md border-l-4 border-emerald-deep flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MsIcon name="edit_calendar" className="text-emerald-deep" />
                    <span className="font-bold text-slate-black">Reassign Selected Slot</span>
                    <span className="text-xs text-slate-muted">Editing {editor.name} • {DAYS[editor.day]} (Current: {rows.find((row) => row.id === editor.id)?.shifts[editor.day]})</span>
                  </div>
                  <button type="button" onClick={() => setEditor(null)} className="text-slate-muted cursor-pointer" aria-label="Close editor">
                    <MsIcon name="close" className="text-[20px]" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {OPTIONS.map(([code, label, tone]) => (
                    <button key={code} type="button" onClick={() => applyShift(code)} className={`px-3 py-1.5 rounded-lg text-[13px] font-bold cursor-pointer ${tone}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="xl:col-span-3 flex flex-col gap-3">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-slate-black"><MsIcon name="badge" className="text-forest-mid" /> Staff Live Profile</span>
                <span className="px-2 py-0.5 rounded-full bg-mint-surface text-emerald-deep text-[11px] font-semibold">Active In Ward</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg">
                <div className="w-12 h-12 rounded-lg bg-emerald-deep text-on-primary flex items-center justify-center font-bold">{profile.initials}</div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-black truncate">{rowLabel(selected)}</div>
                  <div className="text-[13px] font-semibold text-forest-mid">{profile.rank}</div>
                  <div className="text-xs text-slate-muted">PIN: {profile.pin}</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-muted">Monthly Hours Target:</span>
                  <span className="font-bold text-slate-black">{profile.hours} / {profile.target} hrs ({percent}%)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden mt-1">
                  <div className="h-full bg-emerald-deep rounded-full" style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
                <span className="text-[11px] text-teal-brand">Complies with Section 40, Act 651 (40h/wk cap)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-surface-container-low rounded-lg">
                  <span className="text-[11px] text-slate-muted block">Weekend Duty</span>
                  <span className="font-bold text-slate-black">{profile.weekends}</span>
                </div>
                <div className="p-2 bg-surface-container-low rounded-lg">
                  <span className="text-[11px] text-slate-muted block">N&MC License</span>
                  <span className="font-bold text-forest-mid">{profile.license}</span>
                  <span className="text-xs text-slate-muted block">{profile.licenseNote}</span>
                </div>
              </div>
              <div className={`p-2 rounded-lg flex items-center gap-2 ${profile.fatigue.includes('Moderate') ? 'bg-amber-surface' : 'bg-mint-surface'}`}>
                <MsIcon name="bedtime" className={profile.fatigue.includes('Moderate') ? 'text-amber-shift' : 'text-forest-mid'} />
                <div>
                  <span className={`text-[13px] font-bold block ${profile.fatigue.includes('Moderate') ? 'text-amber-shift' : 'text-forest-mid'}`}>Fatigue Risk: {profile.fatigue}</span>
                  <span className="text-xs text-slate-body">Consecutive nights capped at 2 (Standard: ≤ 3)</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-slate-black"><MsIcon name="psychology" className="text-forest-mid" /> Shift Optimizer</span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] font-bold text-slate-body">v3.4 GhEngine</span>
              </div>
              <div className={`p-3 rounded-xl flex items-start gap-2 ${conflict.tone === 'amber' ? 'bg-amber-surface' : 'bg-mint-surface'}`}>
                <MsIcon name={conflict.icon} className={`text-[24px] ${conflict.tone === 'amber' ? 'text-amber-shift' : 'text-forest-mid'}`} />
                <div>
                  <span className={`font-bold block ${conflict.tone === 'amber' ? 'text-amber-shift' : 'text-forest-mid'}`}>{conflict.title}</span>
                  <p className="text-xs text-slate-body mt-0.5">{conflict.desc}</p>
                </div>
              </div>
              <div className="text-[13px] font-semibold text-slate-black flex items-center justify-between">
                Night Shift Load Balance
                <span className="text-xs text-forest-mid">{balanced ? '±0.5 shift variance' : '±1 shift variance'}</span>
              </div>
              <button type="button" onClick={balance} className="w-full py-2.5 px-3 rounded-lg bg-surface-container text-[13px] font-semibold text-slate-black flex items-center justify-between cursor-pointer">
                <span className="flex items-center gap-2"><MsIcon name="balance" className="text-[18px] text-teal-brand" /> Re-equate Night Distribution</span>
                <MsIcon name="play_arrow" className="text-[16px] text-slate-muted" />
              </button>
              <div className="p-2 bg-slate-black rounded-lg text-[11px] text-mint-surface">
                <div className="flex justify-between text-slate-muted mb-1"><span>SOLVER ENGINE LOG</span><span className="text-mint-border">READY</span></div>
                <div className="max-h-24 overflow-y-auto flex flex-col gap-0.5">
                  {logs.map((line, index) => <div key={`${index}-${line}`}>{line}</div>)}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {notice && (
        <div className="fixed inset-0 z-[80] bg-slate-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-4xl w-full rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-emerald-deep text-on-primary flex items-center justify-between gap-3">
              <div>
                <span className="font-bold block">Official Noticeboard Print Ready Preview</span>
                <span className="text-xs text-mint-border">Formatted strictly per Ghana Health Service Directorate Guidelines</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintNote('Notice queued for the ward printer. The browser page was not printed.')}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-emerald-deep text-[13px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <MsIcon name="print" className="text-[18px]" /> Print Notice
                </button>
                <button type="button" onClick={() => setNotice(false)} className="w-8 h-8 rounded-full bg-forest-mid text-on-primary cursor-pointer" aria-label="Close noticeboard">
                  <MsIcon name="close" className="text-[20px]" />
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto bg-slate-canvas">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-md border-t-8 border-emerald-deep flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-surface-container pb-4">
                  <div>
                    <span className="text-[11px] tracking-widest text-slate-muted uppercase">Ghana Health Service</span>
                    <h2 className="landing-headline">Greater Accra Regional Hospital (Ridge)</h2>
                    <p className="text-sm font-semibold text-slate-body">Directorate of Nursing & Midwifery Services</p>
                    <p className="text-xs text-forest-mid">Ward 4B — Female Medical Rotational Duty Roster</p>
                  </div>
                  <div className="text-xs text-slate-muted md:text-right">
                    <div className="font-bold text-slate-black">Roster period: October 2024</div>
                    <div>Ref: GARH/DNMS/W4B/2024-10</div>
                  </div>
                </div>
                <div className="p-3 bg-surface-container-low rounded-lg text-xs text-slate-body flex flex-wrap gap-4">
                  <span><strong>Warranted Beds:</strong> 32 Beds</span>
                  <span><strong>Ward Charge Nurse:</strong> Faustina Mensah (PNO)</span>
                  <span><strong>Weekly Target:</strong> 40 Hours Act 651</span>
                </div>
                {printNote && <p className="text-sm text-forest-mid font-semibold">{printNote}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-surface-container text-xs">
                  <div>
                    <span className="uppercase text-slate-muted">Prepared By</span>
                    <div className="h-10 border-b border-dashed border-slate-muted italic text-forest-mid flex items-end">Faustina Mensah (PNO)</div>
                  </div>
                  <div>
                    <span className="uppercase text-slate-muted">Reviewed & Certified</span>
                    <div className="h-10 border-b border-dashed border-slate-muted italic text-forest-mid flex items-end">Gladys Addo (DDNS Ridge Hospital)</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-mint-surface/50 rounded-xl border border-mint-border text-center">
                    <MsIcon name="verified" className="text-forest-mid" />
                    <span className="text-[11px] font-bold text-forest-mid uppercase">Official Ward Stamp</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low flex items-center justify-between gap-3">
              <span className="text-xs text-slate-muted">Standard GHS Noticeboard Print Layout — Scaled to ISO A3 / A4 Landscape</span>
              <button type="button" onClick={() => setNotice(false)} className="px-4 py-2 rounded-lg bg-surface-container text-[13px] font-semibold cursor-pointer">Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </MarketingFrame>
  );
}

function rowLabel(name) {
  if (name === 'Doris Annan (Float)') return 'Doris Annan (Float Reserve)';
  return name;
}
