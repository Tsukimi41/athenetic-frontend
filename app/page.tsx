'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Activity, Loader2, Flame } from 'lucide-react';

type Exercise = { id: string; name: string; target_sets: number; target_reps: number; history: string; };
type WorkoutData = { date: string; title: string; readiness_score: number; exercises: Exercise[]; };
type SetState = { reps: number; rpe: number; isCompleted: boolean; };
type ExerciseState = { [exerciseName: string]: SetState[] };
// 新たに追加：ボリュームデータの型
type VolumeData = { Chest: number; Back: number; Legs: number; };
// 🍎 進化版：上限突破＆ダイナミック・ボリューム・リング
const VolumeRing = ({ label, currentSets, targetSets, colorClass, strokeColor }: { label: string, currentSets: number, targetSets: number, colorClass: string, strokeColor: string }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  // 進捗率（100%を超えることも許容して計算）
  const rawPercent = (currentSets / targetSets) * 100;
  const displayPercent = Math.min(rawPercent, 100);
  const strokeDashoffset = circumference - (displayPercent / 100) * circumference;

  // 100%を超えたら（オーバーボリューム）、リングを少し太くし、シャドウで光らせる演出
  const isOverVolume = currentSets >= targetSets;
  const dynamicStrokeWidth = isOverVolume ? "10" : "8";
  const glowStyle = isOverVolume ? { filter: `drop-shadow(0 0 6px ${strokeColor}66)` } : {};

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        {/* 背景の薄いリング */}
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[#E5E5EA]" />
          
          {/* 進捗を示すカラフルなリング（値が変わるたびにアニメーションをトリガーさせるために key を設定） */}
          <motion.circle
            key={currentSets} // ★ここが重要：値が変わるたびに再アニメーションを強制！
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
        
        {/* 中央の数値（値が増えるたびにポンッと弾けるアニメーションを追加） */}
        <div className="absolute flex flex-col items-center justify-center">
          <motion.span 
            key={`num-${currentSets}`} // 数値が変わるたびにアニメーション
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className={`text-xl font-bold tracking-tight ${isOverVolume ? colorClass : ''}`} // 上限を超えたら数字も色付け
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
  // 新たに追加：ボリュームデータのステート
  const [volume, setVolume] = useState<VolumeData>({ Chest: 0, Back: 0, Legs: 0 });
  const [loading, setLoading] = useState(true);
  const [setStates, setSetStates] = useState<ExerciseState>({});

  // ★変更点：本日のメニューと、週間ボリューム集計を「同時」に取得する
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8080/api/v1/workouts/today', {cache: 'no-store'}).then(res => res.json()),
      fetch('http://localhost:8080/api/v1/analytics/volume', {cache: 'no-store'}).then(res => res.json())
    ]).then(([workoutData, volumeData]) => {
      setWorkout(workoutData);
      setVolume(volumeData); // DBから来た本物の集計データをセット！
      
      const initialStates: ExerciseState = {};
      workoutData.exercises.forEach((ex: Exercise) => {
        initialStates[ex.name] = Array(ex.target_sets).fill(null).map(() => ({
          reps: ex.target_reps || 10, rpe: 9, isCompleted: false
        }));
      });
      setSetStates(initialStates);
      setLoading(false);
    });
  }, []);

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
      });
      if (!response.ok) throw new Error('保存失敗');
      
      // ★追加：セット完了後、ボリュームを再取得してリングを動かす
      const volumeRes = await fetch('http://localhost:8080/api/v1/analytics/volume', {cache: 'no-store'});
      const updatedVolume = await volumeRes.json();
      setVolume(updatedVolume);

    } catch (error) {
      newStates[exerciseName][setIndex].isCompleted = false;
      setSetStates({ ...newStates });
    }
  };

  if (loading || !workout) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#86868B]" /></div>
  );

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
            <div className="flex items-center space-x-1 text-[#34C759]">
              <Activity className="w-5 h-5" />
              <span className="text-2xl font-bold">{workout.readiness_score}%</span>
            </div>
          </div>
        </header>

        <section className="bg-white rounded-[32px] p-8 mb-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center space-x-2 mb-6">
            <Flame className="w-5 h-5 text-[#FF3B30]" />
            <h2 className="text-lg font-bold tracking-tight">Weekly Hypertrophy Volume</h2>
          </div>
          {/* ★変更点：stateに保存された本物のデータを流し込む */}
          <div className="flex justify-between items-center px-2">
            <VolumeRing label="Chest" currentSets={volume.Chest || 0} targetSets={10} colorClass="text-[#FF3B30]" strokeColor="#FF3B30" />
            <VolumeRing label="Back" currentSets={volume.Back || 0} targetSets={10} colorClass="text-[#0071E3]" strokeColor="#0071E3" />
            <VolumeRing label="Legs" currentSets={volume.Legs || 0} targetSets={10} colorClass="text-[#34C759]" strokeColor="#34C759" />
          </div>
        </section>

        {/* ワークアウト記録エリア（変更なし） */}
        <div className="space-y-6">
          {workout.exercises.map((exercise, exIndex) => (
            <motion.article 
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: exIndex * 0.1 }}
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
                            type="number" value={set.reps} disabled={set.isCompleted}
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
                            type="number" value={set.rpe} step="0.5" disabled={set.isCompleted}
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
                      onClick={() => handleCompleteSet(exercise.name, setIndex)} disabled={set.isCompleted}
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