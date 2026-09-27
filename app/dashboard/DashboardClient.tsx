'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SanitizedStageData } from '@/lib/round';
import ThemeToggle from '@/components/ThemeToggle';

interface DashboardClientProps {
  teamCode: string;
  track: string;
  round: string;
  initialStage: string;
  initialStageData: SanitizedStageData;
  initialConfirmed?: boolean;
  initialTeamName?: string;
}

const STAGES = [
  { key: 'clue2', name: 'Clue 2', short: 'Codeword', num: '01' },
  { key: 'crewmate', name: 'Witness', short: 'Witness', num: '02' },
  { key: 'clue3', name: 'Clue 3', short: 'Cipher', num: '03' },
  { key: 'clue4', name: 'Clue 4', short: 'Evidence', num: '04' },
  { key: 'final', name: 'Empty Stage', short: 'Finale', num: '05' },
];

function triggerHaptic(type: 'tap' | 'success' | 'error') {
  if (typeof window === 'undefined') return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'success') navigator.vibrate([25, 35, 25]);
      else if (type === 'error') navigator.vibrate([50, 40, 50]);
      else navigator.vibrate(10);
    }
  } catch (e) {
    // Non-blocking fallback
  }
}

export default function DashboardClient({
  teamCode,
  track,
  round,
  initialStage,
  initialStageData,
  initialConfirmed = false,
  initialTeamName = '',
}: DashboardClientProps) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [teamName, setTeamName] = useState(initialTeamName);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const [currentStage, setCurrentStage] = useState(initialStage);
  const [stageData, setStageData] = useState<SanitizedStageData>(initialStageData);
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [roundMismatch, setRoundMismatch] = useState(false);
  const [justVerified, setJustVerified] = useState(false);
  const [justErrored, setJustErrored] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync props if refreshed
  useEffect(() => {
    setCurrentStage(initialStage);
  }, [initialStage]);

  useEffect(() => {
    setStageData(initialStageData);
  }, [initialStageData]);

  useEffect(() => {
    setConfirmed(initialConfirmed);
  }, [initialConfirmed]);

  useEffect(() => {
    if (initialTeamName) setTeamName(initialTeamName);
  }, [initialTeamName]);

  // Polling for team confirmation / name assignment when on waiting screen
  useEffect(() => {
    if (confirmed) return;

    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/team/status');
        if (res.ok) {
          const data = await res.json();
          if (data.confirmed && mounted) {
            triggerHaptic('success');
            setConfirmed(true);
            setTeamName(data.teamName || '');
            router.refresh();
          }
        }
      } catch (e) {
        // silent fail on network jitter
      }
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [confirmed, router]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining === null || lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setErrorMsg(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining === null || cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  function promptLogout() {
    triggerHaptic('tap');
    setShowLogoutConfirm(true);
  }

  async function handleLogout() {
    setShowLogoutConfirm(false);
    triggerHaptic('tap');
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  async function handleManualCheckStatus() {
    setCheckingStatus(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/team/status');
      if (res.ok) {
        const data = await res.json();
        if (data.confirmed) {
          triggerHaptic('success');
          setConfirmed(true);
          setTeamName(data.teamName || '');
          router.refresh();
        } else {
          setErrorMsg('Awaiting organizer clearance at the desk. Please ask them to assign your team name.');
          setTimeout(() => setErrorMsg(null), 4000);
        }
      }
    } catch (e) {
      setErrorMsg('Network error checking clearance status.');
    } finally {
      setCheckingStatus(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || submitting || lockoutRemaining !== null || cooldownRemaining !== null) {
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setJustErrored(false);
    triggerHaptic('tap');

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: inputValue }),
      });

      const data = await res.json();

      if (res.status === 409 && data.roundMismatch) {
        setRoundMismatch(true);
        setSubmitting(false);
        return;
      }

      if (res.status === 403 && data.notConfirmed) {
        setConfirmed(false);
        setSubmitting(false);
        return;
      }

      if (res.status === 429) {
        triggerHaptic('error');
        if (data.reason === 'lockout') {
          setLockoutRemaining(data.remainingSeconds || 90);
          setErrorMsg(data.error || 'Detective lockout active.');
        } else if (data.reason === 'cooldown') {
          setCooldownRemaining(data.remainingSeconds || 4);
          setErrorMsg(data.error || 'Cooldown active.');
        }
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        triggerHaptic('error');
        setJustErrored(true);
        setErrorMsg(data.error || "That's not it, Detective.");
        if (data.lockedOut) {
          setLockoutRemaining(data.lockoutSeconds || 90);
        }
        setSubmitting(false);
        setTimeout(() => setJustErrored(false), 400);
        return;
      }

      // Submission was correct!
      triggerHaptic('success');
      setJustVerified(true);
      setInputValue('');
      setCurrentStage(data.currentStage);
      if (data.stageData) {
        setStageData(data.stageData);
      }
      router.refresh();

      // Settle the animation
      setTimeout(() => {
        setJustVerified(false);
      }, 500);

      setSubmitting(false);
    } catch (err) {
      triggerHaptic('error');
      setErrorMsg('Connection lost. Please retry.');
      setSubmitting(false);
    }
  }

  // Round mismatch fallback
  if (roundMismatch) {
    return (
      <main className="min-h-screen bg-paper text-ink p-6 flex flex-col items-center justify-center max-w-md mx-auto text-left">
        <div className="border-2 border-evidence-red bg-paper-card p-6 w-full shadow-md">
          <div className="font-mono text-xs text-evidence-red mb-2 font-bold tracking-wider">
            NOTICE // INVESTIGATION PHASE ADVANCED
          </div>
          <h2 className="font-serif text-2xl text-ink mb-3 font-bold">
            Round Transition in Progress
          </h2>
          <p className="text-sm text-ink-soft mb-6 font-serif leading-relaxed">
            The field organizers have updated the active investigation phase. Please re-enter your credentials.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-ink text-paper py-3 font-mono font-bold text-sm uppercase tracking-wider hover:bg-ink-mid active:scale-95 transition-all shadow"
          >
            Re-enter Portal
          </button>
        </div>
      </main>
    );
  }

  // =========================================================================
  // HOLDING BAY: WAITING FOR ORGANIZER CLEARANCE & TEAM NAME ASSIGNMENT
  // =========================================================================
  if (!confirmed) {
    return (
      <main className="min-h-screen bg-paper text-ink px-4 py-8 flex flex-col justify-between max-w-md mx-auto">
        <div>
          {/* Dateline Banner */}
          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-ink-mid pb-1.5 border-b border-line-light uppercase tracking-widest">
            <span>DISPATCH STATION // TERMINAL #0426</span>
            <span className="text-evidence-red font-bold">STANDBY CLEARANCE</span>
          </div>

          {/* Masthead */}
          <header className="mb-6 pt-3 flex justify-between items-start">
            <div>
              <div className="inline-block border border-line px-2 py-0.5 mb-2 text-[10px] font-mono font-bold tracking-widest text-ink-mid bg-paper-inset uppercase">
                ENVELOPE AUTHENTICATED // STEP 1 OF 2
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
                Awaiting Clearance
              </h1>
              <p className="text-xs md:text-sm font-serif text-ink-mid mt-1 leading-relaxed">
                Unit credentials verified. Your terminal is standing by for Team Name assignment at the registration desk.
              </p>
            </div>
            <ThemeToggle />
          </header>

          {/* Standby Clearance Card */}
          <section className="news-card p-6 relative shadow-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-line-light">
              <span className="font-mono text-xs font-bold text-ink-mid uppercase tracking-wider">
                ASSIGNED UNIT
              </span>
              <span className="font-mono text-sm font-bold bg-ink text-paper px-2.5 py-0.5">
                Team {teamCode} (Track {track})
              </span>
            </div>

            <div className="detective-directive p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-evidence-red tracking-wider uppercase">
                <span>⚑</span>
                <span>DESK REGISTRATION PROTOCOL</span>
              </div>
              <div className="text-xs md:text-sm font-mono text-ink leading-relaxed font-semibold space-y-1.5">
                <p>1. Report to the Organizer / Game Master Registration Desk.</p>
                <p>2. Give them your unit code: <strong className="text-evidence-red">Team {teamCode}</strong>.</p>
                <p>3. Declare your chosen <strong className="text-ink">Team Name</strong>.</p>
                <p>4. Once the organizers register your team name, this terminal will automatically unlock your investigation journey!</p>
              </div>
            </div>

            {/* Pulsing Sync Status Indicator */}
            <div className="p-3 bg-paper-inset border border-line-light flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-lockout-amber animate-pulse" />
                <span className="font-bold text-ink-mid">Listening for dispatch clearance...</span>
              </div>
              <span className="text-[10px] text-ink-soft">Live 3s</span>
            </div>

            <button
              type="button"
              onClick={handleManualCheckStatus}
              disabled={checkingStatus}
              className="w-full bg-ink text-paper py-3 font-mono font-bold text-xs uppercase tracking-wider hover:bg-ink-mid active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              {checkingStatus ? 'Checking Registry...' : '↻ Check Clearance Status Now'}
            </button>

            {errorMsg && (
              <div className="text-xs font-mono text-evidence-red border-l-4 border-evidence-red pl-2.5 py-1 font-bold bg-paper-inset">
                {errorMsg}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-3 border-t border-line text-[11px] font-mono font-bold text-ink-soft flex justify-between items-center">
          <button
            type="button"
            onClick={promptLogout}
            className="hover:underline text-ink"
          >
            ← Sign out / Switch envelope
          </button>
          <span className="text-evidence-red">AWAITING ORGANIZER</span>
        </footer>

        {/* Logout Confirmation Modal for Standby Screen */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="news-card border-2 border-ink p-5 max-w-sm w-full space-y-4 shadow-2xl animate-stamp">
              <div className="flex justify-between items-center pb-2 border-b border-line-light">
                <span className="font-mono text-xs font-bold text-evidence-red uppercase tracking-wider">
                  CONFIRM SIGN OUT
                </span>
                <span className="text-xs font-mono font-bold text-ink-soft">
                  Unit {teamCode}
                </span>
              </div>
              
              <p className="font-serif text-sm text-ink leading-relaxed font-medium">
                Are you sure you want to sign out? You will need your envelope PIN to return to this screen.
              </p>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 px-3 border-2 border-ink bg-paper text-ink font-mono text-xs font-bold uppercase tracking-wider hover:bg-line/20 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 py-2.5 px-3 bg-evidence-red text-paper font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow"
                >
                  Yes, Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // =========================================================================
  // ACTIVE CASE FILE VIEW (AFTER ADMIN CONFIRMATION & TEAM NAME ASSIGNMENT)
  // =========================================================================
  return (
    <div className="min-h-screen bg-paper text-ink pb-44 max-w-md mx-auto relative select-none">
      {/* Newspaper Masthead Header */}
      <header className="px-4 pt-3 pb-2.5 border-b-2 border-ink sticky top-0 bg-paper/95 backdrop-blur-md z-20 shadow-sm">
        {/* Top Dateline / Dispatch Banner */}
        <div className="flex justify-between items-center pb-1.5 border-b border-line-light text-[10px] font-mono font-bold">
          <span className="tracking-widest uppercase text-ink-mid">
            DAILY CAMPUS DISPATCH
          </span>
          <span className="text-evidence-red tracking-wider uppercase">
            CASE #{round.toUpperCase()}-0426
          </span>
        </div>

        {/* Masthead Main Title: Shows Custom Team Name + Unit Code */}
        <div className="pt-2 flex justify-between items-center">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
              {teamName || `Team ${teamCode}`}
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-mono mt-0.5">
              <span className="font-bold text-ink-mid">Unit {teamCode}</span>
              <span className="text-line">·</span>
              <span className="bg-ink text-paper px-1.5 py-0.2 rounded font-bold text-[10px]">
                Track {track}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Investigation Progress Stepper */}
      <div className="px-4 pt-3 pb-2.5 bg-paper-card border-b border-line">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-ink-mid font-bold tracking-wider uppercase">INVESTIGATION DISPATCH TRACK</span>
          <span className="text-evidence-red font-bold text-xs">
            {currentStage === 'final' ? 'STAGE 5/5 (PODIUM)' : `STAGE ${currentIndex + 1} OF 5`}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {STAGES.map((s, idx) => {
            const isDone = currentIndex > idx;
            const isCurrent = currentIndex === idx;
            return (
              <div
                key={s.key}
                className={`py-1.5 text-center font-mono text-xs border transition-all ${
                  isDone
                    ? 'bg-paper-inset border-verified-teal text-verified-teal font-bold'
                    : isCurrent
                    ? 'bg-ink text-paper border-ink font-bold shadow-sm'
                    : 'bg-transparent border-line-light text-ink-soft/70 font-semibold'
                }`}
              >
                <div className="font-bold">{isDone ? '✓' : s.num}</div>
                <div className="text-[10px] uppercase font-bold tracking-tight truncate">{s.short}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Case File Body */}
      <div className="px-4 py-4 space-y-4">
        {/* Detective Field Briefing Box */}
        <div className="news-card p-4 relative shadow-sm border-l-4 border-l-ink">
          <div className="flex items-center justify-between mb-1.5 border-b border-line-light pb-1">
            <span className="text-xs font-mono text-evidence-red font-bold tracking-wider uppercase">
              FIELD BRIEFING // CLASSIFIED
            </span>
            <span className="text-[11px] font-mono font-bold text-ink-soft">DOC REF: 89-B</span>
          </div>
          <p className="text-sm text-ink leading-relaxed font-serif font-medium pt-1">
            You are Detectives on scene. Something walked off campus last night. Follow the physical traces, find the witnesses, decrypt their intercepts, and reach the final coordinates before time runs out.
          </p>
        </div>

        {/* Sequential Evidence Cards */}
        <div className="space-y-4">
          
          {/* ============================================================ */}
          {/* STAGE 1: CLUE 2 (Physical Codeword) */}
          {/* ============================================================ */}
          <section
            id="stage-card-clue2"
            className={`p-4 relative transition-all duration-200 ${
              currentIndex > 0
                ? 'news-card-cleared'
                : currentIndex === 0
                ? `news-card-active ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-shake' : ''}`
                : 'news-card-locked'
            }`}
          >
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-line-light">
              <span className="text-xs font-mono text-ink-mid font-bold tracking-wider">
                EXHIBIT A // PHYSICAL TRACE
              </span>
              {currentIndex > 0 ? (
                <span className="rubber-stamp text-verified-teal">
                  ✓ SOLVED
                </span>
              ) : (
                <span className="text-[11px] font-mono bg-evidence-red text-paper px-2 py-0.5 font-bold uppercase tracking-wider">
                  ACTIVE LEAD
                </span>
              )}
            </div>

            <h3 className="font-serif text-lg text-ink font-bold mb-2">
              Clue 2: The Physical Codeword
            </h3>

            {currentIndex > 0 ? (
              <div className="text-sm font-mono text-verified-teal font-bold pt-1">
                ✓ Lead cleared — on-site codeword authenticated
              </div>
            ) : (
              <div className="space-y-3 mt-2.5">
                {stageData.clue2?.riddle && (
                  <div className="newspaper-quote p-3.5 shadow-sm border border-line-light">
                    <div className="text-xs font-mono text-evidence-red mb-1 font-bold tracking-wider uppercase">
                      CRIME SCENE RIDDLE:
                    </div>
                    <p className="text-sm md:text-base font-serif italic font-bold leading-relaxed text-ink">
                      &ldquo;{stageData.clue2.riddle}&rdquo;
                    </p>
                  </div>
                )}
                
                {/* Harmonious Detective Directive */}
                <div className="detective-directive p-3 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1 text-xs font-mono font-bold text-evidence-red tracking-wider">
                    <span>⚑</span>
                    <span>DETECTIVE PROTOCOL</span>
                  </div>
                  <p className="text-xs md:text-sm font-mono text-ink leading-relaxed font-semibold">
                    Study the lead riddle above carefully to deduce the location of the scene. Search the area on site, find the hidden clue card, solve the on-site puzzle, and enter the verified codeword below.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* STAGE 2: CREWMATE (Witness Contact) */}
          {/* ============================================================ */}
          <section
            id="stage-card-crewmate"
            className={`p-4 relative transition-all duration-200 ${
              currentIndex > 1
                ? 'news-card-cleared'
                : currentIndex === 1
                ? `news-card-active ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-shake' : ''}`
                : 'news-card-locked'
            }`}
          >
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-line-light">
              <span className="text-xs font-mono text-ink-mid font-bold tracking-wider">
                EXHIBIT B // WITNESS CONTACT
              </span>
              {currentIndex > 1 ? (
                <span className="rubber-stamp text-verified-teal">
                  ✓ CONTACTED
                </span>
              ) : currentIndex === 1 ? (
                <span className="text-[11px] font-mono bg-evidence-red text-paper px-2 py-0.5 font-bold uppercase tracking-wider">
                  LOCATE WITNESS
                </span>
              ) : null}
            </div>

            <h3 className="font-serif text-lg text-ink font-bold mb-2">
              Witness Contact
            </h3>

            {currentIndex < 1 ? (
              <p className="text-xs md:text-sm font-mono text-ink-soft font-semibold">
                🔒 Solve Lead 01 to unlock the witness dossier
              </p>
            ) : currentIndex > 1 ? (
              /* Witness Statement REVEALED AFTER CODE ENTRY */
              <div className="space-y-3 pt-1">
                <div className="text-sm font-mono text-verified-teal font-bold flex items-center gap-1.5">
                  <span>✓</span>
                  <span>Witness contact authenticated — code verified</span>
                </div>
                {stageData.crewmate?.script && (
                  <div className="newspaper-quote p-3.5 shadow-sm border border-line-light mt-2">
                    <div className="font-mono text-xs text-evidence-red mb-1 font-bold tracking-wider uppercase">
                      REVEALED WITNESS STATEMENT:
                    </div>
                    <p className="italic font-serif font-bold text-sm md:text-base text-ink leading-relaxed">
                      &ldquo;{stageData.crewmate.script}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* ACTIVE: Looking for witness — NO witness statement shown before code is entered! */
              <div className="space-y-3.5 mt-2.5">
                {/* Polaroid Photo Frame */}
                {stageData.crewmate?.photo && (
                  <div className="polaroid-frame p-3 pt-4 mt-3">
                    {/* Simulated Masking Tape */}
                    <div className="masking-tape" />

                    <div
                      onClick={() => setShowImageModal(true)}
                      className="relative w-full min-h-[17rem] max-h-84 bg-[#1F1A14] flex items-center justify-center p-2 mb-2 border border-line cursor-pointer group overflow-hidden"
                      title="Click to view full uncropped image"
                    >
                      <img
                        src={stageData.crewmate.photo}
                        alt={stageData.crewmate?.name || 'Person of Interest'}
                        className="max-h-76 w-auto max-w-full object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <div className="absolute bottom-2 right-2 bg-ink/90 text-paper font-mono text-xs px-2.5 py-1 border border-paper/30 backdrop-blur-sm pointer-events-none flex items-center gap-1.5 shadow font-bold">
                        <span>🔍 Tap to expand</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline px-0.5 mb-2.5">
                      <span className="font-mono text-xs font-bold text-evidence-red tracking-wider uppercase">
                        PERSON OF INTEREST:
                      </span>
                      <span className="font-serif text-base text-ink font-bold">
                        {stageData.crewmate?.name || stageData.crewmate?.id}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="w-full py-2 px-3 bg-ink text-paper text-xs font-mono font-bold hover:bg-ink-mid active:scale-95 transition-all flex items-center justify-center gap-2 shadow"
                    >
                      <span>🔍</span>
                      <span>Click to view full uncropped image</span>
                    </button>
                  </div>
                )}

                {/* Harmonious Detective Directive */}
                <div className="detective-directive p-3 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1 text-xs font-mono font-bold text-evidence-red tracking-wider">
                    <span>⚑</span>
                    <span>DETECTIVE PROTOCOL</span>
                  </div>
                  <p className="text-xs md:text-sm font-mono text-ink leading-relaxed font-semibold">
                    Study this photograph carefully. This person was spotted in transit on campus. You must locate them on foot, establish contact, and obtain the physical scrambled code they are carrying.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* STAGE 3: CLUE 3 (The Scrambled Sighting / Cipher) */}
          {/* ============================================================ */}
          <section
            id="stage-card-clue3"
            className={`p-4 relative transition-all duration-200 ${
              currentIndex > 2
                ? 'news-card-cleared'
                : currentIndex === 2
                ? `news-card-active ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-shake' : ''}`
                : 'news-card-locked'
            }`}
          >
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-line-light">
              <span className="text-xs font-mono text-ink-mid font-bold tracking-wider">
                EXHIBIT C // SCRAMBLED SIGHTING
              </span>
              {currentIndex > 2 ? (
                <span className="rubber-stamp text-verified-teal">
                  ✓ DECIPHERED
                </span>
              ) : currentIndex === 2 ? (
                <span className="text-[11px] font-mono bg-evidence-red text-paper px-2 py-0.5 font-bold uppercase tracking-wider">
                  DECRYPT CIPHER
                </span>
              ) : null}
            </div>

            <h3 className="font-serif text-lg text-ink font-bold mb-2">
              Clue 3: The Scrambled Sighting
            </h3>

            {currentIndex < 2 ? (
              <p className="text-xs md:text-sm font-mono text-ink-soft font-semibold">
                🔒 Solve Witness Contact to intercept the encrypted telemetry
              </p>
            ) : currentIndex > 2 ? (
              <div className="text-sm font-mono text-verified-teal font-bold pt-1">
                ✓ Cipher decrypted — next sector route revealed
              </div>
            ) : (
              <div className="space-y-3 mt-2.5">
                <p className="text-sm text-ink leading-relaxed font-serif">
                  The witness didn’t want to write it plain. Decrypt their dispatch intercept to discover where the suspect fled next.
                </p>

                {/* Optional reminder of the witness statement after it's unlocked */}
                {stageData.crewmate?.script && (
                  <div className="newspaper-quote p-3 shadow-sm border border-line-light text-xs font-serif italic text-ink">
                    <span className="font-bold uppercase not-italic text-evidence-red font-mono block mb-1">WITNESS STATEMENT (DECRYPTED):</span>
                    &ldquo;{stageData.crewmate.script}&rdquo;
                  </div>
                )}

                {/* Authentic Vintage Telegram Dispatch */}
                <div className="telegraph-dispatch p-4 shadow-md space-y-2.5">
                  <div className="text-[#D8CCA8] text-xs font-mono uppercase tracking-wider font-bold border-b border-[#5E523F] pb-1.5 flex justify-between items-center">
                    <span>TELEGRAPH DISPATCH // CABLE INTERCEPT</span>
                    <span className="text-[11px] text-[#A6977A]">PRIORITY 1</span>
                  </div>
                  <div className="text-center py-2.5 bg-[#17130E] border border-[#4A3E2F]">
                    <div className="text-[11px] font-mono text-[#A6977A] tracking-wider mb-1 uppercase">
                      CIPHER TYPE: {stageData.clue3?.cipherType || 'ENCRYPTED DISPATCH'}
                    </div>
                    <div className="text-base md:text-lg telegraph-cipher break-all px-2">
                      {stageData.clue3?.intercept || 'ENCRYPTED DISPATCH'}
                    </div>
                  </div>
                  {stageData.clue3?.hint && (
                    <div className="text-xs md:text-sm font-mono text-[#E8DCC2] pt-2 border-t border-[#5E523F] leading-relaxed">
                      <span className="text-[#E2B26C] font-bold">DECRYPTION KEY: </span>
                      {stageData.clue3.hint}
                    </div>
                  )}
                </div>

                {/* Harmonious Detective Directive */}
                <div className="detective-directive p-3 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1 text-xs font-mono font-bold text-evidence-red tracking-wider">
                    <span>⚑</span>
                    <span>DETECTIVE PROTOCOL</span>
                  </div>
                  <p className="text-xs md:text-sm font-mono text-ink leading-relaxed font-semibold">
                    Use the encryption hint to decipher the message above. Once decoded, submit the plaintext answer below to unlock the coordinates to the next scene.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* STAGE 4: CLUE 4 (The Physical Evidence) */}
          {/* ============================================================ */}
          <section
            id="stage-card-clue4"
            className={`p-4 relative transition-all duration-200 ${
              currentIndex > 3
                ? 'news-card-cleared'
                : currentIndex === 3
                ? `news-card-active ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-shake' : ''}`
                : 'news-card-locked'
            }`}
          >
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-line-light">
              <span className="text-xs font-mono text-ink-mid font-bold tracking-wider">
                EXHIBIT D // PHYSICAL EVIDENCE
              </span>
              {currentIndex > 3 ? (
                <span className="rubber-stamp text-verified-teal">
                  ✓ SOLVED
                </span>
              ) : currentIndex === 3 ? (
                <span className="text-[11px] font-mono bg-evidence-red text-paper px-2 py-0.5 font-bold uppercase tracking-wider">
                  SEARCH SECTOR
                </span>
              ) : null}
            </div>

            <h3 className="font-serif text-lg text-ink font-bold mb-2">
              Clue 4: The Evidence
            </h3>

            {currentIndex < 3 ? (
              <p className="text-xs md:text-sm font-mono text-ink-soft font-semibold">
                🔒 Solve Clue 3 cipher to unlock the final physical coordinates
              </p>
            ) : currentIndex > 3 ? (
              <div className="text-sm font-mono text-verified-teal font-bold pt-1">
                ✓ Physical evidence authenticated — Empty stage unlocked!
              </div>
            ) : (
              <div className="space-y-3 mt-2.5">
                {stageData.clue3?.nextRiddle && (
                  <div className="newspaper-quote p-3.5 shadow-sm border border-line-light">
                    <div className="text-xs font-mono text-evidence-red mb-1 font-bold tracking-wider uppercase">
                      NEXT SECTOR RIDDLE:
                    </div>
                    <p className="text-sm md:text-base font-serif italic font-bold leading-relaxed text-ink">
                      &ldquo;{stageData.clue3.nextRiddle}&rdquo;
                    </p>
                  </div>
                )}
                
                {/* Harmonious Detective Directive */}
                <div className="detective-directive p-3 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1 text-xs font-mono font-bold text-evidence-red tracking-wider">
                    <span>⚑</span>
                    <span>DETECTIVE PROTOCOL</span>
                  </div>
                  <p className="text-xs md:text-sm font-mono text-ink leading-relaxed font-semibold">
                    Decode the riddle above to determine where the suspect fled. Search the sector on site, find the hidden puzzle left behind, solve the calculation, and enter the final result below.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* FINAL STAGE: EMPTY STAGE (Podium Resolution) */}
          {/* ============================================================ */}
          <section
            id="stage-card-final"
            className={`p-4 relative transition-all duration-200 ${
              currentStage === 'final'
                ? 'news-card-active border-evidence-red shadow-xl'
                : 'news-card-locked'
            }`}
          >
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-line-light">
              <span className="text-xs font-mono text-evidence-red font-bold tracking-wider uppercase">
                CASE RESOLUTION // EMPTY STAGE
              </span>
              {currentStage === 'final' && (
                <span className="rubber-stamp text-evidence-red">
                  PODIUM SPRINT
                </span>
              )}
            </div>

            <h3 className="font-serif text-xl text-ink font-bold mb-2">
              Final Destination: Empty Stage
            </h3>

            {currentStage !== 'final' ? (
              <p className="text-xs md:text-sm font-mono text-ink-soft font-semibold">
                🔒 Solve Clue 4 to unlock the final physical rendezvous
              </p>
            ) : (
              <div className="space-y-3.5 mt-2.5">
                <div className="text-sm font-mono bg-paper-inset border-l-4 border-verified-teal p-3.5 text-ink shadow-sm font-medium">
                  <span className="font-bold block mb-1 text-verified-teal text-xs tracking-wider uppercase">FINAL DIRECTIVE UNLOCKED:</span>
                  Whatever went missing that night, it didn’t stay lost for long. Get there before anyone else does.
                </div>
                <div className="newspaper-quote p-3.5 shadow-sm border border-line-light">
                  <p className="text-sm font-serif italic font-bold text-ink leading-relaxed">
                    &ldquo;Lights are down. No crowd tonight. Something’s hidden, out of sight. Three places hold what you came to find — the first to claim it leaves the rest behind.&rdquo;
                  </p>
                </div>
                <div className="detective-directive p-3.5 shadow-md">
                  <div className="font-bold text-evidence-red mb-1.5 tracking-wider uppercase text-xs">
                    PHYSICAL SPRINT REQUIRED:
                  </div>
                  <p className="text-xs md:text-sm font-mono text-ink font-semibold leading-relaxed">
                    3 hidden keys are located backstage at Empty Stage. The first 3 teams to physically bring a key to the organizers will be confirmed on the podium!
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Terminal Footer with Sign Out Button at the very bottom */}
        <footer className="pt-8 pb-4 text-center space-y-2 border-t border-line-light mt-8">
          <div>
            <button
              type="button"
              onClick={promptLogout}
              className="text-xs font-mono font-bold text-ink-soft hover:text-evidence-red hover:underline py-2 px-4 border border-line-light hover:border-evidence-red inline-flex items-center gap-1.5 transition-colors bg-paper-inset/40 active:scale-95 shadow-xs"
            >
              <span>🔒</span>
              <span>Sign Out of Terminal</span>
            </button>
          </div>
          <div className="text-[10px] font-mono text-ink-soft">
            TechnoHunt Dispatch Portal · Unit {teamCode}
          </div>
        </footer>
      </div>

      {/* Pinned Input + Submit (Mobile-Optimized Sticky Console) */}
      {currentStage !== 'final' ? (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-paper-card border-t-2 border-ink px-4 py-3 z-30 shadow-2xl pb-safe">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <label
                htmlFor="case-answer-input"
                className="text-ink-mid uppercase tracking-wider text-xs font-bold"
              >
                {currentStage === 'clue2'
                  ? 'Enter verified codeword:'
                  : currentStage === 'crewmate'
                  ? 'Enter code handed by witness:'
                  : currentStage === 'clue3'
                  ? 'Enter decrypted lead:'
                  : currentStage === 'clue4'
                  ? 'Enter final verified answer:'
                  : 'Enter answer:'}
              </label>
              {lockoutRemaining !== null ? (
                <span className="text-evidence-red font-bold text-xs animate-pulse">
                  LOCKOUT: {lockoutRemaining}s
                </span>
              ) : cooldownRemaining !== null ? (
                <span className="text-ink font-bold text-xs">
                  WAIT: {cooldownRemaining}s
                </span>
              ) : null}
            </div>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                id="case-answer-input"
                type="text"
                autoComplete="off"
                spellCheck="false"
                placeholder={
                  lockoutRemaining !== null
                    ? `Locked out (${lockoutRemaining}s)`
                    : currentStage === 'clue2'
                    ? 'Codeword from zone...'
                    : currentStage === 'crewmate'
                    ? 'Code from witness slip...'
                    : currentStage === 'clue3'
                    ? 'Decrypted lead...'
                    : currentStage === 'clue4'
                    ? 'Answer from physical card...'
                    : 'Type answer here...'
                }
                value={inputValue}
                disabled={lockoutRemaining !== null || cooldownRemaining !== null || submitting}
                onChange={(e) => setInputValue(e.target.value)}
                className={`flex-1 bg-paper border-2 px-3 py-2.5 font-mono text-base font-bold uppercase text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none transition-colors disabled:opacity-50 ${
                  justErrored ? 'border-evidence-red animate-shake' : 'border-line focus:border-ink'
                }`}
              />
              <button
                id="submit-answer-button"
                type="submit"
                disabled={
                  !inputValue.trim() ||
                  submitting ||
                  lockoutRemaining !== null ||
                  cooldownRemaining !== null
                }
                className="bg-ink text-paper px-6 py-2.5 font-mono font-bold text-sm uppercase tracking-wider hover:bg-ink-mid active:scale-95 disabled:opacity-40 transition-all shadow-md"
              >
                {submitting ? '...' : 'Submit'}
              </button>
            </div>

            {errorMsg && (
              <div
                id="submission-error"
                className="text-xs md:text-sm font-mono text-evidence-red border-l-4 border-evidence-red pl-2.5 py-1 font-bold animate-shake bg-paper-inset"
              >
                {errorMsg}
              </div>
            )}
          </form>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-paper-card border-t-2 border-evidence-red px-4 py-3 z-30 pb-safe shadow-2xl">
          <div className="text-center font-mono text-xs md:text-sm text-evidence-red py-1 font-bold">
            STAGE CLEAR // RETRIEVE BACKSTAGE KEY PHYSICALLY AT EMPTY STAGE
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal for Crewmate Photo */}
      {showImageModal && stageData.crewmate?.photo && (
        <div
          className="fixed inset-0 z-50 bg-[#14110C]/95 backdrop-blur-md flex flex-col justify-between p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="flex justify-between items-center text-paper font-mono text-xs pb-3 border-b border-paper/20">
            <span className="text-evidence-red font-bold tracking-wider">
              CASE #0426 // PERSON OF INTEREST
            </span>
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              className="px-3.5 py-1.5 bg-paper/20 hover:bg-paper/30 text-paper rounded font-mono text-xs font-bold transition-colors"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center py-4 overflow-hidden">
            <img
              src={stageData.crewmate.photo}
              alt={stageData.crewmate?.name || 'Person of Interest'}
              className="max-h-[75vh] max-w-[95vw] object-contain rounded border-2 border-paper/30 shadow-2xl"
            />
          </div>

          <div className="text-center pb-2">
            <div className="font-serif text-2xl text-paper font-bold">
              {stageData.crewmate.name || stageData.crewmate.id}
            </div>
            <div className="text-xs font-mono text-paper/70 mt-1 font-semibold">
              Tap anywhere to return to case file
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal for Active Dashboard View */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="news-card border-2 border-ink p-5 max-w-sm w-full space-y-4 shadow-2xl animate-stamp">
            <div className="flex justify-between items-center pb-2 border-b border-line-light">
              <span className="font-mono text-xs font-bold text-evidence-red uppercase tracking-wider">
                CONFIRM SIGN OUT // TERMINAL LOCK
              </span>
              <span className="text-xs font-mono font-bold text-ink-soft">
                Unit {teamCode}
              </span>
            </div>
            
            <p className="font-serif text-sm text-ink leading-relaxed font-medium">
              Are you sure you want to sign out of this case terminal? You will need your team envelope PIN to log back in.
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-3 border-2 border-ink bg-paper text-ink font-mono text-xs font-bold uppercase tracking-wider hover:bg-line/20 active:scale-95 transition-all"
              >
                Cancel / Return
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 px-3 bg-evidence-red text-paper font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
