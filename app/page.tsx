'use client'; // クライアントサイドでのデータフェッチと状態管理を有効化

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Activity, Loader2 } from 'lucide-react';

// Go言語から返ってくるデータの型定義
type Exercise = {
  id: string;
  name: string;
  target_sets: number;
  history: string;
};

type WorkoutData = {
  date: string;
  title: string;
  readiness_score: number;
  exercises: Exercise[];
};

export default function Home() {
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 画面が表示された瞬間にGoのAPIを叩く（疎通確認）
  useEffect(() => {
    fetch('http://localhost:8080/api/v1/workouts/today')
      .then((res) => {
        if (!res.ok) throw new Error('APIサーバーに接続できません');
        return res.json();
      })
      .then((data) => {
        setWorkout(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // ローディング中の画面（Apple風のシンプルなスピナー）
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#86868B]" />
        <p className="mt-4 text-[#86868B] font-medium tracking-wide">Loading Protocol...</p>
      </div>
    );
  }

  // エラー時の画面
  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm text-center">
          <p className="text-red-500 font-semibold mb-2">Connection Failed</p>
          <p className="text-[#86868B] text-sm">Goのサーバーが起動しているか確認してください。</p>
        </div>
      </div>
    );
  }

  // データ取得成功時のメインUI
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-blue-200">
      <main className="max-w-2xl mx-auto px-6 py-16">
        {/* ヘッダー */}
        <header className="mb-12 flex justify-between items-end">
          <div>
            <p className="text-sm font-semibold tracking-widest text-[#86868B] uppercase mb-1">
              {workout?.date}
            </p>
            <h1 className="text-4xl font-bold tracking-tight">{workout?.title}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#86868B] font-semibold uppercase tracking-wider mb-1">Readiness</p>
            <div className="flex items-center space-x-1 text-[#34C759]">
              <Activity className="w-5 h-5" />
              <span className="text-2xl font-bold">{workout?.readiness_score}%</span>
            </div>
          </div>
        </header>

        {/* APIから取得したメニューのリスト */}
        <div className="space-y-6">
          {workout?.exercises.map((exercise, index) => (
            <motion.article 
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-[24px] p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
            >
              <h2 className="text-2xl font-semibold tracking-tight mb-1">{exercise.name}</h2>
              <p className="text-sm text-[#86868B] mb-6">{exercise.history}</p>

              {/* セット数の表示（APIの target_sets の数だけチェックボックスを生成） */}
              <div className="space-y-3">
                {[...Array(exercise.target_sets)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-2xl">
                    <span className="text-sm font-medium text-[#86868B]">Set {i + 1}</span>
                    <button className="text-[#C7C7CC] hover:text-[#0071E3] transition-colors">
                      <Circle className="w-7 h-7" />
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