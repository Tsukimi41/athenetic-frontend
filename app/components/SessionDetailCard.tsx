'use client';

interface SessionDetailCardProps {
  session: any;
  bodyWeight: number | null;
}

export function SessionDetailCard({ session, bodyWeight }: SessionDetailCardProps) {
  const sets = Array.isArray(session?.sets) ? session.sets : [];
  const totalSets = sets.length;
  const totalVolume = sets.reduce((sum: number, set: any) => {
    const weight = set.weight_kg && set.weight_kg > 0 ? set.weight_kg : bodyWeight || 0;
    return sum + weight * (set.reps_completed || 0);
  }, 0);
  const avgRpe = totalSets > 0
    ? sets.reduce((sum: number, set: any) => sum + (set.rpe || 0), 0) / totalSets
    : 0;

  const exerciseMap = new Map<string, any[]>();
  sets.forEach((set: any) => {
    const name = set.exercise?.name || 'Exercise';
    if (!exerciseMap.has(name)) {
      exerciseMap.set(name, []);
    }
    exerciseMap.get(name)?.push(set);
  });

  return (
    <article className="bg-white rounded-[28px] p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[#86868B] font-semibold uppercase">{session.muscle_group || 'Session'}</p>
          <p className="text-sm text-[#86868B]">Readiness {session.readiness_score ?? '-'}</p>
        </div>
        <span className="text-xs text-[#86868B]">{session.session_date}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#F2F2F7] rounded-2xl p-3">
          <p className="text-[10px] text-[#86868B] font-semibold uppercase">Total Volume</p>
          <p className="text-lg font-bold">{Math.round(totalVolume)}</p>
        </div>
        <div className="bg-[#F2F2F7] rounded-2xl p-3">
          <p className="text-[10px] text-[#86868B] font-semibold uppercase">Avg RPE</p>
          <p className="text-lg font-bold">{avgRpe ? avgRpe.toFixed(1) : '-'}</p>
        </div>
        <div className="bg-[#F2F2F7] rounded-2xl p-3">
          <p className="text-[10px] text-[#86868B] font-semibold uppercase">Total Sets</p>
          <p className="text-lg font-bold">{totalSets}</p>
        </div>
      </div>

      <div className="space-y-4">
        {[...exerciseMap.entries()].map(([name, exerciseSets]) => (
          <div key={name} className="border border-[#E5E5EA] rounded-2xl p-4">
            <h3 className="text-base font-semibold text-[#1D1D1F] mb-3">{name}</h3>
            <div className="space-y-2">
              {exerciseSets.map((set: any) => {
                const weight = set.weight_kg && set.weight_kg > 0 ? `${set.weight_kg}kg` : 'BW';
                const target = set.target_reps || '-';
                return (
                  <div key={set.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#1D1D1F] font-semibold">{weight} x {set.reps_completed}</span>
                    <span className="text-[#86868B]">Plan {target} | RPE {set.rpe ?? '-'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
