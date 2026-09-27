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
}: DashboardClientProps) {
  const router = useRouter();
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

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with initial props if revalidated by server
  useEffect(() => {
    setCurrentStage(initialStage);
  }, [initialStage]);

  useEffect(() => {
    setStageData(initialStageData);
  }, [initialStageData]);

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

  async function handleLogout() {
    triggerHaptic('tap');
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
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

  if (roundMismatch) {
    return (
      <main className="min-h-screen bg-paper text-ink p-6 flex flex-col items-center justify-center max-w-md mx-auto text-left">
        <div className="border-2 border-evidence-red bg-paper-card p-6 w-full clip-case shadow-lg">
          <div className="font-mono text-xs text-evidence-red mb-2 font-bold tracking-wider">
            NOTICE // INVESTIGATION PHASE UPDATED
          </div>
          <h2 className="font-display text-2xl text-ink mb-3 font-bold">
            This round has ended — please log in again
          </h2>
          <p className="text-sm text-ink-soft mb-6 font-body leading-relaxed font-medium">
            The organizer has shifted the investigation to a new phase. Your previous session credentials are no longer active.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-ink text-paper py-3 font-mono font-bold text-sm uppercase tracking-wider hover:bg-ink-soft active:scale-95 transition-all shadow"
          >
            Re-enter Portal
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink pb-44 max-w-md mx-auto relative select-none">
      {/* Top Header */}
      <header className="px-4 pt-4 pb-3 border-b-2 border-ink flex justify-between items-center sticky top-0 bg-paper/95 backdrop-blur-md z-20 shadow-sm">
        <div className="flex items-center gap-2.5">
          {/* Brass Paperclip Accent */}
          <svg className="w-5 h-5 text-ink shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          <div>
            <div className="text-xs font-mono text-evidence-red font-bold tracking-wider uppercase">
              CASE #0426 // {round.toUpperCase()}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-display text-xl text-ink font-bold">
                Team {teamCode}
              </span>
              <span className="text-xs font-mono bg-ink text-paper px-2 py-0.5 rounded font-bold">
                Track {track}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="text-xs font-mono text-ink font-bold hover:underline py-1 transition-colors ml-1"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Investigation Progress Stepper */}
      <div className="px-4 pt-3.5 pb-2.5 bg-paper-card border-b-2 border-line">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-ink font-bold tracking-wider">INVESTIGATION TRACK</span>
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
                className={`py-1.5 text-center font-mono text-xs border-2 transition-all ${
                  isDone
                    ? 'bg-verified-teal/20 border-verified-teal text-verified-teal font-bold'
                    : isCurrent
                    ? 'bg-ink text-paper border-ink font-bold shadow-md'
                    : 'bg-paper/50 border-line text-ink-soft/70 font-semibold'
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
        {/* Detective Briefing Notice */}
        <div className="border-2 border-ink bg-paper-card p-4 clip-case shadow-sm relative">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono text-evidence-red font-bold tracking-wider">
              FIELD BRIEFING // CLASSIFIED
            </span>
            <span className="text-xs font-mono font-bold text-ink-soft">REF: TR-89</span>
          </div>
          <p className="text-sm text-ink leading-relaxed font-body font-medium">
            You are Detectives on scene. Something walked off campus last night. Follow the physical traces, find the witnesses, decrypt their intercepts, and reach the final coordinates before time runs out.
          </p>
        </div>

        {/* Sequential Evidence Cards */}
        <div className="border-l-3 border-ink pl-3.5 ml-1 space-y-4">
          
          {/* ============================================================ */}
          {/* STAGE 1: CLUE 2 (Physical Codeword) */}
          {/* ============================================================ */}
          <section
            id="stage-card-clue2"
            className={`border-2 p-4 relative transition-all duration-200 notched-card ${
              currentIndex > 0
                ? 'border-line bg-paper-card/70'
                : currentIndex === 0
                ? `border-ink bg-paper-card shadow-md ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-flash-error' : ''}`
                : 'border-line/40 opacity-40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-ink-soft font-bold tracking-wider">
                LEAD 01 // PHYSICAL TRACE
              </span>
              {currentIndex > 0 ? (
                <span className="rubber-stamp text-verified-teal text-xs rotate-[-2deg]">
                  ✓ SOLVED
                </span>
              ) : (
                <span className="text-xs font-mono bg-evidence-red text-paper px-2 py-0.5 font-bold animate-pulse">
                  ACTIVE LEAD
                </span>
              )}
            </div>

            <h3 className="font-display text-lg text-ink font-bold mb-1.5">
              Clue 2: The Physical Codeword
            </h3>

            {currentIndex > 0 ? (
              <div className="text-sm font-mono text-verified-teal font-bold pt-1">
                ✓ Lead cleared — on-site codeword authenticated
              </div>
            ) : (
              <div className="space-y-3 mt-2.5">
                {stageData.clue2?.riddle && (
                  <div className="bg-paper border-2 border-ink p-3.5 shadow-sm">
                    <div className="text-xs font-mono text-evidence-red mb-1.5 font-bold tracking-wider">
                      LOCATION RIDDLE:
                    </div>
                    <p className="text-sm md:text-base text-ink font-serif italic font-bold leading-relaxed">
                      &ldquo;{stageData.clue2.riddle}&rdquo;
                    </p>
                  </div>
                )}
                <div className="text-xs md:text-sm font-mono bg-amber-500/15 p-3 border-2 border-amber-600/60 text-ink leading-relaxed font-medium">
                  <span className="font-bold text-evidence-red block mb-1 text-xs tracking-wider">FIELD DIRECTIVE:</span>
                  Study the lead riddle above carefully to deduce the location of the scene. Search the area on site, find the hidden clue card, solve the on-site puzzle, and enter the verified codeword below.
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* STAGE 2: CREWMATE (Witness Contact) */}
          {/* ============================================================ */}
          <section
            id="stage-card-crewmate"
            className={`border-2 p-4 relative transition-all duration-200 notched-card ${
              currentIndex > 1
                ? 'border-line bg-paper-card/70'
                : currentIndex === 1
                ? `border-ink bg-paper-card shadow-md ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-flash-error' : ''}`
                : 'border-dashed border-line/60 bg-paper-card/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-ink-soft font-bold tracking-wider">
                LEAD 02 // WITNESS CONTACT
              </span>
              {currentIndex > 1 ? (
                <span className="rubber-stamp text-verified-teal text-xs rotate-[-2deg]">
                  ✓ CONTACTED
                </span>
              ) : currentIndex === 1 ? (
                <span className="text-xs font-mono bg-evidence-red text-paper px-2 py-0.5 font-bold animate-pulse">
                  LOCATE WITNESS
                </span>
              ) : null}
            </div>

            <h3 className="font-display text-lg text-ink font-bold mb-1.5">
              Witness Contact
            </h3>

            {currentIndex < 1 ? (
              <p className="text-xs md:text-sm font-mono text-ink-soft font-semibold">
                🔒 Solve Lead 01 to unlock the witness dossier
              </p>
            ) : currentIndex > 1 ? (
              <div className="text-sm font-mono text-verified-teal font-bold pt-1">
                ✓ Witness contact confirmed — scrambled code acquired
              </div>
            ) : (
              <div className="space-y-3.5 mt-2.5">
                {/* Polaroid Photo Frame */}
                {stageData.crewmate?.photo && (
                  <div className="polaroid-frame mt-3">
                    {/* Simulated Masking Tape */}
                    <div className="masking-tape" />

                    <div
                      onClick={() => setShowImageModal(true)}
                      className="relative w-full min-h-[17rem] max-h-84 bg-neutral-950 flex items-center justify-center p-2 mb-2 border-2 border-line cursor-pointer group overflow-hidden"
                      title="Click to view full uncropped image"
                    >
                      <img
                        src={stageData.crewmate.photo}
                        alt={stageData.crewmate?.name || 'Person of Interest'}
                        className="max-h-76 w-auto max-w-full object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/90 text-white font-mono text-xs px-2.5 py-1 border border-white/30 backdrop-blur-sm pointer-events-none flex items-center gap-1.5 shadow font-bold">
                        <span>🔍 Tap to expand</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline px-0.5 mb-2.5">
                      <span className="font-mono text-xs font-bold text-evidence-red tracking-wider">
                        PERSON OF INTEREST:
                      </span>
                      <span className="font-mono text-sm text-ink font-bold">
                        {stageData.crewmate?.name || stageData.crewmate?.id}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="w-full py-2 px-3 bg-ink text-paper text-xs font-mono font-bold hover:bg-ink-soft active:scale-95 transition-all flex items-center justify-center gap-2 shadow"
                    >
                      <span>🔍</span>
                      <span>Click to view full uncropped image</span>
                    </button>
                  </div>
                )}

                {/* Witness Statement */}
                <div className="text-sm text-ink bg-paper border-l-4 border-evidence-red p-3.5 leading-relaxed shadow-sm">
                  <div className="font-mono text-xs text-evidence-red mb-1.5 font-bold tracking-wider">
                    WITNESS STATEMENT:
                  </div>
                  <p className="italic font-serif font-bold text-sm md:text-base text-ink">
                    {stageData.crewmate?.script ||
                      '“You found me, Detective. I saw someone out here far too late... Here — scrambled, just in case.”'}
                  </p>
                </div>

                {/* Field Directive */}
                <div className="text-xs md:text-sm font-mono bg-amber-500/15 p-3 border-2 border-amber-600/60 text-ink leading-relaxed font-medium">
                  <span className="font-bold text-evidence-red block mb-1 text-xs tracking-wider">FIELD DIRECTIVE:</span>
                  Study this photograph carefully. This person was seen moving across campus. You must locate them on foot, establish contact in character, and obtain the physical scrambled code they are carrying.
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* STAGE 3: CLUE 3 (The Scrambled Sighting / Cipher) */}
          {/* ============================================================ */}
          <section
            id="stage-card-clue3"
            className={`border-2 p-4 relative transition-all duration-200 notched-card ${
              currentIndex > 2
                ? 'border-line bg-paper-card/70'
                : currentIndex === 2
                ? `border-ink bg-paper-card shadow-md ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-flash-error' : ''}`
                : 'border-dashed border-line/60 bg-paper-card/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-ink-soft font-bold tracking-wider">
                LEAD 03 // SCRAMBLED SIGHTING
              </span>
              {currentIndex > 2 ? (
                <span className="rubber-stamp text-verified-teal text-xs rotate-[-2deg]">
                  ✓ DECIPHERED
                </span>
              ) : currentIndex === 2 ? (
                <span className="text-xs font-mono bg-evidence-red text-paper px-2 py-0.5 font-bold animate-pulse">
                  DECRYPT CIPHER
                </span>
              ) : null}
            </div>

            <h3 className="font-display text-lg text-ink font-bold mb-1.5">
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
                <p className="text-sm text-ink leading-relaxed font-body font-medium">
                  The witness didn’t want to write it plain. Decrypt their dispatch intercept to discover where the suspect fled next.
                </p>

                {/* High Contrast Intercept Box */}
                <div className="bg-[#101216] text-white p-4 border-2 border-line shadow-md space-y-2.5">
                  <div className="text-white/80 text-xs font-mono uppercase tracking-wider font-bold border-b border-white/20 pb-1.5">
                    CLASSIFICATION: {stageData.clue3?.cipherType || 'ENCRYPTED DISPATCH'}
                  </div>
                  <div className="text-base md:text-lg font-mono font-bold text-center tracking-widest text-evidence-red break-all py-2 bg-black/40 border border-white/10">
                    {stageData.clue3?.intercept || 'ENCRYPTED DISPATCH'}
                  </div>
                  {stageData.clue3?.hint && (
                    <div className="text-xs md:text-sm font-mono text-white pt-2 border-t border-white/20 leading-relaxed font-medium">
                      <span className="text-amber-400 font-bold">💡 DECRYPTION HINT: </span>
                      {stageData.clue3.hint}
                    </div>
                  )}
                </div>

                <div className="text-xs md:text-sm font-mono bg-amber-500/15 p-3 border-2 border-amber-600/60 text-ink leading-relaxed font-medium">
                  <span className="font-bold text-evidence-red block mb-1 text-xs tracking-wider">FIELD DIRECTIVE:</span>
                  Use the encryption hint to decipher the message above. Once decoded, submit the plaintext answer below to unlock the coordinates to the next scene.
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* STAGE 4: CLUE 4 (The Physical Evidence) */}
          {/* ============================================================ */}
          <section
            id="stage-card-clue4"
            className={`border-2 p-4 relative transition-all duration-200 notched-card ${
              currentIndex > 3
                ? 'border-line bg-paper-card/70'
                : currentIndex === 3
                ? `border-ink bg-paper-card shadow-md ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-flash-error' : ''}`
                : 'border-dashed border-line/60 bg-paper-card/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-ink-soft font-bold tracking-wider">
                LEAD 04 // PHYSICAL EVIDENCE
              </span>
              {currentIndex > 3 ? (
                <span className="rubber-stamp text-verified-teal text-xs rotate-[-2deg]">
                  ✓ SOLVED
                </span>
              ) : currentIndex === 3 ? (
                <span className="text-xs font-mono bg-evidence-red text-paper px-2 py-0.5 font-bold animate-pulse">
                  SEARCH SECTOR
                </span>
              ) : null}
            </div>

            <h3 className="font-display text-lg text-ink font-bold mb-1.5">
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
                  <div className="bg-paper border-2 border-ink p-3.5 shadow-sm">
                    <div className="text-xs font-mono text-evidence-red mb-1.5 font-bold tracking-wider">
                      NEXT SECTOR RIDDLE:
                    </div>
                    <p className="text-sm md:text-base text-ink font-serif italic font-bold leading-relaxed">
                      &ldquo;{stageData.clue3.nextRiddle}&rdquo;
                    </p>
                  </div>
                )}
                <div className="text-xs md:text-sm font-mono bg-amber-500/15 p-3 border-2 border-amber-600/60 text-ink leading-relaxed font-medium">
                  <span className="font-bold text-evidence-red block mb-1 text-xs tracking-wider">FIELD DIRECTIVE:</span>
                  Decode the riddle above to determine where the suspect fled. Search the sector on site, find the hidden puzzle left behind, solve the calculation, and enter the final result below.
                </div>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* FINAL STAGE: EMPTY STAGE (Podium Resolution) */}
          {/* ============================================================ */}
          <section
            id="stage-card-final"
            className={`border-2 p-4 relative transition-all duration-200 notched-card ${
              currentStage === 'final'
                ? 'border-evidence-red bg-paper-card shadow-xl'
                : 'border-dashed border-line/60 bg-paper-card/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-evidence-red font-bold tracking-wider uppercase">
                CASE RESOLUTION // EMPTY STAGE
              </span>
              {currentStage === 'final' && (
                <span className="rubber-stamp text-evidence-red text-xs rotate-[-2deg]">
                  PODIUM SPRINT
                </span>
              )}
            </div>

            <h3 className="font-display text-xl text-ink font-bold mb-1.5">
              Final Destination: Empty Stage
            </h3>

            {currentStage !== 'final' ? (
              <p className="text-xs md:text-sm font-mono text-ink-soft font-semibold">
                🔒 Solve Clue 4 to unlock the final physical rendezvous
              </p>
            ) : (
              <div className="space-y-3.5 mt-2.5">
                <div className="text-sm font-mono bg-verified-teal/15 border-l-4 border-verified-teal p-3.5 text-ink shadow-sm font-medium">
                  <span className="font-bold block mb-1 text-verified-teal text-xs tracking-wider">FINAL DIRECTIVE UNLOCKED:</span>
                  Whatever went missing that night, it didn’t stay lost for long. Get there before anyone else does.
                </div>
                <div className="text-sm font-body italic font-bold text-ink border-l-2 border-line pl-3 py-1 bg-paper/60">
                  &ldquo;Lights are down. No crowd tonight. Something’s hidden, out of sight. Three places hold what you came to find — the first to claim it leaves the rest behind.&rdquo;
                </div>
                <div className="text-xs md:text-sm font-mono bg-ink text-paper p-3.5 shadow-md">
                  <div className="font-bold text-evidence-red mb-1.5 tracking-wider">PHYSICAL SPRINT REQUIRED:</div>
                  3 hidden keys are located backstage at Empty Stage. The first 3 teams to physically bring a key to the organizers will be confirmed on the podium!
                </div>
              </div>
            )}
          </section>

        </div>
      </div>

      {/* Pinned Input + Submit (Mobile-Optimized Sticky Console) */}
      {currentStage !== 'final' ? (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-paper-card border-t-2 border-ink px-4 py-3 z-30 shadow-2xl pb-safe">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <label
                htmlFor="case-answer-input"
                className="text-ink uppercase tracking-wider text-xs font-bold"
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
                className={`flex-1 bg-paper border-2 px-3 py-2.5 font-mono text-base font-bold uppercase text-ink placeholder:text-ink/35 focus:border-ink focus:outline-none transition-colors disabled:opacity-50 ${
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
                className="bg-ink text-paper px-6 py-2.5 font-mono font-bold text-sm uppercase tracking-wider hover:bg-ink-soft active:scale-95 disabled:opacity-40 transition-all shadow-md"
              >
                {submitting ? '...' : 'Submit'}
              </button>
            </div>

            {errorMsg && (
              <div
                id="submission-error"
                className="text-xs md:text-sm font-mono text-evidence-red border-l-4 border-evidence-red pl-2.5 py-1 font-bold animate-shake bg-evidence-red/10"
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
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="flex justify-between items-center text-paper font-mono text-xs pb-3 border-b border-white/20">
            <span className="text-evidence-red font-bold tracking-wider">
              CASE #0426 // PERSON OF INTEREST
            </span>
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded font-mono text-xs font-bold transition-colors"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center py-4 overflow-hidden">
            <img
              src={stageData.crewmate.photo}
              alt={stageData.crewmate?.name || 'Person of Interest'}
              className="max-h-[75vh] max-w-[95vw] object-contain rounded border-2 border-white/30 shadow-2xl"
            />
          </div>

          <div className="text-center pb-2">
            <div className="font-display text-xl text-white font-bold">
              {stageData.crewmate.name || stageData.crewmate.id}
            </div>
            <div className="text-xs font-mono text-white/80 mt-1 font-semibold">
              Tap anywhere to return to case file
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
