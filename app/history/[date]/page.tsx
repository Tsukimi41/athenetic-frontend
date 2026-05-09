'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { apiFetch, refreshAccessToken } from '../../lib/api';
import { SessionDetailCard } from '../../components/SessionDetailCard';

interface HistoryPageProps {
  params: { date: string };
}

export default function HistoryPage({ params }: HistoryPageProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bodyWeight, setBodyWeight] = useState<number | null>(null);

  const date = params.date;

  useEffect(() => {
    const bootstrap = async () => {
      const token = await refreshAccessToken();
      if (token) setAccessToken(token);
      setAuthChecked(true);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    const fetchProfileAndSessions = async () => {
      setLoading(true);
      try {
        const profileRes = await apiFetch('/api/v1/auth/me', { cache: 'no-store' }, accessToken, setAccessToken);
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setBodyWeight(profile.body_weight_kg ?? null);
        }

        const response = await apiFetch(`/api/v1/sessions/${date}`, { cache: 'no-store' }, accessToken, setAccessToken);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to load sessions');
        }

        const data = await response.json();
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndSessions();
  }, [accessToken, date]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#86868B]" />
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-6">
        <div className="bg-white rounded-[32px] p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] text-center">
          <p className="text-sm text-[#86868B] mb-4">Please log in to view history.</p>
          <Link href="/" className="px-4 py-2 bg-[#007AFF] text-white rounded-xl text-sm font-semibold">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans antialiased">
      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-[#007AFF] font-semibold flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <span className="text-xs text-[#86868B] font-semibold uppercase tracking-wider">{date}</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-6">Workout History</h1>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-[#86868B]" />
          </div>
        ) : error ? (
          <div className="bg-[#FFEBEE] border border-[#FF3B30] rounded-xl p-3">
            <p className="text-sm text-[#FF3B30] font-medium">{error}</p>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-[#86868B]">No sessions logged for this date.</p>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => (
              <SessionDetailCard key={session.session_id} session={session} bodyWeight={bodyWeight} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
