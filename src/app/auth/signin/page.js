'use client';

import { useState, Suspense } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth, googleProvider, mapAuthError } from '../../../lib/firebase';
import { apiFetch } from '../../../lib/api';
import GoogleSignInButton, { AuthDivider } from '../../../components/auth/GoogleSignInButton';
import PhoneAuthPanel from '../../../components/auth/PhoneAuthPanel';

function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || null;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPhone, setShowPhone] = useState(false);

    const redirectAfterSignIn = async () => {
        if (auth.currentUser) {
            await auth.currentUser.getIdToken(true);
        }
        try {
            const me = await apiFetch('/api/auth/me');
            if (callbackUrl) {
                router.push(callbackUrl);
                return;
            }
            if (me.accountType === 'individual' || !me.hospitalId) {
                router.push('/individual');
                return;
            }
            if (me.role === 'staff') {
                router.push(`/hospital/${me.hospitalId}`);
                return;
            }
            router.push(`/hospital/${me.hospitalId}`);
        } catch {
            const hospitals = await apiFetch('/api/hospitals').catch(() => []);
            const hid = hospitals?.[0]?._id;
            if (hid) router.push(`/hospital/${hid}`);
            else router.push('/auth/register');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
            await redirectAfterSignIn();
        } catch (err) {
            setError(mapAuthError(err, 'Sign-in failed. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            await signInWithPopup(auth, googleProvider);
            await redirectAfterSignIn();
        } catch (err) {
            setError(mapAuthError(err, 'Google sign-in failed.'));
        } finally {
            setGoogleLoading(false);
        }
    };

    const handlePhoneVerified = async () => {
        try {
            await redirectAfterSignIn();
        } catch (err) {
            setError(mapAuthError(err));
        }
    };

    return (
        <div className="min-h-screen bg-ghs-surface flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <img src="/logo.svg" alt="MedRoster" className="inline-block w-16 h-16 rounded-[20px] mb-5 shadow-lg shadow-ghs-teal/25" />
                    <h1 className="text-3xl font-extrabold text-ghs-deep tracking-tight">MedRoster</h1>
                    <p className="text-ghs-muted font-medium mt-1 text-sm">Ghana Hospital Staff Scheduling</p>
                </div>

                <div className="bg-white rounded-[32px] shadow-synclly border border-slate-100 p-8">
                    <h2 className="text-xl font-extrabold text-ghs-deep mb-1">Sign in to your account</h2>
                    <p className="text-sm text-ghs-muted font-medium mb-7">
                        Don&apos;t have an account?{' '}
                        <Link href="/auth/register" className="text-ghs-teal font-bold hover:underline">
                            Register
                        </Link>
                        {' · '}
                        <Link href="/auth/join" className="text-ghs-teal font-bold hover:underline">
                            Join hospital
                        </Link>
                    </p>

                    {!showPhone ? (
                        <>
                            <GoogleSignInButton onClick={handleGoogle} loading={googleLoading} label="Sign in with Google" />
                            <button
                                type="button"
                                onClick={() => setShowPhone(true)}
                                className="w-full h-13 mt-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50"
                            >
                                Sign in with phone (OTP)
                            </button>
                            <AuthDivider />

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        autoFocus
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-13 bg-ghs-surface border border-slate-100 rounded-2xl px-4 text-sm font-semibold text-ghs-deep focus:outline-none focus:ring-4 focus:ring-ghs-teal/10 focus:border-ghs-teal"
                                        placeholder="you@hospital.gh"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-13 bg-ghs-surface border border-slate-100 rounded-2xl px-4 text-sm font-semibold text-ghs-deep focus:outline-none focus:ring-4 focus:ring-ghs-teal/10 focus:border-ghs-teal"
                                        placeholder="••••••••"
                                    />
                                </div>
                                {error && (
                                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-bold text-rose-600">{error}</div>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading || googleLoading}
                                    className="w-full h-13 bg-ghs-teal text-white rounded-2xl font-bold text-sm disabled:opacity-50"
                                >
                                    {loading ? 'Signing in…' : 'Sign In'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <PhoneAuthPanel onVerified={handlePhoneVerified} buttonLabel="Send OTP" />
                            {error && <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-bold text-rose-600">{error}</div>}
                            <button type="button" className="text-xs font-bold text-ghs-muted" onClick={() => setShowPhone(false)}>
                                ← Back to email / Google
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-ghs-muted mt-6 font-medium">
                    <Link href="/" className="hover:text-ghs-teal transition-colors">← Back to home</Link>
                    {' · '}
                    <Link href="/guest" className="hover:text-ghs-teal transition-colors">Try guest mode</Link>
                </p>
            </div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense>
            <SignInForm />
        </Suspense>
    );
}
