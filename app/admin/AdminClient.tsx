'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

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

interface TeamRegistration {
  round: string;
  team_code: string;
  team_name: string;
  confirmed: boolean;
  checked_in_at: string;
  confirmed_at?: string;
}

interface AdminClientProps {
  initialData: {
    activeRound: string;
    round1: { isReady: boolean; teamCount: number; stageCount: number; reason?: string };
    round2: { isReady: boolean; teamCount: number; stageCount: number; reason?: string };
    teams: Array<{ code: string; pin: string; track: string }>;
    stages?: Record<string, any>;
    progress: Record<string, TeamProgressInfo>;
    registrations?: Record<string, TeamRegistration>;
    attempts: Attempt[];
    finale: FinaleSubmission[];
    settings: any;
  };
  initialTab?: 'ops' | 'paths';
}

const STAGE_LABELS: Record<string, string> = {
  clue2: 'Clue 2',
  crewmate: 'Witness',
  clue3: 'Clue 3',
  clue4: 'Clue 4',
  final: 'Finale (Empty Stage)',
};

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export default function AdminClient({ initialData, initialTab = 'ops' }: AdminClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<'ops' | 'paths'>(initialTab);
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
  const [trackFilter, setTrackFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Path Dossier state
  const [dossierTrackFilter, setDossierTrackFilter] = useState<string>('ALL');
  const [dossierSearch, setDossierSearch] = useState('');
  const [selectedDossierTeam, setSelectedDossierTeam] = useState<string>('A1');
  const [dossierViewMode, setDossierViewMode] = useState<'cards' | 'table'>('cards');
  const [copiedTeam, setCopiedTeam] = useState<string | null>(null);
  const [tableExpandAll, setTableExpandAll] = useState(false);
  const [adminPhotoModal, setAdminPhotoModal] = useState<{ url: string; name: string } | null>(null);

  const uniqueTracks = Array.from(new Set(data.teams.map((t) => t.track))).filter(Boolean).sort();

  // Team registration / name assignment state
  const [registeringTeam, setRegisteringTeam] = useState<string>('');
  const [registeringName, setRegisteringName] = useState<string>('');
  const [submittingReg, setSubmittingReg] = useState(false);
  const [pendingNameInputs, setPendingNameInputs] = useState<Record<string, string>>({});
  const [editingTeamCode, setEditingTeamCode] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');

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
        setActionMsg({ text: `Switched active round to ${targetRound.toUpperCase()}.` });
        await refreshData();
      }
    } catch (e) {
      setActionMsg({ text: 'Error contacting server to switch round.', error: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideTeam || !overrideStage || overriding) return;

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
        setActionMsg({ text: `Team ${overrideTeam} moved to ${STAGE_LABELS[overrideStage]}.` });
        await refreshData();
      }
    } catch (e) {
      setActionMsg({ text: 'Network error during override.', error: true });
    } finally {
      setOverriding(false);
    }
  }

  async function handleFinaleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!finaleTeam || submittingFinale) return;

    setSubmittingFinale(true);
    setActionMsg(null);

    try {
      const res = await fetch('/api/admin/finale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamCode: finaleTeam }),
      });
      const resData = await res.json();

      if (!res.ok) {
        setActionMsg({ text: resData.error || 'Finale verification failed', error: true });
      } else {
        const posText = resData.position ? `Position: #${resData.position} Place` : 'Finished!';
        setActionMsg({ text: `Recorded key hand-off for ${finaleTeam}. ${posText}` });
        setFinaleTeam('');
        await refreshData();
      }
    } catch (e) {
      setActionMsg({ text: 'Error recording finale verification.', error: true });
    } finally {
      setSubmittingFinale(false);
    }
  }

  async function handleConfirmTeam(teamCode: string, nameToAssign?: string) {
    const finalName = (nameToAssign !== undefined ? nameToAssign : (pendingNameInputs[teamCode] || '')).trim();
    if (!finalName) {
      alert('Please enter a team name to assign.');
      return;
    }

    setSubmittingReg(true);
    setActionMsg(null);

    try {
      const res = await fetch('/api/admin/confirm-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamCode, teamName: finalName }),
      });
      const resData = await res.json();

      if (!res.ok) {
        setActionMsg({ text: resData.error || 'Failed to assign team name.', error: true });
      } else {
        setActionMsg({ text: `✓ Team ${teamCode} registered as "${finalName}" and clearance granted!` });
        setPendingNameInputs((prev) => {
          const next = { ...prev };
          delete next[teamCode];
          return next;
        });
        setEditingTeamCode(null);
        setRegisteringTeam('');
        setRegisteringName('');
        await refreshData();
      }
    } catch (e) {
      setActionMsg({ text: 'Error contacting server to assign team name.', error: true });
    } finally {
      setSubmittingReg(false);
    }
  }

  async function handleResetRound() {
    const confirmed = window.confirm(
      `WARNING: This will clear all team progress, attempt logs, and finale submissions for ${data.activeRound.toUpperCase()}.\n\nAre you sure you want to reset all test data?`
    );
    if (!confirmed) return;

    setLoading(true);
    setActionMsg(null);

    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      const resData = await res.json();

      if (!res.ok) {
        setActionMsg({ text: resData.error || 'Reset failed', error: true });
      } else {
        setActionMsg({ text: `Reset complete for ${data.activeRound.toUpperCase()}. All teams are back to initial stage.` });
        await refreshData();
      }
    } catch (e) {
      setActionMsg({ text: 'Error during reset.', error: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  function copyTeamPathSummary(t: { code: string; pin: string; track: string }, s: any) {
    if (!s) return;
    const text = `=== TECHNOHUNT CASE PATH // TEAM ${t.code} (TRACK ${t.track}) ===
PIN: ${t.pin}

[STAGE 1] CLUE 2 (Physical Codeword):
- Location Zone: ${s.clue2?.zone || 'N/A'}
- Riddle: "${s.clue2?.riddle || ''}"
- Expected Codeword: ${s.clue2?.codeword || 'N/A'}

[STAGE 2] WITNESS CONTACT (Crewmate):
- Witness Name: ${s.crewmate?.name || 'N/A'} (${s.crewmate?.id || 'CREW'})
- Photo Path: ${s.crewmate?.photo || 'N/A'}
- Witness Dialogue Script: "${s.crewmate?.script || ''}"
- Physical Scrambled Code: ${s.crewmate?.code || 'N/A'}

[STAGE 3] CLUE 3 (Online Cipher):
- Cipher Type: ${s.clue3?.cipherType || 'N/A'}
- Intercept: ${s.clue3?.intercept || 'N/A'}
- Decryption Hint: "${s.clue3?.hint || 'N/A'}"
- Decrypted Answer: ${s.clue3?.answer || 'N/A'}
- Next Destination Sector: ${s.clue3?.nextZone || s.clue4?.zone || 'N/A'}
- Next Destination Riddle: "${s.clue3?.nextRiddle || ''}"

[STAGE 4] CLUE 4 (Physical Evidence):
- Target Sector: ${s.clue4?.zone || 'N/A'}
- Physical Puzzle Answer: ${s.clue4?.answer || 'N/A'}

[STAGE 5] FINALE (Resolution):
- Target: Empty Stage (3 hidden keys backstage for 1st, 2nd, 3rd)`;

    navigator.clipboard.writeText(text);
    setCopiedTeam(t.code);
    setTimeout(() => setCopiedTeam(null), 2500);
  }

  function copyAllPathsMaster() {
    const lines = [
      `# TECHNOHUNT // MASTER CHEAT SHEET (ROUND: ${data.activeRound.toUpperCase()})`,
      `Generated: ${new Date().toLocaleString()}`,
      `Total Teams: ${data.teams.length}`,
      '=====================================================\n',
    ];

    data.teams.forEach((t) => {
      const s = stagesData[t.code] || {};
      lines.push(
        `=====================================================`,
        `TEAM ${t.code} (TRACK ${t.track}) | PIN: ${t.pin}`,
        `1. CLUE 2: Zone: [${s.clue2?.zone || 'N/A'}] | Codeword: [${s.clue2?.codeword || 'N/A'}]`,
        `   Riddle: "${s.clue2?.riddle || ''}"`,
        `2. WITNESS: ${s.crewmate?.name || 'N/A'} (${s.crewmate?.id || ''}) | Code: [${s.crewmate?.code || 'N/A'}]`,
        `   Script: "${s.crewmate?.script || ''}"`,
        `3. CLUE 3: Cipher: [${s.clue3?.cipherType || 'Cipher'}] | Intercept: [${s.clue3?.intercept || 'N/A'}]`,
        `   HINT: "${s.clue3?.hint || 'N/A'}"`,
        `   Answer: [${s.clue3?.answer || 'N/A'}]`,
        `   Next Riddle: "${s.clue3?.nextRiddle || ''}"`,
        `4. CLUE 4: Sector: [${s.clue4?.zone || 'N/A'}] | Answer: [${s.clue4?.answer || 'N/A'}]`,
        `5. FINALE: Empty Stage (3 keys backstage)\n`
      );
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedTeam('ALL');
    setTimeout(() => setCopiedTeam(null), 2500);
  }

  const filteredTeams = data.teams.filter((t) => {
    if (trackFilter !== 'ALL' && t.track !== trackFilter) return false;
    if (searchTerm && !t.code.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const stagesData = data.stages || {};

  const dossierFilteredTeams = data.teams.filter((t) => {
    if (dossierTrackFilter !== 'ALL' && t.track !== dossierTrackFilter) return false;
    if (!dossierSearch) return true;
    const q = dossierSearch.toLowerCase();
    const s = stagesData[t.code] || {};
    return (
      t.code.toLowerCase().includes(q) ||
      t.pin.toLowerCase().includes(q) ||
      (s.clue2?.zone && s.clue2.zone.toLowerCase().includes(q)) ||
      (s.clue2?.codeword && s.clue2.codeword.toLowerCase().includes(q)) ||
      (s.clue2?.riddle && s.clue2.riddle.toLowerCase().includes(q)) ||
      (s.crewmate?.name && s.crewmate.name.toLowerCase().includes(q)) ||
      (s.crewmate?.id && s.crewmate.id.toLowerCase().includes(q)) ||
      (s.crewmate?.script && s.crewmate.script.toLowerCase().includes(q)) ||
      (s.crewmate?.code && s.crewmate.code.toLowerCase().includes(q)) ||
      (s.clue3?.cipherType && s.clue3.cipherType.toLowerCase().includes(q)) ||
      (s.clue3?.intercept && s.clue3.intercept.toLowerCase().includes(q)) ||
      (s.clue3?.hint && s.clue3.hint.toLowerCase().includes(q)) ||
      (s.clue3?.answer && s.clue3.answer.toLowerCase().includes(q)) ||
      (s.clue3?.nextZone && s.clue3.nextZone.toLowerCase().includes(q)) ||
      (s.clue3?.nextRiddle && s.clue3.nextRiddle.toLowerCase().includes(q)) ||
      (s.clue4?.zone && s.clue4.zone.toLowerCase().includes(q)) ||
      (s.clue4?.answer && s.clue4.answer.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-paper text-ink font-mono p-4 md:p-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <header className="border-b-2 border-ink pb-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs text-ink-soft tracking-wider">TECHNOHUNT // EVENT CONTROL ROOM</div>
          <h1 className="font-display text-2xl md:text-3xl text-ink">Organizer Admin Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={refreshData}
            disabled={loading}
            className="text-xs font-bold bg-paper-card border-2 border-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleResetRound}
            disabled={loading}
            className="text-xs font-bold bg-paper-card border-2 border-evidence-red text-evidence-red px-3 py-1.5 hover:bg-evidence-red hover:text-paper transition-colors disabled:opacity-50 shadow-sm"
          >
            Reset Test Data
          </button>
          <button
            onClick={handleLogout}
            className="text-xs font-bold bg-ink text-paper px-3 py-1.5 hover:bg-ink-soft active:scale-95 transition-all shadow-sm"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-3 mb-6 border-b-2 border-line pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('ops')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-colors flex items-center gap-2 ${
            activeTab === 'ops'
              ? 'bg-ink text-paper shadow'
              : 'bg-paper text-ink border border-line hover:border-ink'
          }`}
        >
          <span>📊 Live Operations</span>
          <span className="text-[10px] opacity-75 font-normal">
            ({Object.keys(data.progress).length} Active)
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paths')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-colors flex items-center gap-2 ${
            activeTab === 'paths'
              ? 'bg-ink text-paper shadow'
              : 'bg-paper text-ink border border-line hover:border-ink'
          }`}
        >
          <span>🗺️ Master Team Paths & Dossier</span>
          <span className="bg-verified-teal/20 text-verified-teal text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
            {data.teams.length} Teams
          </span>
        </button>
      </nav>

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

      {/* TAB 1: LIVE OPERATIONS */}
      {activeTab === 'ops' && (
        <div className="space-y-8">
          {/* ROUND SWITCHER (Prominent, top of page) */}
          <section className="border-2 border-ink p-5 bg-paper-card shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-xs text-evidence-red font-bold block uppercase tracking-wider">
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

          {/* REGISTRATION DESK & TEAM NAME ASSIGNMENT MODULE */}
          {(() => {
            const regs = data.registrations || {};
            const waitingTeams = data.teams.filter((t) => regs[t.code] && !regs[t.code].confirmed);
            const confirmedCount = data.teams.filter((t) => regs[t.code]?.confirmed).length;

            return (
              <section className="border-2 border-ink p-5 bg-paper-card shadow-md space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-line">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-evidence-red font-bold uppercase tracking-wider">
                        REGISTRATION DESK DISPATCH
                      </span>
                      {waitingTeams.length > 0 && (
                        <span className="bg-evidence-red text-paper text-[10px] font-mono px-2 py-0.5 font-bold animate-pulse">
                          {waitingTeams.length} PENDING CLEARANCE
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-xl text-ink mt-0.5">
                      Desk Check-In & Team Name Assignment
                    </h2>
                  </div>
                  <div className="text-xs font-mono text-ink-soft">
                    <span className="font-bold text-ink">{confirmedCount}</span> of {data.teams.length} Teams Cleared
                  </div>
                </div>

                {/* WAITING QUEUE (Teams that entered their PIN and are standing at the desk) */}
                {waitingTeams.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-xs font-mono text-evidence-red font-bold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-lockout-amber animate-pulse" />
                      <span>TEAMS CURRENTLY STANDING AT DESK AWAITING TEAM NAME:</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {waitingTeams.map((t) => {
                        const reg = regs[t.code];
                        return (
                          <div
                            key={t.code}
                            className="border-2 border-evidence-red bg-paper p-3 shadow-sm space-y-2"
                          >
                            <div className="flex justify-between items-center text-xs font-mono">
                              <span className="font-bold text-sm text-ink">
                                Unit {t.code} (Track {t.track})
                              </span>
                              <span className="text-ink-soft text-[10px]" suppressHydrationWarning>
                                Checked in: {reg ? formatTime(reg.checked_in_at) : 'Just now'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Enter chosen team name..."
                                value={pendingNameInputs[t.code] || ''}
                                onChange={(e) =>
                                  setPendingNameInputs({
                                    ...pendingNameInputs,
                                    [t.code]: e.target.value,
                                  })
                                }
                                className="flex-1 bg-paper-card border border-ink px-2.5 py-1.5 text-xs font-mono font-bold text-ink placeholder:text-ink/35 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleConfirmTeam(t.code)}
                                disabled={submittingReg || !(pendingNameInputs[t.code] || '').trim()}
                                className="bg-ink text-paper px-3 py-1.5 text-xs font-mono font-bold uppercase hover:bg-ink-mid transition-colors disabled:opacity-40"
                              >
                                {submittingReg ? '...' : 'Approve & Launch'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-paper border border-line-light text-xs font-mono text-ink-mid flex items-center justify-between">
                    <span>✓ No teams currently waiting at desk. All logged-in units have been assigned team names.</span>
                  </div>
                )}

                {/* MANUAL QUICK-ASSIGN FORM (Pre-assign or rename any team) */}
                <div className="pt-2 border-t border-line-light">
                  <span className="text-[11px] font-mono text-ink-soft font-bold block mb-1.5 uppercase">
                    QUICK-ASSIGN / PRE-REGISTER ANY UNIT:
                  </span>
                  <div className="flex flex-col md:flex-row gap-2">
                    <select
                      value={registeringTeam}
                      onChange={(e) => {
                        const code = e.target.value;
                        setRegisteringTeam(code);
                        if (code && regs[code]?.team_name) {
                          setRegisteringName(regs[code].team_name);
                        } else {
                          setRegisteringName('');
                        }
                      }}
                      className="bg-paper border border-ink p-2 text-xs font-mono font-bold"
                    >
                      <option value="">-- Select Team Code --</option>
                      {data.teams.map((t) => {
                        const reg = regs[t.code];
                        const label = reg?.confirmed
                          ? `${t.code} (${t.track}) — "${reg.team_name}"`
                          : reg
                          ? `${t.code} (${t.track}) — [WAITING CLEARANCE]`
                          : `${t.code} (${t.track}) — [Not checked in]`;
                        return (
                          <option key={t.code} value={t.code}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="text"
                      placeholder="Team Name (e.g. Baker Street Boys)..."
                      value={registeringName}
                      onChange={(e) => setRegisteringName(e.target.value)}
                      className="flex-1 bg-paper border border-ink p-2 text-xs font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (registeringTeam) {
                          handleConfirmTeam(registeringTeam, registeringName);
                        }
                      }}
                      disabled={submittingReg || !registeringTeam || !registeringName.trim()}
                      className="bg-ink text-paper px-4 py-2 text-xs font-mono font-bold uppercase hover:bg-ink-mid transition-colors disabled:opacity-40"
                    >
                      {submittingReg ? 'Saving...' : 'Assign & Activate'}
                    </button>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* LIVE ROSTER TABLE */}
          <section className="border-2 border-ink p-5 bg-paper">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 pb-3 border-b border-line">
              <div>
                <h2 className="font-display text-xl text-ink">Active Teams ({filteredTeams.length})</h2>
                <div className="text-xs text-ink-soft mt-0.5">
                  Round: <span className="font-bold text-ink uppercase">{data.activeRound}</span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                <div className="flex border border-ink text-xs">
                  <button
                    onClick={() => setTrackFilter('ALL')}
                    className={`px-3 py-1 font-bold ${trackFilter === 'ALL' ? 'bg-ink text-paper' : 'hover:bg-line/20'}`}
                  >
                    ALL
                  </button>
                  {uniqueTracks.map((tr) => (
                    <button
                      key={tr}
                      onClick={() => setTrackFilter(tr)}
                      className={`px-3 py-1 font-bold ${trackFilter === tr ? 'bg-ink text-paper' : 'hover:bg-line/20'}`}
                    >
                      Track {tr}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search team or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-paper-card border-2 border-ink px-3 py-1.5 text-xs font-mono font-bold placeholder:text-ink/40"
                />
              </div>
            </div>

            {/* Roster Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-ink bg-line/20">
                    <th className="p-2.5 font-bold">UNIT</th>
                    <th className="p-2.5 font-bold">ASSIGNED TEAM NAME</th>
                    <th className="p-2.5 font-bold">TRACK</th>
                    <th className="p-2.5 font-bold">PIN</th>
                    <th className="p-2.5 font-bold">REG STATUS</th>
                    <th className="p-2.5 font-bold">CURRENT STAGE</th>
                    <th className="p-2.5 font-bold">LAST UPDATED</th>
                    <th className="p-2.5 font-bold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team) => {
                    const prog = data.progress[team.code];
                    const stageKey = prog?.current_stage || 'clue2';
                    const stageLabel = STAGE_LABELS[stageKey] || stageKey;
                    const isFinished = stageKey === 'final';
                    const reg = (data.registrations || {})[team.code];
                    const isEditing = editingTeamCode === team.code;

                    return (
                      <tr
                        key={team.code}
                        className={`border-b border-line hover:bg-line/10 transition-colors ${
                          isFinished ? 'bg-verified-teal/5' : ''
                        }`}
                      >
                        <td className="p-2.5 font-bold">{team.code}</td>
                        <td className="p-2.5">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                className="bg-paper border border-ink px-2 py-0.5 text-xs font-bold w-36"
                                placeholder="Enter team name"
                              />
                              <button
                                type="button"
                                onClick={() => handleConfirmTeam(team.code, editingNameValue)}
                                className="bg-ink text-paper px-2 py-0.5 text-[10px] font-bold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTeamCode(null)}
                                className="text-[10px] text-ink-soft hover:underline"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-ink">
                                {reg?.team_name ? `"${reg.team_name}"` : '—'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTeamCode(team.code);
                                  setEditingNameValue(reg?.team_name || '');
                                }}
                                className="text-[10px] text-ink-soft hover:text-ink underline ml-1"
                                title="Edit / Assign Team Name"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">{team.track}</td>
                        <td className="p-2.5 text-ink-soft font-mono">{team.pin}</td>
                        <td className="p-2.5">
                          {reg?.confirmed ? (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-verified-teal bg-verified-teal/15 border border-verified-teal">
                              ✓ CLEARED
                            </span>
                          ) : reg ? (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-lockout-amber bg-lockout-amber/15 border border-lockout-amber animate-pulse">
                              ⚠️ AT DESK
                            </span>
                          ) : (
                            <span className="text-[10px] text-ink-soft">
                              NOT CHECKED IN
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 text-[11px] font-bold ${
                              isFinished
                                ? 'bg-verified-teal text-paper'
                                : stageKey === 'clue4'
                                ? 'bg-ink text-paper'
                                : 'bg-line text-ink'
                            }`}
                          >
                            {stageLabel}
                          </span>
                        </td>
                        <td className="p-2.5 text-ink-soft" suppressHydrationWarning>
                          {prog?.last_updated ? formatTime(prog.last_updated) : 'Not started'}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedDossierTeam(team.code);
                              setActiveTab('paths');
                            }}
                            className="text-[11px] text-ink underline hover:text-evidence-red"
                          >
                            View Path
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* TWO-COLUMN CONTROLS: OVERRIDE & FINALE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MANUAL OVERRIDE */}
            <section className="border-2 border-ink p-5 bg-paper">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink mb-1">
                Emergency Stage Override
              </h2>
              <p className="text-xs text-ink-soft mb-4">
                Manually force any team to a specific stage in the database.
              </p>

              <form onSubmit={handleOverride} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Select Team</label>
                  <select
                    value={overrideTeam}
                    onChange={(e) => setOverrideTeam(e.target.value)}
                    className="w-full bg-paper border border-ink p-2 text-xs"
                    required
                  >
                    <option value="">-- Choose Team --</option>
                    {data.teams.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.code} (Track {t.track}) — Current: {STAGE_LABELS[data.progress[t.code]?.current_stage || 'clue2']}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Target Stage</label>
                  <select
                    value={overrideStage}
                    onChange={(e) => setOverrideStage(e.target.value)}
                    className="w-full bg-paper border border-ink p-2 text-xs"
                  >
                    <option value="clue2">Clue 2</option>
                    <option value="crewmate">Witness (Crewmate)</option>
                    <option value="clue3">Clue 3</option>
                    <option value="clue4">Clue 4</option>
                    <option value="final">Final (Empty Stage)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!overrideTeam || overriding}
                  className="w-full bg-ink text-paper py-2 text-xs font-bold hover:bg-ink-soft disabled:opacity-50 transition-colors"
                >
                  {overriding ? 'Updating Stage...' : 'Apply Stage Override'}
                </button>
              </form>
            </section>

            {/* FINALE VERIFICATION BOARD */}
            <section className="border-2 border-ink p-5 bg-paper">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink mb-1">
                Finale Key Verification Board
              </h2>
              <p className="text-xs text-ink-soft mb-4">
                Log physical key hand-off at Empty Stage. First 3 arrivals receive official placement!
              </p>

              <form onSubmit={handleFinaleSubmit} className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-bold mb-1">Team Handing In Key</label>
                  <select
                    value={finaleTeam}
                    onChange={(e) => setFinaleTeam(e.target.value)}
                    className="w-full bg-paper border border-ink p-2 text-xs"
                    required
                  >
                    <option value="">-- Choose Team --</option>
                    {data.teams.map((t) => (
                      <option key={t.code} value={t.code}>
                        Team {t.code} (Track {t.track})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!finaleTeam || submittingFinale}
                  className="w-full bg-verified-teal text-paper py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {submittingFinale ? 'Recording...' : '✓ Confirm Physical Key Arrival'}
                </button>
              </form>

              {/* Podium / Arrivals List */}
              <div className="border border-line p-3 bg-paper/60">
                <div className="text-xs font-bold uppercase mb-2">Arrivals ({data.finale.length})</div>
                {data.finale.length === 0 ? (
                  <div className="text-xs text-ink-soft italic">No keys handed in yet.</div>
                ) : (
                  <div className="space-y-1.5">
                    {data.finale.map((sub, idx) => (
                      <div
                        key={sub.team_code}
                        className="flex justify-between items-center text-xs p-1.5 border-b border-line/50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold px-1.5 py-0.5 text-[10px] ${
                              idx === 0
                                ? 'bg-verified-teal text-paper'
                                : idx === 1
                                ? 'bg-ink text-paper'
                                : idx === 2
                                ? 'bg-line text-ink'
                                : 'text-ink-soft'
                            }`}
                          >
                            {sub.position ? `#${sub.position}` : `#${idx + 1}`}
                          </span>
                          <span className="font-bold">Team {sub.team_code}</span>
                        </div>
                        <span className="text-[11px] text-ink-soft" suppressHydrationWarning>
                          {formatTime(sub.submitted_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ATTEMPT LOG */}
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
                    <span suppressHydrationWarning className="text-[10px] text-ink-soft shrink-0">
                      {formatTime(att.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: MASTER TEAM PATHS & DOSSIER */}
      {activeTab === 'paths' && (
        <div className="space-y-6">
          {/* Paths Search & Filters */}
          <div className="border-2 border-ink p-4 bg-paper-card shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase text-ink">Filter Track:</span>
              <button
                onClick={() => setDossierTrackFilter('ALL')}
                className={`px-3 py-1 text-xs font-bold border-2 ${
                  dossierTrackFilter === 'ALL'
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-paper-card text-ink border-line hover:border-ink'
                }`}
              >
                ALL
              </button>
              {uniqueTracks.map((tr) => (
                <button
                  key={tr}
                  onClick={() => setDossierTrackFilter(tr)}
                  className={`px-3 py-1 text-xs font-bold border-2 ${
                    dossierTrackFilter === tr
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper-card text-ink border-line hover:border-ink'
                  }`}
                >
                  Track {tr}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <input
                type="text"
                placeholder="Search team, crew, codeword, zone, hint..."
                value={dossierSearch}
                onChange={(e) => setDossierSearch(e.target.value)}
                className="w-full md:w-64 bg-paper-card border-2 border-ink px-3 py-1.5 text-xs font-mono font-bold placeholder:text-ink/40"
              />
              <button
                type="button"
                onClick={copyAllPathsMaster}
                className="px-3 py-1.5 bg-paper-card border-2 border-ink text-xs font-bold hover:bg-ink hover:text-paper transition-colors"
                title="Copy entire cheat sheet of all teams with all hints, answers, and scripts"
              >
                {copiedTeam === 'ALL' ? '✓ Master Copied!' : '📋 Copy All 32 Paths'}
              </button>
              <div className="flex border border-ink text-xs">
                <button
                  type="button"
                  onClick={() => setDossierViewMode('cards')}
                  className={`px-3 py-1 font-bold ${
                    dossierViewMode === 'cards' ? 'bg-ink text-paper' : 'hover:bg-line/20'
                  }`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setDossierViewMode('table')}
                  className={`px-3 py-1 font-bold ${
                    dossierViewMode === 'table' ? 'bg-ink text-paper' : 'hover:bg-line/20'
                  }`}
                >
                  Matrix
                </button>
              </div>
            </div>
          </div>

          {/* Quick Team Badges Selector Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-line">
            {dossierFilteredTeams.map((t) => {
              const liveStage = data.progress[t.code]?.current_stage || 'clue2';
              const isSelected = selectedDossierTeam === t.code;
              return (
                <button
                  key={t.code}
                  onClick={() => setSelectedDossierTeam(t.code)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-ink text-paper border-ink shadow'
                      : 'bg-paper text-ink border-line hover:border-ink'
                  }`}
                >
                  <span>{t.code}</span>
                  <span className="text-[10px] ml-1 opacity-70">
                    ({STAGE_LABELS[liveStage] || liveStage})
                  </span>
                </button>
              );
            })}
          </div>

          {/* CARD VIEW: SELECTED TEAM DOSSIER */}
          {dossierViewMode === 'cards' && (
            <div>
              {dossierFilteredTeams.length === 0 ? (
                <div className="border border-dashed border-line p-8 text-center text-ink-soft text-xs">
                  No teams found matching your search.
                </div>
              ) : (
                (() => {
                  const currentTeam =
                    dossierFilteredTeams.find((t) => t.code === selectedDossierTeam) ||
                    dossierFilteredTeams[0];
                  const st = stagesData[currentTeam.code] || {};
                  const liveStage = data.progress[currentTeam.code]?.current_stage || 'clue2';

                  return (
                    <div className="border-2 border-ink bg-paper-card p-5 md:p-6 space-y-6 shadow-md">
                      {/* Team Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b-2 border-ink">
                        <div>
                          <div className="text-xs text-evidence-red font-bold tracking-wider">
                            CONFIDENTIAL // MASTER DOSSIER (ORGANIZER UNREDACTED VIEW)
                          </div>
                          <div className="flex items-baseline gap-3 mt-1">
                            <h2 className="font-display text-2xl md:text-3xl text-ink">
                              Team {currentTeam.code}
                            </h2>
                            <span className="text-xs bg-ink text-paper px-2 py-0.5 font-bold">
                              Track {currentTeam.track}
                            </span>
                            <span className="text-xs font-mono text-ink-soft">
                              PIN: <strong className="text-ink">{currentTeam.pin}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[11px] text-ink-soft block">LIVE PROGRESS</span>
                            <span className="text-xs font-bold bg-verified-teal/20 text-verified-teal px-2 py-0.5 rounded">
                              {STAGE_LABELS[liveStage] || liveStage}
                            </span>
                          </div>
                          <button
                            onClick={() => copyTeamPathSummary(currentTeam, st)}
                            className="text-xs bg-ink text-paper px-3 py-1.5 font-bold hover:bg-ink-soft transition-colors"
                          >
                            {copiedTeam === currentTeam.code ? '✓ Copied!' : '📋 Copy Path'}
                          </button>
                        </div>
                      </div>

                      {/* 4 Pipeline Stages */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* STAGE 1: CLUE 2 */}
                        <div className="border border-line p-4 bg-paper/60 space-y-2">
                          <div className="flex justify-between items-center border-b border-line pb-1.5">
                            <span className="text-xs font-bold text-evidence-red">
                              1. PHYSICAL CLUE (CLUE 2)
                            </span>
                            <span className="text-xs bg-line/40 px-2 py-0.5 font-bold">
                              {st.clue2?.zone || 'TBD'}
                            </span>
                          </div>
                          <div className="text-xs font-mono space-y-1.5">
                            <div>
                              <span className="text-ink-soft">Expected Codeword: </span>
                              <strong className="text-verified-teal bg-verified-teal/10 px-1 py-0.5 text-sm font-bold">
                                {st.clue2?.codeword || 'N/A'}
                              </strong>
                            </div>
                            {st.clue2?.riddle && (
                              <div className="pt-1.5 border-t border-line/40">
                                <span className="text-[10px] text-evidence-red font-bold block mb-0.5">LOCATION RIDDLE:</span>
                                <p className="text-[11px] italic text-ink leading-relaxed">
                                  &ldquo;{st.clue2.riddle}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* STAGE 2: WITNESS CONTACT */}
                        <div className="border border-line p-4 bg-paper/60 space-y-2">
                          <div className="flex justify-between items-center border-b border-line pb-1.5">
                            <span className="text-xs font-bold text-evidence-red">
                              2. WITNESS CONTACT (CREWMATE)
                            </span>
                            <span className="text-xs bg-line/40 px-2 py-0.5 font-bold">
                              {st.crewmate?.id || 'CREW'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              {st.crewmate?.photo && (
                                <img
                                  src={st.crewmate.photo}
                                  alt={st.crewmate.name || 'Crewmate'}
                                  onClick={() => setAdminPhotoModal({ url: st.crewmate.photo, name: st.crewmate.name || st.crewmate.id })}
                                  className="w-16 h-16 object-contain rounded border border-line bg-neutral-900 shrink-0 cursor-pointer hover:opacity-85 shadow"
                                  title="Click to view full photo"
                                />
                              )}
                              <div className="text-xs font-mono space-y-1">
                                <div>
                                  <span className="text-ink-soft">Person: </span>
                                  <strong className="text-sm">{st.crewmate?.name || 'N/A'}</strong>
                                </div>
                                <div>
                                  <span className="text-ink-soft">Physical Code: </span>
                                  <strong className="text-verified-teal bg-verified-teal/10 px-1 py-0.5 break-all text-xs">
                                    {st.crewmate?.code || 'N/A'}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {st.crewmate?.script && (
                              <div className="text-[11px] font-mono text-ink bg-line/20 p-2 border-l-2 border-evidence-red">
                                <span className="text-evidence-red font-bold block mb-0.5">WITNESS SCRIPT (DIALOGUE):</span>
                                <p className="italic">&ldquo;{st.crewmate.script}&rdquo;</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* STAGE 3: CLUE 3 */}
                        <div className="border border-line p-4 bg-paper/60 space-y-2">
                          <div className="flex justify-between items-center border-b border-line pb-1.5">
                            <span className="text-xs font-bold text-evidence-red">
                              3. ONLINE CIPHER (CLUE 3)
                            </span>
                            <span className="text-xs bg-line/40 px-2 py-0.5 font-bold">
                              {st.clue3?.cipherType || 'Cipher'}
                            </span>
                          </div>
                          <div className="text-xs font-mono space-y-2">
                            <div>
                              <span className="text-ink-soft">Intercept: </span>
                              <span className="text-xs font-bold text-ink bg-line/20 px-1.5 py-0.5 break-all">
                                {st.clue3?.intercept || 'N/A'}
                              </span>
                            </div>
                            
                            {/* EXPLICIT HINT SHOWN TO ADMINS */}
                            {st.clue3?.hint && (
                              <div className="p-2 bg-amber-500/10 border-l-2 border-amber-600 text-ink">
                                <span className="text-amber-800 font-bold block text-[10px] mb-0.5">
                                  💡 CIPHER DECRYPTION HINT:
                                </span>
                                <p className="text-[11px] leading-relaxed">{st.clue3.hint}</p>
                              </div>
                            )}

                            <div>
                              <span className="text-ink-soft">Decrypted Answer: </span>
                              <strong className="text-verified-teal bg-verified-teal/10 px-1 py-0.5 text-sm">
                                {st.clue3?.answer || 'N/A'}
                              </strong>
                            </div>

                            {st.clue3?.nextZone && (
                              <div>
                                <span className="text-ink-soft">Next Zone Target: </span>
                                <strong className="text-ink bg-line/30 px-1.5 py-0.5">
                                  {st.clue3.nextZone}
                                </strong>
                              </div>
                            )}

                            {st.clue3?.nextRiddle && (
                              <div className="pt-1.5 border-t border-line/40">
                                <span className="text-[10px] text-evidence-red font-bold block mb-0.5">
                                  NEXT SECTOR RIDDLE:
                                </span>
                                <p className="text-[11px] italic text-ink leading-relaxed">
                                  &ldquo;{st.clue3.nextRiddle}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* STAGE 4: CLUE 4 */}
                        <div className="border border-line p-4 bg-paper/60 space-y-2">
                          <div className="flex justify-between items-center border-b border-line pb-1.5">
                            <span className="text-xs font-bold text-evidence-red">
                              4. PHYSICAL EVIDENCE (CLUE 4)
                            </span>
                            <span className="text-xs bg-line/40 px-2 py-0.5 font-bold">
                              {st.clue4?.zone || 'TBD'}
                            </span>
                          </div>
                          <div className="text-xs font-mono space-y-2">
                            <div>
                              <span className="text-ink-soft">Escape Sector: </span>
                              <strong className="text-ink text-sm">{st.clue4?.zone || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-ink-soft">Physical Puzzle Answer: </span>
                              <strong className="text-verified-teal bg-verified-teal/10 px-1.5 py-0.5 text-sm">
                                {st.clue4?.answer || 'N/A'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* STAGE 5: FINALE */}
                      <div className="border border-ink bg-paper p-3 text-xs flex justify-between items-center">
                        <div>
                          <strong className="text-evidence-red">5. CASE RESOLUTION: </strong>
                          <span>Empty Stage // Backstage key retrieval (3 Keys available for 1st, 2nd, 3rd)</span>
                        </div>
                        <span className="text-ink-soft">Round: {data.activeRound.toUpperCase()}</span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* TABLE / MATRIX VIEW */}
          {dossierViewMode === 'table' && (
            <div className="border-2 border-ink p-4 bg-paper-card shadow-md space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-ink">
                  Total Matching Teams: {dossierFilteredTeams.length}
                </span>
                <button
                  type="button"
                  onClick={() => setTableExpandAll(!tableExpandAll)}
                  className="text-xs font-bold bg-line/30 hover:bg-line/50 border border-ink px-3 py-1"
                >
                  {tableExpandAll ? '▼ Collapse Matrix Details' : '▶ Expand All Hints & Riddles'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b-2 border-ink bg-line/20 font-bold">
                      <th className="p-2">TEAM</th>
                      <th className="p-2">TRACK</th>
                      <th className="p-2">PIN</th>
                      <th className="p-2">LIVE</th>
                      <th className="p-2">CLUE 2 (ZONE, CODE & RIDDLE)</th>
                      <th className="p-2">CREWMATE (NAME, CODE & SCRIPT)</th>
                      <th className="p-2">CLUE 3 (CIPHER, HINT & ANS)</th>
                      <th className="p-2">CLUE 4 (ZONE & ANS)</th>
                      <th className="p-2 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossierFilteredTeams.map((team) => {
                      const st = stagesData[team.code] || {};
                      const live = data.progress[team.code]?.current_stage || 'clue2';

                      return (
                        <tr key={team.code} className="border-b border-line hover:bg-line/10 font-mono align-top">
                          <td className="p-2 font-bold text-sm">{team.code}</td>
                          <td className="p-2">{team.track}</td>
                          <td className="p-2 text-ink-soft">{team.pin}</td>
                          <td className="p-2">
                            <span className="bg-line px-1.5 py-0.5 text-[10px] font-bold">
                              {STAGE_LABELS[live] || live}
                            </span>
                          </td>
                          <td className="p-2 max-w-[220px]">
                            <div><strong>{st.clue2?.zone}</strong></div>
                            <div className="text-verified-teal font-bold">{st.clue2?.codeword}</div>
                            {tableExpandAll && st.clue2?.riddle && (
                              <div className="text-[10px] italic text-ink-soft mt-1 bg-line/20 p-1 border-l border-line">
                                &ldquo;{st.clue2.riddle}&rdquo;
                              </div>
                            )}
                          </td>
                          <td className="p-2 max-w-[220px]">
                            <div className="flex items-center gap-1.5">
                              {st.crewmate?.photo && (
                                <img
                                  src={st.crewmate.photo}
                                  alt={st.crewmate.name}
                                  onClick={() => setAdminPhotoModal({ url: st.crewmate.photo, name: st.crewmate.name })}
                                  className="w-7 h-7 object-contain rounded border border-line bg-neutral-900 cursor-pointer shrink-0"
                                />
                              )}
                              <div>
                                <strong>{st.crewmate?.name}</strong>
                                <div className="text-[10px] text-ink-soft">({st.crewmate?.id})</div>
                              </div>
                            </div>
                            <div className="text-verified-teal font-bold text-[10px] break-all mt-0.5">{st.crewmate?.code}</div>
                            {tableExpandAll && st.crewmate?.script && (
                              <div className="text-[10px] italic text-ink-soft mt-1 bg-line/20 p-1 border-l border-evidence-red">
                                &ldquo;{st.crewmate.script}&rdquo;
                              </div>
                            )}
                          </td>
                          <td className="p-2 max-w-[260px]">
                            <div className="text-[10px] text-ink-soft">{st.clue3?.cipherType}</div>
                            <div className="text-verified-teal font-bold">{st.clue3?.answer}</div>
                            <div className="text-[10px] text-ink-soft truncate">{st.clue3?.intercept}</div>
                            {/* HINT SHOWN IN MATRIX */}
                            {st.clue3?.hint && (
                              <div className={`text-[10px] text-amber-800 bg-amber-500/15 p-1 border-l-2 border-amber-600 mt-1 ${tableExpandAll ? '' : 'truncate'}`}>
                                💡 {st.clue3.hint}
                              </div>
                            )}
                            {tableExpandAll && st.clue3?.nextRiddle && (
                              <div className="text-[10px] italic text-ink-soft mt-1 bg-line/20 p-1 border-l border-line">
                                Next: &ldquo;{st.clue3.nextRiddle}&rdquo;
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <div><strong>{st.clue4?.zone}</strong></div>
                            <div className="text-verified-teal font-bold">{st.clue4?.answer}</div>
                          </td>
                          <td className="p-2 text-right">
                            <button
                              onClick={() => copyTeamPathSummary(team, st)}
                              className="text-[10px] px-2 py-1 bg-ink text-paper hover:bg-ink-soft font-bold rounded"
                            >
                              {copiedTeam === team.code ? 'Copied' : 'Copy'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Photo Modal */}
      {adminPhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4"
          onClick={() => setAdminPhotoModal(null)}
        >
          <div className="flex justify-between items-center text-paper font-mono text-xs pb-3 border-b border-white/20">
            <span className="text-evidence-red font-bold">WITNESS PHOTOGRAPH // {adminPhotoModal.name}</span>
            <button
              type="button"
              onClick={() => setAdminPhotoModal(null)}
              className="px-3 py-1 bg-white/20 text-white rounded font-mono text-xs"
            >
              ✕ Close
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={adminPhotoModal.url}
              alt={adminPhotoModal.name}
              className="max-h-[80vh] max-w-[95vw] object-contain rounded border border-white/20 shadow-2xl"
            />
          </div>
          <div className="text-center text-xs font-mono text-white/60 pb-2">
            Click anywhere to close
          </div>
        </div>
      )}
    </div>
  );
}
