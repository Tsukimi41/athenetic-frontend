'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Activity, Loader2, Flame, Filter } from 'lucide-react';
import { ReadinessInput } from './components/ReadinessInput';
import { apiFetch, API_BASE_URL, refreshAccessToken } from './lib/api';

type Exercise = { id: string; name: string; target_sets: number; target_reps: number; history: string; };
type WorkoutData = { date: string; title: string; muscle_group: string; readiness_score: number; exercises: Exercise[]; };
type SetState = { reps: number; rpe: number; weight: number; isCompleted: boolean; };
type ExerciseState = { [exerciseName: string]: SetState[] };
type VolumeData = { Chest: number; Back: number; Legs: number; };

// 🍎 進化版：上限突破＆ダイナミック・ボリューム・リング
const VolumeRing = ({ label, currentSets, targetSets, colorClass, strokeColor }: { label: string, currentSets: number, targetSets: number, colorClass: string, strokeColor: string }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const rawPercent = (currentSets / targetSets) * 100;
  const displayPercent = Math.min(rawPercent, 100);
  const strokeDashoffset = circumference - (displayPercent / 100) * circumference;

  const isOverVolume = currentSets >= targetSets;
  const dynamicStrokeWidth = isOverVolume ? "10" : "8";
  const glowStyle = isOverVolume ? { filter: `drop-shadow(0 0 6px ${strokeColor}66)` } : {};

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[#E5E5EA]" />
          
          <motion.circle
            key={currentSets}
            initial={{ strokeDashoffset: circumference, strokeWidth: 8 }}
            animate={{ strokeDashoffset, strokeWidth: parseInt(dynamicStrokeWidth) }}
            transition={{ duration: 1.0, ease: "easeOut" }}
            cx="48" cy="48" r={radius} stroke={strokeColor} fill="transparent"
            strokeDasharray={circumference}
            strokeLinecap="round"
            className={colorClass}
            style={glowStyle}
          />
        </svg>
        
        <div className="absolute flex flex-col items-center justify-center">
          <motion.span 
            key={`num-${currentSets}`}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className={`text-xl font-bold tracking-tight ${isOverVolume ? colorClass : ''}`}
          >
            {currentSets}
          </motion.span>
          <span className="text-[10px] text-[#86868B] font-semibold uppercase">Sets</span>
        </div>
      </div>
      <span className="mt-2 text-xs font-semibold tracking-wide text-[#86868B]">{label}</span>
    </div>
  );
};

export default function Home() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [volume, setVolume] = useState<VolumeData>({ Chest: 0, Back: 0, Legs: 0 });
  const [loading, setLoading] = useState(true);
  const [setStates, setSetStates] = useState<ExerciseState>({});
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('chest');
  const [readinessData, setReadinessData] = useState<any>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [showReadinessForm, setShowReadinessForm] = useState(false);
  const [progressSummary, setProgressSummary] = useState<any>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [nutritionSummary, setNutritionSummary] = useState<any>(null);
  const [nutritionFoodName, setNutritionFoodName] = useState('');
  const [nutritionProtein, setNutritionProtein] = useState<number>(0);
  const [nutritionCarbs, setNutritionCarbs] = useState<number>(0);
  const [nutritionFat, setNutritionFat] = useState<number>(0);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);

  const muscleGroups = [
    { id: 'chest', label: 'Chest (Push)', emoji: '🏋️' },
    { id: 'back', label: 'Back (Pull)', emoji: '🔄' },
    { id: 'legs', label: 'Legs', emoji: '🦵' },
    { id: 'shoulders', label: 'Shoulders', emoji: '🎯' },
  ];

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = await refreshAccessToken();
      if (token) setAccessToken(token);
      setAuthChecked(true);
    };

    bootstrapAuth();
  }, []);

  const handleAuthSubmit = async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const endpoint = authMode === 'signup' ? '/api/v1/auth/signup' : '/api/v1/auth/login';
      const payload: Record<string, string> = {
        email: authEmail,
        password: authPassword,
      };
      if (authMode === 'signup') {
        payload.name = authName;
      }

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Authentication failed');
      }

      const data = await res.json();
      setAccessToken(data.access_token || null);
      setAuthPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch workout and volume data
  useEffect(() => {
    if (!accessToken) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const workoutResponse = await apiFetch(
          `/api/v1/workouts/today?muscle_group=${selectedMuscleGroup}`,
          { cache: 'no-store' },
          accessToken,
          setAccessToken,
        );
        if (workoutResponse.status === 401) {
          setAccessToken(null);
          setLoading(false);
          return;
        }

        const volumeResponse = await apiFetch(
          '/api/v1/analytics/volume',
          { cache: 'no-store' },
          accessToken,
          setAccessToken,
        );
        if (volumeResponse.status === 401) {
          setAccessToken(null);
          setLoading(false);
          return;
        }

        const workoutRes = await workoutResponse.json();
        const volumeRes = await volumeResponse.json();

        setWorkout(workoutRes);
        setVolume(volumeRes);

        const initialStates: ExerciseState = {};
        workoutRes.exercises.forEach((ex: Exercise) => {
          initialStates[ex.name] = Array(ex.target_sets).fill(null).map(() => ({
            reps: ex.target_reps || 10,
            rpe: 7,
            weight: 0,
            isCompleted: false,
          }));
        });
        setSetStates(initialStates);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch workout data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMuscleGroup, accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const fetchProgress = async () => {
      try {
        const response = await apiFetch(
          `/api/v1/analytics/progress?muscle_group=${selectedMuscleGroup}`,
          { cache: 'no-store' },
          accessToken,
          setAccessToken,
        );
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to load progress');
        }

        const data = await response.json();
        setProgressSummary(data);
        setProgressError(null);
      } catch (error) {
        setProgressError(error instanceof Error ? error.message : 'Failed to load progress');
      }
    };

    fetchProgress();
  }, [selectedMuscleGroup, accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const today = new Date().toISOString().split('T')[0];
    fetchNutritionSummary(today);
  }, [accessToken]);

  const handleCompleteSet = async (exerciseName: string, setIndex: number) => {
    if (!accessToken) return;

    const currentState = setStates[exerciseName][setIndex];
    if (currentState.isCompleted) return;

    const newStates = { ...setStates };
    newStates[exerciseName][setIndex].isCompleted = true;
    setSetStates(newStates);

    try {
      const response = await apiFetch(
        '/api/v1/workouts',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_name: exerciseName,
            set_number: setIndex + 1,
            reps: currentState.reps,
            target_reps: currentState.reps,
            rpe: currentState.rpe,
            weight_kg: currentState.weight,
          }),
          cache: 'no-store',
        },
        accessToken,
        setAccessToken,
      );

      if (!response.ok) throw new Error('Save failed');

      // Refresh volume data
      const volumeRes = await apiFetch(
        '/api/v1/analytics/volume',
        { cache: 'no-store' },
        accessToken,
        setAccessToken,
      );
      const updatedVolume = await volumeRes.json();
      setVolume(updatedVolume);
    } catch (error) {
      newStates[exerciseName][setIndex].isCompleted = false;
      setSetStates({ ...newStates });
      console.error('Failed to save set:', error);
    }
  };

  const submitReadiness = async (input: { sleep_hours: number; muscle_soreness: number; running_km_prior_day: number; }) => {
    if (!accessToken) return;

    setReadinessLoading(true);
    setReadinessError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiFetch(
        '/api/v1/readiness',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input_date: today,
            sleep_hours: input.sleep_hours,
            muscle_soreness: input.muscle_soreness,
            running_km_prior_day: input.running_km_prior_day,
          }),
          cache: 'no-store',
        },
        accessToken,
        setAccessToken,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit readiness');
      }

      const data = await response.json();
      setReadinessData(data);
      setShowReadinessForm(false);
    } catch (error) {
      setReadinessError(error instanceof Error ? error.message : 'Failed to submit readiness');
    } finally {
      setReadinessLoading(false);
    }
  };

  const resetReadiness = () => {
    setReadinessData(null);
    setReadinessError(null);
  };

  async function fetchNutritionSummary(date: string) {
    if (!accessToken) return;

    try {
      const response = await apiFetch(
        `/api/v1/nutrition/summary/${date}`,
        { cache: 'no-store' },
        accessToken,
        setAccessToken,
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to load nutrition summary');
      }

      const data = await response.json();
      setNutritionSummary(data);
      setNutritionError(null);
    } catch (error) {
      setNutritionError(error instanceof Error ? error.message : 'Failed to load nutrition summary');
    }
  }

  async function submitNutrition() {
    if (!accessToken) return;
    setNutritionLoading(true);
    setNutritionError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiFetch(
        '/api/v1/nutrition/log',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            log_date: today,
            food_name: nutritionFoodName,
            protein_g: nutritionProtein,
            carbs_g: nutritionCarbs,
            fat_g: nutritionFat,
          }),
          cache: 'no-store',
        },
        accessToken,
        setAccessToken,
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to log nutrition');
      }

      await fetchNutritionSummary(today);
      setNutritionFoodName('');
      setNutritionProtein(0);
      setNutritionCarbs(0);
      setNutritionFat(0);
    } catch (error) {
      setNutritionError(error instanceof Error ? error.message : 'Failed to log nutrition');
    } finally {
      setNutritionLoading(false);
    }
  }

  const handleLogout = async () => {
    if (!accessToken) return;
    try {
      await apiFetch(
        '/api/v1/auth/logout',
        { method: 'POST', cache: 'no-store' },
        accessToken,
        setAccessToken,
      );
    } finally {
      setAccessToken(null);
      setWorkout(null);
      setVolume({ Chest: 0, Back: 0, Legs: 0 });
    }
  };

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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAuthSubmit();
          }}
          className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
        >
          <div className="mb-6">
            <p className="text-xs text-[#86868B] font-semibold uppercase tracking-wider">Athenetic</p>
            <h1 className="text-2xl font-bold tracking-tight">{authMode === 'signup' ? 'Create Account' : 'Welcome Back'}</h1>
          </div>

          <div className="flex space-x-2 mb-6">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold ${authMode === 'login' ? 'bg-[#007AFF] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold ${authMode === 'signup' ? 'bg-[#007AFF] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}
            >
              Sign Up
            </button>
          </div>

          {authMode === 'signup' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#86868B] mb-2">Name</label>
              <input
                type="text"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className="w-full px-4 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:border-[#007AFF]"
                placeholder="Your name"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#86868B] mb-2">Email</label>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full px-4 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:border-[#007AFF]"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#86868B] mb-2">Password</label>
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full px-4 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:border-[#007AFF]"
              placeholder="At least 12 characters"
              required
            />
          </div>

          {authError && (
            <div className="bg-[#FFEBEE] border border-[#FF3B30] rounded-xl p-3 mb-4">
              <p className="text-sm text-[#FF3B30] font-medium">{authError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full px-4 py-3 bg-[#007AFF] hover:bg-[#0051D5] disabled:bg-[#C7C7CC] text-white font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            {authLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{authMode === 'signup' ? 'Create Account' : 'Log In'}</span>
            )}
          </button>
        </form>
      </div>
    );
  }

  if (loading || !workout) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#86868B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans antialiased">
      <main className="max-w-2xl mx-auto px-6 py-16">
        
        <header className="mb-10 flex justify-between items-end">
          <div>
            <p className="text-sm font-semibold tracking-widest text-[#86868B] uppercase mb-1">{workout.date}</p>
            <h1 className="text-4xl font-bold tracking-tight">{workout.title}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#86868B] font-semibold uppercase tracking-wider mb-1">Readiness</p>
            <button
              onClick={() => setShowReadinessForm(!showReadinessForm)}
              className="flex items-center space-x-1 text-[#34C759] hover:text-[#00C853] transition-colors"
            >
              <Activity className="w-5 h-5" />
              <span className="text-2xl font-bold">{readinessData?.readiness_score || workout.readiness_score}%</span>
            </button>
            <button
              onClick={handleLogout}
              className="mt-2 text-xs font-semibold tracking-wide text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Muscle Group Selector */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-6 mb-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-[#007AFF]" />
            <h3 className="text-sm font-bold tracking-tight">Select Muscle Group</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {muscleGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedMuscleGroup(group.id)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  selectedMuscleGroup === group.id
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED]'
                }`}
              >
                <span className="mr-2">{group.emoji}</span>
                {group.label}
              </button>
            ))}
          </div>
        </motion.section>

        {/* Readiness Input Form */}
        {showReadinessForm && (
          <ReadinessInput
            onSubmit={submitReadiness}
            response={readinessData}
            loading={readinessLoading}
            error={readinessError}
            onReset={resetReadiness}
          />
        )}

        {/* Volume Ring Section */}
        <section className="bg-white rounded-[32px] p-8 mb-10 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center space-x-2 mb-6">
            <Flame className="w-5 h-5 text-[#FF3B30]" />
            <h2 className="text-lg font-bold tracking-tight">Weekly Hypertrophy Volume</h2>
          </div>
          <div className="flex justify-between items-center px-2">
            <VolumeRing label="Chest" currentSets={volume.Chest || 0} targetSets={10} colorClass="text-[#FF3B30]" strokeColor="#FF3B30" />
            <VolumeRing label="Back" currentSets={volume.Back || 0} targetSets={10} colorClass="text-[#0071E3]" strokeColor="#0071E3" />
            <VolumeRing label="Legs" currentSets={volume.Legs || 0} targetSets={10} colorClass="text-[#34C759]" strokeColor="#34C759" />
          </div>
        </section>

        {/* Progress Summary */}
        <section className="bg-white rounded-[32px] p-8 mb-10 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center space-x-2 mb-6">
            <Activity className="w-5 h-5 text-[#007AFF]" />
            <h2 className="text-lg font-bold tracking-tight">Progress Pulse</h2>
          </div>
          {progressError && (
            <p className="text-sm text-[#FF3B30] font-medium mb-2">{progressError}</p>
          )}
          {progressSummary ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F5F5F7] rounded-2xl p-4">
                <p className="text-xs text-[#86868B] font-semibold uppercase">Current Week</p>
                <p className="text-2xl font-bold">{Math.round(progressSummary.current_week_load)}</p>
              </div>
              <div className="bg-[#F5F5F7] rounded-2xl p-4">
                <p className="text-xs text-[#86868B] font-semibold uppercase">Prior Week</p>
                <p className="text-2xl font-bold">{Math.round(progressSummary.prior_week_load)}</p>
              </div>
              <div className="bg-[#F5F5F7] rounded-2xl p-4">
                <p className="text-xs text-[#86868B] font-semibold uppercase">Delta</p>
                <p className="text-2xl font-bold">{progressSummary.delta_percent.toFixed(1)}%</p>
              </div>
              <div className="bg-[#F5F5F7] rounded-2xl p-4">
                <p className="text-xs text-[#86868B] font-semibold uppercase">Status</p>
                <p className="text-sm font-semibold text-[#1D1D1F]">{progressSummary.status}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#86868B]">No progress data yet.</p>
          )}
        </section>

        {/* Nutrition Log */}
        <section className="bg-white rounded-[32px] p-8 mb-10 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center space-x-2 mb-6">
            <Flame className="w-5 h-5 text-[#FF9500]" />
            <h2 className="text-lg font-bold tracking-tight">Nutrition Log</h2>
          </div>

          <div className="space-y-4 mb-6">
            <input
              type="text"
              value={nutritionFoodName}
              onChange={(e) => setNutritionFoodName(e.target.value)}
              placeholder="Food name"
              className="w-full px-4 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:border-[#007AFF]"
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[#86868B] font-semibold">Protein (g)</label>
                <input
                  type="number"
                  min="0"
                  value={nutritionProtein}
                  onChange={(e) => setNutritionProtein(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl focus:outline-none focus:border-[#007AFF]"
                />
              </div>
              <div>
                <label className="text-xs text-[#86868B] font-semibold">Carbs (g)</label>
                <input
                  type="number"
                  min="0"
                  value={nutritionCarbs}
                  onChange={(e) => setNutritionCarbs(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl focus:outline-none focus:border-[#007AFF]"
                />
              </div>
              <div>
                <label className="text-xs text-[#86868B] font-semibold">Fat (g)</label>
                <input
                  type="number"
                  min="0"
                  value={nutritionFat}
                  onChange={(e) => setNutritionFat(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl focus:outline-none focus:border-[#007AFF]"
                />
              </div>
            </div>
            {nutritionError && (
              <div className="bg-[#FFEBEE] border border-[#FF3B30] rounded-xl p-3">
                <p className="text-sm text-[#FF3B30] font-medium">{nutritionError}</p>
              </div>
            )}
            <button
              onClick={submitNutrition}
              disabled={nutritionLoading}
              className="w-full px-4 py-3 bg-[#007AFF] hover:bg-[#0051D5] disabled:bg-[#C7C7CC] text-white font-semibold rounded-xl transition-colors"
            >
              {nutritionLoading ? 'Logging...' : 'Log Nutrition'}
            </button>
          </div>

          {nutritionSummary ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F5F5F7] rounded-2xl p-4">
                <p className="text-xs text-[#86868B] font-semibold uppercase">Protein</p>
                <p className="text-2xl font-bold">{Math.round(nutritionSummary.protein_logged)}g</p>
                <p className="text-xs text-[#86868B]">Target {Math.round(nutritionSummary.protein_target)}g</p>
              </div>
              <div className="bg-[#F5F5F7] rounded-2xl p-4">
                <p className="text-xs text-[#86868B] font-semibold uppercase">Calories</p>
                <p className="text-2xl font-bold">{Math.round(nutritionSummary.total_calories)}</p>
              </div>
              <div className="bg-[#F5F5F7] rounded-2xl p-4">
                <p className="text-xs text-[#86868B] font-semibold uppercase">Carbs</p>
                <p className="text-2xl font-bold">{Math.round(nutritionSummary.carbs_logged)}g</p>
              </div>
              <div className="bg-[#F5F5F7] rounded-2xl p-4">
                <p className="text-xs text-[#86868B] font-semibold uppercase">Fat</p>
                <p className="text-2xl font-bold">{Math.round(nutritionSummary.fat_logged)}g</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#86868B]">No nutrition logs yet today.</p>
          )}
        </section>

        {/* Workout Exercises */}
        <div className="space-y-6">
          {workout.exercises.map((exercise, exIndex) => (
            <motion.article 
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: exIndex * 0.1 }}
              className="bg-white rounded-[32px] p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
            >
              <h2 className="text-2xl font-semibold tracking-tight mb-1">{exercise.name}</h2>
              <p className="text-sm text-[#86868B] mb-6">{exercise.history}</p>

              <div className="space-y-3">
                {setStates[exercise.name]?.map((set, setIndex) => (
                  <div key={setIndex} className={`flex items-center justify-between p-4 rounded-2xl transition-colors duration-300 ${set.isCompleted ? 'bg-[#F2F2F7]' : 'bg-white border border-[#E5E5EA]'}`}>
                    <div className="flex items-center space-x-6">
                      <span className="text-sm font-semibold text-[#86868B] w-10">Set {setIndex + 1}</span>
                      
                      <div className="flex space-x-4">
                        <div className="flex items-end space-x-1">
                          <input 
                            type="number"
                            value={set.reps}
                            disabled={set.isCompleted}
                            onChange={(e) => {
                              const newStates = { ...setStates };
                              newStates[exercise.name][setIndex].reps = Number(e.target.value);
                              setSetStates(newStates);
                            }}
                            className="w-12 bg-transparent text-2xl font-bold focus:outline-none disabled:text-[#86868B] text-right"
                          />
                          <span className="text-xs text-[#86868B] font-semibold pb-1.5">reps</span>
                        </div>
                        <div className="flex items-end space-x-1">
                          <input 
                            type="number"
                            value={set.weight}
                            step="0.5"
                            min="0"
                            disabled={set.isCompleted}
                            onChange={(e) => {
                              const newStates = { ...setStates };
                              newStates[exercise.name][setIndex].weight = Number(e.target.value);
                              setSetStates(newStates);
                            }}
                            className="w-14 bg-transparent text-2xl font-bold focus:outline-none disabled:text-[#86868B] text-right"
                          />
                          <span className="text-xs text-[#86868B] font-semibold pb-1.5">kg</span>
                        </div>
                        <div className="flex items-end space-x-1">
                          <input 
                            type="number"
                            value={set.rpe}
                            step="0.5"
                            disabled={set.isCompleted}
                            onChange={(e) => {
                              const newStates = { ...setStates };
                              newStates[exercise.name][setIndex].rpe = Number(e.target.value);
                              setSetStates(newStates);
                            }}
                            className="w-12 bg-transparent text-2xl font-bold focus:outline-none disabled:text-[#86868B] text-right"
                          />
                          <span className="text-xs text-[#86868B] font-semibold pb-1.5">RPE</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleCompleteSet(exercise.name, setIndex)}
                      disabled={set.isCompleted}
                      className="focus:outline-none transition-transform active:scale-90"
                    >
                      <AnimatePresence mode="wait">
                        {set.isCompleted ? (
                          <motion.div key="checked" initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#0071E3]">
                            <CheckCircle2 className="w-8 h-8 fill-blue-50" />
                          </motion.div>
                        ) : (
                          <motion.div key="unchecked" className="text-[#C7C7CC] hover:text-[#0071E3]">
                            <Circle className="w-8 h-8" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </main>
    </div>
  );
}