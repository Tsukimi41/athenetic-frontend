'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, Zap, CheckCircle2, Loader2 } from 'lucide-react';

interface ReadinessInputProps {
  onSubmit?: (data: {
    readiness_score: number;
    deload_factor: number;
    deload_target_sets: number;
    recommendation: string;
  }) => void;
}

export function ReadinessInput({ onSubmit }: ReadinessInputProps) {
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [muscleSoreness, setMuscleSoreness] = useState<number>(3);
  const [runningKm, setRunningKm] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Format today's date as ISO string
      const today = new Date().toISOString().split('T')[0];

      const res = await fetch('http://localhost:8080/api/v1/readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_date: today,
          sleep_hours: sleepHours,
          muscle_soreness: muscleSoreness,
          running_km_prior_day: runningKm,
        }),
        cache: 'no-store',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit readiness');
      }

      const data = await res.json();
      setResponse(data);

      // Call parent callback
      if (onSubmit) {
        onSubmit({
          readiness_score: data.readiness_score,
          deload_factor: data.deload_factor,
          deload_target_sets: data.deload_target_sets,
          recommendation: data.recommendation,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Color coding for readiness score
  const getReadinessColor = (score: number) => {
    if (score >= 85) return 'text-[#34C759]'; // Green
    if (score >= 70) return 'text-[#FF9500]'; // Orange
    return 'text-[#FF3B30]'; // Red
  };

  const getReadinessBg = (score: number) => {
    if (score >= 85) return 'bg-[#E8F5E9]'; // Light green
    if (score >= 70) return 'bg-[#FFF3E0]'; // Light orange
    return 'bg-[#FFEBEE]'; // Light red
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Zap className="w-5 h-5 text-[#FF9500]" />
        <h2 className="text-lg font-bold tracking-tight">Daily Readiness Check</h2>
      </div>

      {response ? (
        // Success state: Show readiness score
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-6 ${getReadinessBg(response.readiness_score)} border-2 border-transparent`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className={`w-6 h-6 ${getReadinessColor(response.readiness_score)}`} />
              <h3 className="text-lg font-semibold">Readiness Score</h3>
            </div>
            <div className={`text-4xl font-bold ${getReadinessColor(response.readiness_score)}`}>
              {response.readiness_score}
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#86868B]">Deload Factor</span>
              <span className="font-semibold text-[#1D1D1F]">{(response.deload_factor * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#86868B]">Target Sets</span>
              <span className="font-semibold text-[#1D1D1F]">3 → {response.deload_target_sets}</span>
            </div>
          </div>

          <p className="text-sm text-[#1D1D1F] font-medium">
            {response.recommendation}
          </p>

          <button
            onClick={() => setResponse(null)}
            className="w-full mt-6 px-4 py-2 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-semibold rounded-xl transition-colors"
          >
            Update Readiness
          </button>
        </motion.div>
      ) : (
        // Input form state
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sleep Hours Slider */}
          <div>
            <label className="block text-sm font-semibold text-[#1D1D1F] mb-2 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Sleep Last Night</span>
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-[#E5E5EA] rounded-full appearance-none cursor-pointer"
              />
              <div className="w-16 text-right">
                <span className="text-2xl font-bold text-[#1D1D1F]">{sleepHours.toFixed(1)}</span>
                <span className="text-xs text-[#86868B]">hours</span>
              </div>
            </div>
            <p className="text-xs text-[#86868B] mt-2">Optimal: 8 hours</p>
          </div>

          {/* Muscle Soreness Slider */}
          <div>
            <label className="block text-sm font-semibold text-[#1D1D1F] mb-2 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>Muscle Soreness</span>
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="10"
                value={muscleSoreness}
                onChange={(e) => setMuscleSoreness(parseInt(e.target.value))}
                className="flex-1 h-2 bg-[#E5E5EA] rounded-full appearance-none cursor-pointer"
              />
              <div className="w-16 text-right">
                <span className="text-2xl font-bold text-[#1D1D1F]">{muscleSoreness}</span>
                <span className="text-xs text-[#86868B]">/ 10</span>
              </div>
            </div>
            <p className="text-xs text-[#86868B] mt-2">0 = No soreness, 10 = Severe</p>
          </div>

          {/* Running Distance Input */}
          <div>
            <label className="block text-sm font-semibold text-[#1D1D1F] mb-2">
              Running Yesterday
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={runningKm}
                onChange={(e) => setRunningKm(parseFloat(e.target.value))}
                placeholder="0"
                className="flex-1 px-4 py-2 border border-[#E5E5EA] rounded-xl focus:outline-none focus:border-[#0071E3]"
              />
              <span className="text-sm text-[#86868B] font-semibold">km</span>
            </div>
            <p className="text-xs text-[#86868B] mt-2">Impacts recovery (interference effect)</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#FFEBEE] border border-[#FF3B30] rounded-xl p-3"
            >
              <p className="text-sm text-[#FF3B30] font-medium">{error}</p>
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-[#007AFF] hover:bg-[#0051D5] disabled:bg-[#C7C7CC] text-white font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Calculating...</span>
              </>
            ) : (
              <span>Calculate Readiness</span>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}
