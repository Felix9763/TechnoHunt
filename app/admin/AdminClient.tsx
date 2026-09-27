'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TeamProgressInfo {
  current_stage: string;
  last_updated: string;
}

interface Attempt {
  id: number;
  round: string;
  team_code: string;
  stage: string;
  submitted_answer: string;
  correct: boolean;
  created_at: string;
}

interface FinaleSubmission {
  round: string;
  team_code: string;
  position: number | null;
  submitted_at: string;
}

interface AdminClientProps {
  initialData: {
    activeRound: string;
    round1: { isReady: boolean; teamCount: number; stageCount: number; reason?: string };
    round2: { isReady: boolean; teamCount: number; stageCount: number; reason?: string };
    teams: Array<{ code: string; pin: string; track: string }>;
    progress: Record<string, TeamProgressInfo>;
    attempts: Attempt[];
    finale: FinaleSubmission[];
    settings: any;
  };
}

const STAGE_LABELS: Record<string, string> = {
  clue2: 'Clue 2',
  crewmate: 'Witness',
  clue3: 'Clue 3',
  clue4: 'Clue 4',
  final: 'Finale (Empty Stage)',
};

export default function AdminClient({ initialData }: AdminClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Manual Override Form State
  const [overrideTeam, setOverrideTeam] = useState('');
  const [overrideStage, setOverrideStage] = useState('clue2');
  const [overriding, setOverriding] = useState(false);

  // Finale Form State
  const [finaleTeam, setFinaleTeam] = useState('');
  const [submittingFinale, setSubmittingFinale] = useState(false);

  // Filter state for roster
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-refresh interval (5s)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/data');
        if (res.ok) {
          const fresh = await res.json();
          setData(fresh);
        }
      } catch (e) {
        // silent background poll fail
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function refreshData() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data');
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchRound(targetRound: 'round1' | 'round2') {
    if (targetRound === data.activeRound) return;
    setActionMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: targetRound }),
      });
      const resData = await res.json();

      if (!res.ok) {
        setActionMsg({ text: resData.error || 'Failed to switch round', error: true });
      } else {
        setActionMsg({ text: `Switched active round to ${targetRound}.` });
        await refreshData();
      }
    } catch (e) {
      setActionMsg({ text: 'Error switching round.', error: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleManualOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideTeam || overriding) return;

    setOverriding(true);
    setActionMsg(null);

    try {
      const res = await fetch('/api/admin/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamCode: overrideTeam, stage: overrideStage }),
      });
      const resData = await res.json();

      if (!res.ok) {
        setActionMsg({ text: resData.error || 'Override failed', error: true });
      } else {
        setActionMsg({ text: `Team ${overrideTeam} stage set to ${STAGE_LABELS[overrideStage] || overrideStage}.` });
        await refreshData();
      }
    } catch (e) {
      setActionMsg({ text: 'Error sending override.', error: true });
    } finally {
      setOverriding(false);
    }
  }

  async function handleMarkFinale(teamCodeToMark?: string) {
    const target = teamCodeToMark || finaleTeam;
    if (!target || submittingFinale) return;

    setSubmittingFinale(true);
    setActionMsg(null);

    try {
      const res = await fetch('/api/admin/finale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamCode: target }),
      });
      const resData = await res.json();

      if (!res.ok) {
        setActionMsg({ text: resData.error || 'Finale marking failed', error: true });
      } else {
        const posText = resData.position ? `Position: #${resData.position}` : 'Finished';
        setActionMsg({ text: `Team ${target} key submitted! ${posText}` });
        if (!teamCodeToMark) setFinaleTeam('');
        await refreshData();
      }
    } catch (e) {
      setActionMsg({ text: 'Error marking key submission.', error: true });
    } finally {
      setSubmittingFinale(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  const filteredTeams = data.teams.filter((t) => {
    if (trackFilter !== 'ALL' && t.track !== trackFilter) return false;
    if (searchTerm && !t.code.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-paper text-ink font-mono p-4 md:p-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <header className="border-b-2 border-ink pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs text-ink-soft tracking-wider">TECHNOHUNT // EVENT CONTROL ROOM</div>
          <h1 className="font-display text-2xl md:text-3xl text-ink">Organizer Admin Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            disabled={loading}
            className="text-xs bg-paper border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleLogout}
            className="text-xs bg-ink text-paper px-3 py-1.5 hover:bg-ink-soft transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Action Notice */}
      {actionMsg && (
        <div
          className={`mb-6 p-3 text-xs font-semibold border-l-4 ${
            actionMsg.error
              ? 'bg-evidence-red/10 border-evidence-red text-evidence-red'
              : 'bg-verified-teal/10 border-verified-teal text-verified-teal'
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {/* ROUND SWITCHER (Prominent, top of page) */}
      <section className="border-2 border-ink p-5 bg-paper mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs text-ink-soft block uppercase tracking-wider">
              Runtime Round Configuration
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-lg font-bold">
                ACTIVE ROUND:
              </span>
              <span className="bg-ink text-paper px-2.5 py-0.5 text-base font-bold uppercase">
                {data.activeRound}
              </span>
            </div>
            <p className="text-xs text-ink-soft mt-1">
              Switching rounds immediately updates team sessions on their next request. Zero redeploy needed.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Round 1 Switch Button */}
            <div className="relative group flex-1 md:flex-none">
              <button
                id="switch-round1-button"
                onClick={() => handleSwitchRound('round1')}
                disabled={!data.round1.isReady || data.activeRound === 'round1' || loading}
                className={`w-full md:w-auto px-4 py-2 text-xs uppercase font-bold border-2 transition-colors ${
                  data.activeRound === 'round1'
                    ? 'bg-verified-teal text-paper border-verified-teal'
                    : data.round1.isReady
                    ? 'border-ink hover:bg-ink hover:text-paper'
                    : 'border-line text-ink-soft/50 bg-paper cursor-not-allowed'
                }`}
              >
                {data.activeRound === 'round1' ? '● Round 1 Live' : 'Switch to Round 1'}
              </button>
              {!data.round1.isReady && (
                <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-10 w-48 p-2 bg-ink text-paper text-[10px] shadow">
                  {data.round1.reason || 'Round 1 config not loaded yet'}
                </div>
              )}
            </div>

            {/* Round 2 Switch Button */}
            <div className="relative group flex-1 md:flex-none">
              <button
                id="switch-round2-button"
                onClick={() => handleSwitchRound('round2')}
                disabled={!data.round2.isReady || data.activeRound === 'round2' || loading}
                className={`w-full md:w-auto px-4 py-2 text-xs uppercase font-bold border-2 transition-colors ${
                  data.activeRound === 'round2'
                    ? 'bg-verified-teal text-paper border-verified-teal'
                    : data.round2.isReady
                    ? 'border-ink hover:bg-ink hover:text-paper'
                    : 'border-line text-ink-soft/50 bg-paper cursor-not-allowed'
                }`}
              >
                {data.activeRound === 'round2' ? '● Round 2 Live' : 'Switch to Round 2'}
              </button>
              {!data.round2.isReady && (
                <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-10 w-48 p-2 bg-ink text-paper text-[10px] shadow">
                  {data.round2.reason || 'Round 2 config not loaded yet'}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Grid: Finale Board + Manual Override */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Finale Board */}
        <section className="border border-line p-4 bg-paper">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-line">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
              Finale Board // Physical Keys
            </h2>
            <span className="text-xs text-ink-soft">
              {data.finale.length} verified
            </span>
          </div>

          <div className="flex gap-2 mb-4">
            <select
              value={finaleTeam}
              onChange={(e) => setFinaleTeam(e.target.value)}
              className="bg-paper border border-line px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-ink flex-1"
            >
              <option value="">Select team to mark key...</option>
              {data.teams.map((t) => (
                <option key={t.code} value={t.code}>
                  Team {t.code} (Track {t.track})
                </option>
              ))}
            </select>
            <button
              onClick={() => handleMarkFinale()}
              disabled={!finaleTeam || submittingFinale}
              className="bg-verified-teal text-paper px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              Mark Key
            </button>
          </div>

          <div className="space-y-1.5">
            {data.finale.length === 0 ? (
              <div className="text-xs text-ink-soft py-4 text-center border border-dashed border-line">
                No physical keys submitted yet for {data.activeRound}.
              </div>
            ) : (
              data.finale.map((sub, idx) => (
                <div
                  key={sub.team_code}
                  className="flex items-center justify-between p-2 border border-line bg-paper/60 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold px-1.5 py-0.5 text-[10px] ${
                        sub.position === 1
                          ? 'bg-lockout-amber text-paper'
                          : sub.position === 2
                          ? 'bg-ink-soft text-paper'
                          : sub.position === 3
                          ? 'bg-evidence-red text-paper'
                          : 'bg-line text-ink'
                      }`}
                    >
                      {sub.position ? `#${sub.position}` : `#${idx + 1}`}
                    </span>
                    <span className="font-bold">Team {sub.team_code}</span>
                  </div>
                  <span className="text-[11px] text-ink-soft">
                    {new Date(sub.submitted_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Manual Override */}
        <section className="border border-line p-4 bg-paper">
          <div className="mb-3 pb-2 border-b border-line">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
              Manual Override // Stage Advance
            </h2>
          </div>

          <form onSubmit={handleManualOverride} className="space-y-3">
            <div>
              <label className="block text-[11px] text-ink-soft uppercase mb-1">
                Target Team
              </label>
              <select
                value={overrideTeam}
                onChange={(e) => setOverrideTeam(e.target.value)}
                className="w-full bg-paper border border-line px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-ink"
                required
              >
                <option value="">Select team...</option>
                {data.teams.map((t) => (
                  <option key={t.code} value={t.code}>
                    Team {t.code} (Track {t.track}) — Current: {STAGE_LABELS[data.progress[t.code]?.current_stage || 'clue2'] || 'Clue 2'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-ink-soft uppercase mb-1">
                Target Stage
              </label>
              <select
                value={overrideStage}
                onChange={(e) => setOverrideStage(e.target.value)}
                className="w-full bg-paper border border-line px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-ink"
              >
                <option value="clue2">Clue 2</option>
                <option value="crewmate">Witness</option>
                <option value="clue3">Clue 3</option>
                <option value="clue4">Clue 4</option>
                <option value="final">Final (Empty Stage)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!overrideTeam || overriding}
              className="w-full bg-ink text-paper py-2 text-xs uppercase font-semibold hover:bg-ink-soft disabled:opacity-50 transition-colors"
            >
              {overriding ? 'Updating...' : 'Apply Stage Override'}
            </button>
          </form>
        </section>
      </div>

      {/* Live Roster Table */}
      <section className="border border-line p-4 bg-paper mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 pb-2 border-b border-line">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
              Live Roster Table ({data.activeRound.toUpperCase()})
            </h2>
            <div className="text-xs text-ink-soft">
              {filteredTeams.length} of {data.teams.length} teams shown
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-paper border border-line px-2.5 py-1 text-xs text-ink w-32 focus:outline-none focus:border-ink"
            />
            <div className="flex border border-line text-xs">
              {(['ALL', 'A', 'B'] as const).map((tr) => (
                <button
                  key={tr}
                  onClick={() => setTrackFilter(tr)}
                  className={`px-2.5 py-1 ${
                    trackFilter === tr
                      ? 'bg-ink text-paper font-bold'
                      : 'hover:bg-line/50 text-ink'
                  }`}
                >
                  {tr}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line text-ink-soft bg-paper">
                <th className="py-2 px-2 font-semibold">TEAM</th>
                <th className="py-2 px-2 font-semibold">TRACK</th>
                <th className="py-2 px-2 font-semibold">CURRENT STAGE</th>
                <th className="py-2 px-2 font-semibold">LAST ACTIVITY</th>
                <th className="py-2 px-2 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-ink-soft">
                    No teams found matching filter.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((t) => {
                  const p = data.progress[t.code];
                  const stage = p?.current_stage || 'clue2';
                  const isFinished = stage === 'final';
                  const keyDone = data.finale.some((f) => f.team_code === t.code);

                  return (
                    <tr
                      key={t.code}
                      className="border-b border-line/50 hover:bg-line/20 transition-colors"
                    >
                      <td className="py-2.5 px-2 font-bold">{t.code}</td>
                      <td className="py-2.5 px-2">Track {t.track}</td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] ${
                            isFinished
                              ? 'bg-verified-teal/20 text-verified-teal font-semibold'
                              : 'bg-line/40 text-ink'
                          }`}
                        >
                          {STAGE_LABELS[stage] || stage}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-ink-soft text-[11px]">
                        {p?.last_updated
                          ? new Date(p.last_updated).toLocaleTimeString()
                          : 'Not started'}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {keyDone ? (
                          <span className="text-[11px] text-verified-teal font-semibold">
                            ✓ Key Submitted
                          </span>
                        ) : isFinished ? (
                          <button
                            onClick={() => handleMarkFinale(t.code)}
                            className="bg-verified-teal text-paper text-[10px] px-2 py-1 font-semibold hover:opacity-90"
                          >
                            Mark Key
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setOverrideTeam(t.code);
                              const nextStageMap: Record<string, string> = {
                                clue2: 'crewmate',
                                crewmate: 'clue3',
                                clue3: 'clue4',
                                clue4: 'final',
                              };
                              setOverrideStage(nextStageMap[stage] || 'final');
                            }}
                            className="text-[11px] text-ink-soft hover:text-ink underline"
                          >
                            Override
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Attempt Log (Wrong-answer and attempt feed) */}
      <section className="border border-line p-4 bg-paper">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-line">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
            Attempt Log // Live Feed ({data.activeRound.toUpperCase()})
          </h2>
          <span className="text-xs text-ink-soft">
            {data.attempts.length} logged
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1">
          {data.attempts.length === 0 ? (
            <div className="text-xs text-ink-soft py-4 text-center border border-dashed border-line">
              No attempts recorded yet for {data.activeRound}.
            </div>
          ) : (
            data.attempts.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-2 border-b border-line/40 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold ${
                      att.correct
                        ? 'bg-verified-teal text-paper'
                        : 'bg-evidence-red text-paper'
                    }`}
                  >
                    {att.correct ? 'PASS' : 'FAIL'}
                  </span>
                  <span className="font-bold">{att.team_code}</span>
                  <span className="text-ink-soft">[{STAGE_LABELS[att.stage] || att.stage}]</span>
                  <span className="text-ink truncate max-w-xs md:max-w-md">
                    &ldquo;{att.submitted_answer}&rdquo;
                  </span>
                </div>
                <span className="text-[10px] text-ink-soft shrink-0">
                  {new Date(att.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
