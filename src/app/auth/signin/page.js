'use client';

import { useState, Suspense } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, googleProvider, mapAuthError } from '../../../lib/firebase';
import { apiFetch } from '../../../lib/api';
import GoogleSignInButton, { AuthDivider } from '../../../components/auth/GoogleSignInButton';
import PhoneAuthPanel from '../../../components/auth/PhoneAuthPanel';
import AuthGateway from '../../../components/auth/AuthGateway';

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
        <AuthGateway tab="signin">
            <div>

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
        </AuthGateway>
    );
}

export default function SignInPage() {
    return (
        <Suspense>
            <SignInForm />
        </Suspense>
    );
}
