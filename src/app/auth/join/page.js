'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, mapAuthError } from '../../../lib/firebase';
import { apiFetch } from '../../../lib/api';
import JoinCodeInput from '../../../components/auth/JoinCodeInput';
import GoogleSignInButton from '../../../components/auth/GoogleSignInButton';
import PhoneAuthPanel from '../../../components/auth/PhoneAuthPanel';
import { useFirebaseAuth } from '../../../components/FirebaseAuthProvider';
import AuthGateway from '../../../components/auth/AuthGateway';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function JoinHospitalPage() {
    const router = useRouter();
    const { status } = useFirebaseAuth();
    const [joinCode, setJoinCode] = useState('');
    const [name, setName] = useState('');
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const lookup = async () => {
        setError('');
        setPreview(null);
        if (!joinCode.trim()) return;
        setLoading(true);
        try {
            // Need auth for lookup — if not signed in, just store code and show auth options
            if (status !== 'authenticated') {
                setPreview({ pendingAuth: true });
                return;
            }
            const data = await apiFetch(`/api/hospitals/lookup/${encodeURIComponent(joinCode)}`);
            setPreview(data);
        } catch (err) {
            setError(err.message || 'Hospital not found');
        } finally {
            setLoading(false);
        }
    };

    const join = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await apiFetch('/api/auth/join-hospital', {
                method: 'POST',
                body: JSON.stringify({ joinCode, name: name.trim() || undefined }),
            });
            router.push(`/hospital/${data.hospitalId}`);
        } catch (err) {
            setError(err.message || 'Failed to join');
        } finally {
            setLoading(false);
        }
    };

    const ensureAuthThenJoin = async (via) => {
        setError('');
        setLoading(true);
        try {
            if (via === 'google') await signInWithPopup(auth, googleProvider);
            // phone handled separately
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${API_URL}/api/auth/join-hospital`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ joinCode, name: name.trim() || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Join failed');
            router.push(`/hospital/${data.hospitalId}`);
        } catch (err) {
            setError(mapAuthError(err, err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthGateway tab="join">
            <div>
                <h2 className="text-xl font-extrabold text-ghs-deep mb-1">Join a hospital</h2>
                <p className="text-sm text-ghs-muted font-medium mb-6">Ask your admin for the hospital join code.</p>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Join code</label>
                        <div className="mt-1">
                            <JoinCodeInput value={joinCode} onChange={setJoinCode} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Your name</label>
                        <input
                            className="w-full h-13 mt-1 bg-ghs-surface border border-slate-100 rounded-2xl px-4 text-sm font-semibold"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Optional if already on Google/phone profile"
                        />
                    </div>

                    {preview && !preview.pendingAuth && (
                        <div className="bg-ghs-teal/5 border border-ghs-teal/20 rounded-2xl p-4 text-sm">
                            <div className="font-extrabold text-ghs-deep">{preview.name}</div>
                            <div className="text-xs text-ghs-muted mt-1">{preview.type} · {preview.region}</div>
                        </div>
                    )}

                    {error && <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-bold text-rose-600">{error}</div>}

                    {status === 'authenticated' ? (
                        <div className="flex gap-3">
                            <button type="button" onClick={lookup} disabled={loading} className="flex-1 h-12 rounded-2xl border font-bold text-sm">
                                Look up
                            </button>
                            <button type="button" onClick={join} disabled={loading || !joinCode} className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm disabled:opacity-50">
                                Join
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-ghs-muted font-medium">Sign in first, then we&apos;ll attach you to the hospital.</p>
                            <GoogleSignInButton onClick={() => ensureAuthThenJoin('google')} loading={loading} label="Continue with Google" />
                            <PhoneAuthPanel
                                onVerified={() => ensureAuthThenJoin('phone')}
                                buttonLabel="Continue with phone"
                            />
                            <Link href="/auth/signin" className="block text-center text-xs font-bold text-ghs-teal">
                                Or sign in with email
                            </Link>
                        </div>
                    )}
                </div>

            </div>
        </AuthGateway>
    );
}
