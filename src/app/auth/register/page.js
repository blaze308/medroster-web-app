'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithPopup } from 'firebase/auth';
import { HOSPITAL_TYPES, GHANA_REGIONS } from '../../../lib/ghana-data';
import { auth, googleProvider, mapAuthError } from '../../../lib/firebase';
import GoogleSignInButton, { AuthDivider } from '../../../components/auth/GoogleSignInButton';
import AccountTypePicker from '../../../components/auth/AccountTypePicker';
import PhoneAuthPanel from '../../../components/auth/PhoneAuthPanel';
import { takeGuestDataForMigration } from '../../../lib/guest-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function RegisterPage() {
    const router = useRouter();

    const [accountType, setAccountType] = useState('enterprise');
    const [step, setStep] = useState(0); // 0 type, 1 hospital (enterprise), 2 credentials
    const [hospitalName, setHospitalName] = useState('');
    const [hospitalType, setHospitalType] = useState('District Hospital');
    const [hospitalRegion, setHospitalRegion] = useState('Greater Accra');
    const [hospitalLocation, setHospitalLocation] = useState('');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPhone, setShowPhone] = useState(false);
    const [error, setError] = useState('');

    const hospitalPayload = () => ({
        hospitalName,
        hospitalType,
        hospitalRegion,
        hospitalLocation: hospitalLocation.trim(),
    });

    const migrateGuestIfAny = async (token) => {
        const guest = takeGuestDataForMigration();
        if (!guest || accountType !== 'individual') return;
        try {
            await fetch(`${API_URL}/api/me/schedules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: guest.name || 'Migrated guest schedule',
                    startDate: guest.startDate,
                    endDate: guest.endDate,
                    staff: guest.staff || [],
                    assignments: guest.assignments || [],
                    holidays: guest.holidays || [],
                }),
            });
        } catch {
            // non-fatal
        }
    };

    const redirectAfterRegister = (data) => {
        if (data.accountType === 'individual' || accountType === 'individual') {
            router.push('/individual');
            return;
        }
        if (data.hospitalId) {
            router.push(`/hospital/${data.hospitalId}/setup`);
            return;
        }
        router.push('/auth/signin?registered=1');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

        setLoading(true);
        try {
            const body = {
                name: name.trim(),
                email: email.trim(),
                password,
                accountType,
                ...(accountType === 'enterprise' ? hospitalPayload() : {}),
            };
            const res = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Registration failed'); return; }
            router.push('/auth/signin?registered=1');
        } catch (err) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const completeSocialRegister = async (provider) => {
        setError('');
        setGoogleLoading(true);
        try {
            let result;
            if (provider === 'google') {
                result = await signInWithPopup(auth, googleProvider);
            }
            const token = await result.user.getIdToken();
            const endpoint = provider === 'google' ? '/api/auth/register-google' : '/api/auth/register-phone';
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: result.user.displayName || name.trim() || '',
                    accountType,
                    ...(accountType === 'enterprise' ? hospitalPayload() : {}),
                }),
            });
            const data = await res.json();
            if (res.status === 409 && data.hospitalId) {
                router.push(`/hospital/${data.hospitalId}`);
                return;
            }
            if (res.status === 409 && data.accountType === 'individual') {
                router.push('/individual');
                return;
            }
            if (!res.ok) { setError(data.error || 'Registration failed'); return; }
            await migrateGuestIfAny(token);
            redirectAfterRegister(data);
        } catch (err) {
            setError(mapAuthError(err, 'Registration failed'));
        } finally {
            setGoogleLoading(false);
        }
    };

    const handlePhoneVerified = async (cred) => {
        setError('');
        setLoading(true);
        try {
            const token = await cred.user.getIdToken();
            const res = await fetch(`${API_URL}/api/auth/register-phone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim() || 'Admin',
                    accountType,
                    ...(accountType === 'enterprise' ? hospitalPayload() : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok && res.status !== 409) { setError(data.error || 'Registration failed'); return; }
            await migrateGuestIfAny(token);
            redirectAfterRegister(data);
        } catch (err) {
            setError(mapAuthError(err));
        } finally {
            setLoading(false);
        }
    };

    const inputCls =
        'w-full h-13 bg-ghs-surface border border-slate-100 rounded-2xl px-4 text-sm font-semibold text-ghs-deep placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-ghs-teal/10 focus:border-ghs-teal transition-all';

    return (
        <div className="min-h-screen bg-ghs-surface flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <img src="/logo.svg" alt="MedRoster" className="inline-block w-16 h-16 rounded-[20px] mb-5 shadow-lg shadow-ghs-teal/25" />
                    <h1 className="text-3xl font-extrabold text-ghs-deep tracking-tight">MedRoster</h1>
                    <p className="text-ghs-muted font-medium mt-1 text-sm">Create your account</p>
                </div>

                <div className="bg-white rounded-[32px] shadow-synclly border border-slate-100 p-8">
                    {step === 0 && (
                        <>
                            <h2 className="text-xl font-extrabold text-ghs-deep mb-1">How will you use MedRoster?</h2>
                            <p className="text-sm text-ghs-muted font-medium mb-6">
                                Already registered?{' '}
                                <Link href="/auth/signin" className="text-ghs-teal font-bold hover:underline">Sign in</Link>
                            </p>
                            <AccountTypePicker value={accountType} onChange={setAccountType} />
                            <button
                                type="button"
                                onClick={() => setStep(accountType === 'enterprise' ? 1 : 2)}
                                className="w-full h-13 mt-6 bg-ghs-teal text-white rounded-2xl font-bold text-sm"
                            >
                                Continue →
                            </button>
                            <p className="text-center text-xs text-ghs-muted mt-4">
                                Or try{' '}
                                <Link href="/guest" className="text-ghs-teal font-bold hover:underline">Guest mode</Link>
                                {' '}(local only, limited exports)
                            </p>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <h2 className="text-xl font-extrabold text-ghs-deep mb-1">Hospital details</h2>
                            <p className="text-sm text-ghs-muted font-medium mb-7">You&apos;ll get a unique join code for staff.</p>
                            <form
                                onSubmit={(e) => { e.preventDefault(); if (hospitalName.trim()) setStep(2); }}
                                className="space-y-4"
                            >
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Hospital Name</label>
                                    <input autoFocus required className={inputCls} placeholder="e.g. Korle Bu Teaching Hospital"
                                        value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Type</label>
                                        <select value={hospitalType} onChange={(e) => setHospitalType(e.target.value)}
                                            className={inputCls + ' appearance-none cursor-pointer'}>
                                            {HOSPITAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Region</label>
                                        <select value={hospitalRegion} onChange={(e) => setHospitalRegion(e.target.value)}
                                            className={inputCls + ' appearance-none cursor-pointer'}>
                                            {GHANA_REGIONS.map((r) => <option key={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">City / Town (optional)</label>
                                    <input className={inputCls} placeholder="e.g. Accra"
                                        value={hospitalLocation} onChange={(e) => setHospitalLocation(e.target.value)} />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setStep(0)} className="h-13 px-6 rounded-2xl border border-slate-200 font-bold text-sm">← Back</button>
                                    <button type="submit" className="flex-1 h-13 bg-ghs-teal text-white rounded-2xl font-bold text-sm">Continue →</button>
                                </div>
                            </form>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 className="text-xl font-extrabold text-ghs-deep mb-1">Create your account</h2>
                            <p className="text-sm text-ghs-muted font-medium mb-6">
                                {accountType === 'enterprise' ? (
                                    <>For <span className="font-bold text-ghs-deep">{hospitalName}</span></>
                                ) : 'Individual account — schedules saved to the cloud'}
                            </p>

                            {!showPhone && (
                                <>
                                    <GoogleSignInButton
                                        onClick={() => completeSocialRegister('google')}
                                        loading={googleLoading}
                                        label="Sign up with Google"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPhone(true)}
                                        className="w-full h-13 mt-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50"
                                    >
                                        Sign up with phone (OTP)
                                    </button>
                                    <AuthDivider label="or use email" />
                                </>
                            )}

                            {showPhone ? (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Your Name</label>
                                        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                                    </div>
                                    <PhoneAuthPanel onVerified={handlePhoneVerified} buttonLabel="Send OTP" />
                                    <button type="button" className="text-xs font-bold text-ghs-muted" onClick={() => setShowPhone(false)}>← Back to other options</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Your Name</label>
                                        <input type="text" required className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Email</label>
                                        <input type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Password</label>
                                        <input type="password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Confirm Password</label>
                                        <input type="password" required className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                    </div>
                                    {error && <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-bold text-rose-600">{error}</div>}
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setStep(accountType === 'enterprise' ? 1 : 0)}
                                            className="h-13 px-6 rounded-2xl border border-slate-200 font-bold text-sm">← Back</button>
                                        <button type="submit" disabled={loading} className="flex-1 h-13 bg-ghs-teal text-white rounded-2xl font-bold text-sm disabled:opacity-50">
                                            {loading ? 'Creating…' : 'Create Account'}
                                        </button>
                                    </div>
                                </form>
                            )}
                            {error && showPhone && (
                                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-bold text-rose-600 mt-3">{error}</div>
                            )}
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-ghs-muted mt-6 font-medium">
                    <Link href="/" className="hover:text-ghs-teal transition-colors">← Back to home</Link>
                    {' · '}
                    <Link href="/auth/join" className="hover:text-ghs-teal transition-colors">Join a hospital</Link>
                </p>
            </div>
        </div>
    );
}
