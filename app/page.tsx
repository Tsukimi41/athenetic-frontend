'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Activity, Loader2, Flame, Filter } from 'lucide-react';
import { ReadinessInput } from './components/ReadinessInput';

type Exercise = { id: string; name: string; target_sets: number; target_reps: number; history: string; };
type WorkoutData = { date: string; title: string; muscle_group: string; readiness_score: number; exercises: Exercise[]; };
type SetState = { reps: number; rpe: number; isCompleted: boolean; };
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
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [volume, setVolume] = useState<VolumeData>({ Chest: 0, Back: 0, Legs: 0 });
  const [loading, setLoading] = useState(true);
  const [setStates, setSetStates] = useState<ExerciseState>({});
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('chest');
  const [readinessData, setReadinessData] = useState<any>(null);
  const [showReadinessForm, setShowReadinessForm] = useState(false);

  const muscleGroups = [
    { id: 'chest', label: 'Chest (Push)', emoji: '🏋️' },
    { id: 'back', label: 'Back (Pull)', emoji: '🔄' },
    { id: 'legs', label: 'Legs', emoji: '🦵' },
  ];

  // Fetch workout and volume data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workoutRes, volumeRes] = await Promise.all([
          fetch(`http://localhost:8080/api/v1/workouts/today?muscle_group=${selectedMuscleGroup}`, {
            cache: 'no-store',
          }).then(res => res.json()),
          fetch('http://localhost:8080/api/v1/analytics/volume', {
            cache: 'no-store',
          }).then(res => res.json()),
        ]);

        setWorkout(workoutRes);
        setVolume(volumeRes);

        const initialStates: ExerciseState = {};
        workoutRes.exercises.forEach((ex: Exercise) => {
          initialStates[ex.name] = Array(ex.target_sets).fill(null).map(() => ({
            reps: ex.target_reps || 10,
            rpe: 7,
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
  }, [selectedMuscleGroup]);

  const handleCompleteSet = async (exerciseName: string, setIndex: number) => {
    const currentState = setStates[exerciseName][setIndex];
    if (currentState.isCompleted) return;

    const newStates = { ...setStates };
    newStates[exerciseName][setIndex].isCompleted = true;
    setSetStates(newStates);

    try {
      const response = await fetch('http://localhost:8080/api/v1/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_name: exerciseName,
          set_number: setIndex + 1,
          reps: currentState.reps,
          rpe: currentState.rpe,
        }),
        cache: 'no-store',
      });

      if (!response.ok) throw new Error('Save failed');

      // Refresh volume data
      const volumeRes = await fetch('http://localhost:8080/api/v1/analytics/volume', {
        cache: 'no-store',
      });
      const updatedVolume = await volumeRes.json();
      setVolume(updatedVolume);
    } catch (error) {
      newStates[exerciseName][setIndex].isCompleted = false;
      setSetStates({ ...newStates });
      console.error('Failed to save set:', error);
    }
  };

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
          <div className="grid grid-cols-3 gap-3">
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
            onSubmit={(data) => {
              setReadinessData(data);
              setShowReadinessForm(false);
            }}
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