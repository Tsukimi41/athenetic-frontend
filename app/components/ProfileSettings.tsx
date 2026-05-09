'use client';

import { User } from 'lucide-react';

interface ProfileSettingsProps {
  profile: { email?: string; name?: string } | null;
  bodyWeight: string;
  targetBodyWeight: string;
  bodyFatPercentage: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onBodyWeightChange: (value: string) => void;
  onTargetBodyWeightChange: (value: string) => void;
  onBodyFatPercentageChange: (value: string) => void;
  onSave: () => void;
}

export function ProfileSettings({
  profile,
  bodyWeight,
  targetBodyWeight,
  bodyFatPercentage,
  loading,
  saving,
  error,
  onBodyWeightChange,
  onTargetBodyWeightChange,
  onBodyFatPercentageChange,
  onSave,
}: ProfileSettingsProps) {
  const current = Number(bodyWeight);
  const target = Number(targetBodyWeight);
  const hasDelta = Number.isFinite(current) && Number.isFinite(target) && current > 0 && target > 0;
  const delta = hasDelta ? target - current : 0;
  const deltaLabel = hasDelta
    ? delta === 0
      ? 'At target'
      : `${Math.abs(delta).toFixed(1)} kg ${delta > 0 ? 'to gain' : 'to lose'}`
    : 'Set a target weight';

  return (
    <section className="bg-white rounded-[32px] p-8 mb-10 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-center space-x-2 mb-6">
        <User className="w-5 h-5 text-[#007AFF]" />
        <h2 className="text-lg font-bold tracking-tight">Profile</h2>
      </div>

      {loading ? (
        <p className="text-sm text-[#86868B]">Loading profile...</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#86868B] font-semibold uppercase">Email</p>
              <p className="text-sm font-semibold text-[#1D1D1F]">{profile?.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-[#86868B] font-semibold uppercase">Name</p>
              <p className="text-sm font-semibold text-[#1D1D1F]">{profile?.name || '-'}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="bg-[#F2F2F7] rounded-2xl p-4">
              <label className="block text-xs text-[#86868B] font-semibold mb-2">Body Weight (kg)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={bodyWeight}
                onChange={(e) => onBodyWeightChange(e.target.value)}
                className="w-full bg-transparent text-2xl font-bold text-[#1D1D1F] focus:outline-none"
                placeholder="72.5"
              />
            </div>
            <div className="bg-[#F2F2F7] rounded-2xl p-4">
              <label className="block text-xs text-[#86868B] font-semibold mb-2">Target Body Weight (kg)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={targetBodyWeight}
                onChange={(e) => onTargetBodyWeightChange(e.target.value)}
                className="w-full bg-transparent text-2xl font-bold text-[#1D1D1F] focus:outline-none"
                placeholder="70.0"
              />
              <p className="text-xs text-[#86868B] mt-2">{deltaLabel}</p>
            </div>
            <div className="bg-[#F2F2F7] rounded-2xl p-4">
              <label className="block text-xs text-[#86868B] font-semibold mb-2">Body Fat Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={bodyFatPercentage}
                onChange={(e) => onBodyFatPercentageChange(e.target.value)}
                className="w-full bg-transparent text-2xl font-bold text-[#1D1D1F] focus:outline-none"
                placeholder="18.5"
              />
            </div>
          </div>

          {error && (
            <div className="bg-[#FFEBEE] border border-[#FF3B30] rounded-xl p-3">
              <p className="text-sm text-[#FF3B30] font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={onSave}
            disabled={saving}
            className="w-full px-4 py-3 bg-[#007AFF] hover:bg-[#0051D5] disabled:bg-[#C7C7CC] text-white font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      )}
    </section>
  );
}
