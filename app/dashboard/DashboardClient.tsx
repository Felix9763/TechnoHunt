'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SanitizedStageData } from '@/lib/round';

interface DashboardClientProps {
  teamCode: string;
  track: string;
  round: string;
  initialStage: string;
  initialStageData: SanitizedStageData;
}

const STAGES = [
  { key: 'clue2', name: 'Clue 2', prevName: 'Clue 1' },
  { key: 'crewmate', name: 'Witness', prevName: 'Clue 2' },
  { key: 'clue3', name: 'Clue 3', prevName: 'Witness' },
  { key: 'clue4', name: 'Clue 4', prevName: 'Clue 3' },
  { key: 'final', name: 'Empty Stage', prevName: 'Clue 4' },
];

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
      setErrorMsg('Connection lost. Please retry.');
      setSubmitting(false);
    }
  }

  if (roundMismatch) {
    return (
      <main className="min-h-screen bg-paper text-ink p-6 flex flex-col items-center justify-center max-w-md mx-auto text-left">
        <div className="border-2 border-evidence-red bg-paper p-6 w-full clip-case">
          <div className="font-mono text-xs text-evidence-red mb-2">NOTICE // EVENT STATE UPDATED</div>
          <h2 className="font-display text-2xl text-ink mb-3 transform -rotate-1">
            This round has ended — please log in again
          </h2>
          <p className="text-sm text-ink-soft mb-6 font-body">
            The organizer has shifted the investigation to a new phase. Your previous session credentials are no longer active.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-ink text-paper py-3 font-medium text-sm hover:bg-ink-soft transition-colors"
          >
            Submit
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink pb-36 max-w-md mx-auto">
      {/* Top Header */}
      <header className="px-4 pt-5 pb-3 border-b border-line flex justify-between items-start sticky top-0 bg-paper/95 backdrop-blur-sm z-20">
        <div>
          <div className="text-xs font-mono text-ink-soft tracking-wider">
            CASE #0426 // {round.toUpperCase()}
          </div>
          <div className="flex items-baseline space-x-2 mt-0.5">
            <span className="font-display text-xl text-ink">
              Team {teamCode}
            </span>
            <span className="text-xs font-mono text-ink-soft">
              Track {track}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-mono text-ink-soft hover:text-ink underline py-1"
        >
          Sign out
        </button>
      </header>

      {/* Case File Intro */}
      <div className="px-4 py-4">
        <div className="border border-line bg-paper/70 p-3.5 mb-5 clip-case">
          <div className="text-xs font-mono text-evidence-red mb-1">
            CASE #0426 — OPEN
          </div>
          <p className="text-xs text-ink-soft leading-relaxed font-body">
            You are no longer students. Tonight, you’re Detectives, badge and all. Something walked off campus last night. Somebody made sure of it. Somebody else nearly did too. Follow what’s left behind. Find where it ended up. Detectives — move out.
          </p>
        </div>

        {/* Evidence Log Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg tracking-tight transform rotate-0.5">
            Evidence Log
          </h2>
          <span className="text-xs font-mono text-ink-soft">
            {currentStage === 'final' ? 'FINAL LEAD' : `STAGE ${currentIndex + 1} OF 4`}
          </span>
        </div>

        {/* Sequential Evidence Log with Margin Line */}
        <div className="border-l-2 border-line pl-4 ml-1 space-y-5">
          {/* STAGE 1: CLUE 2 */}
          <section
            id="stage-card-clue2"
            className={`border p-4 relative transition-colors ${
              currentIndex > 0
                ? 'border-line bg-paper/40'
                : currentIndex === 0
                ? `border-ink bg-paper ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-flash-error' : ''}`
                : 'border-line/40 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono text-ink-soft">
                LEAD 01 // PHYSICAL TRACE
              </span>
              {currentIndex > 0 && (
                <span className="text-xs font-mono text-verified-teal font-semibold">
                  ✓ Verified
                </span>
              )}
            </div>

            <h3 className="font-display text-base text-ink mb-1">
              Clue 2: The Physical Codeword
            </h3>

            {currentIndex > 0 ? (
              <div className="text-xs font-mono text-ink-soft">
                Lead 01 cleared — Codeword verified
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {stageData.clue2?.riddle && (
                  <p className="text-xs text-ink italic bg-paper/80 p-2.5 border-l-2 border-line leading-relaxed">
                    &ldquo;{stageData.clue2.riddle}&rdquo;
                  </p>
                )}
                <div className="text-xs font-mono bg-paper/90 p-2.5 border border-line text-ink leading-relaxed">
                  <span className="font-bold text-evidence-red block mb-1">FIELD DIRECTIVE:</span>
                  Study the lead riddle above carefully to deduce the location of the scene. Search the area on site, find the hidden clue card, solve the on-site puzzle, and enter the verified codeword below.
                </div>
              </div>
            )}
          </section>

          {/* STAGE 2: CREWMATE */}
          <section
            id="stage-card-crewmate"
            className={`border p-4 relative transition-colors ${
              currentIndex > 1
                ? 'border-line bg-paper/40'
                : currentIndex === 1
                ? `border-ink bg-paper ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-flash-error' : ''}`
                : 'border-dashed border-line/60 bg-paper/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono text-ink-soft">
                LEAD 02 // WITNESS CONTACT
              </span>
              {currentIndex > 1 && (
                <span className="text-xs font-mono text-verified-teal font-semibold">
                  ✓ Verified
                </span>
              )}
            </div>

            <h3 className="font-display text-base text-ink mb-1">
              Crewmate Contact
            </h3>

            {currentIndex < 1 ? (
              <p className="text-xs font-mono text-ink-soft/75">
                Solve Clue 2 to unlock this
              </p>
            ) : currentIndex > 1 ? (
              <div className="text-xs font-mono text-ink-soft">
                Witness statement recorded — scrambled code confirmed
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {/* Crewmate Photo Card */}
                {stageData.crewmate?.photo && (
                  <div className="border-2 border-ink p-2 bg-paper/90 shadow-sm">
                    <div
                      onClick={() => setShowImageModal(true)}
                      className="relative w-full min-h-[17rem] max-h-96 bg-neutral-950 flex items-center justify-center p-2 mb-2 border border-line cursor-pointer group overflow-hidden"
                      title="Click to view full image"
                    >
                      <img
                        src={stageData.crewmate.photo}
                        alt={stageData.crewmate?.name || 'Person of Interest'}
                        className="max-h-88 w-auto max-w-full object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/85 text-white font-mono text-[10px] px-2 py-0.5 border border-white/20 backdrop-blur-sm pointer-events-none flex items-center gap-1 shadow">
                        <span>🔍 Tap to expand</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline px-0.5 mb-2">
                      <span className="font-mono text-xs font-bold text-evidence-red tracking-wide">
                        PERSON OF INTEREST
                      </span>
                      <span className="font-mono text-xs text-ink font-semibold">
                        {stageData.crewmate?.name || stageData.crewmate?.id}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="w-full py-1.5 px-3 bg-paper border border-ink text-xs font-mono font-semibold text-ink hover:bg-ink hover:text-paper transition-colors flex items-center justify-center gap-1"
                    >
                      🔍 Click to view full image
                    </button>
                  </div>
                )}

                <div className="text-xs text-ink bg-paper/80 p-2.5 border-l-2 border-evidence-red leading-relaxed">
                  <div className="font-mono text-[11px] text-evidence-red mb-1 font-semibold">
                    WITNESS STATEMENT:
                  </div>
                  {stageData.crewmate?.script ||
                    '“You found me, Detective. I saw someone out here far too late... Here — scrambled, just in case.”'}
                </div>

                <div className="text-xs font-mono bg-paper/90 p-2.5 border border-line text-ink leading-relaxed">
                  <span className="font-bold text-evidence-red block mb-1">FIELD DIRECTIVE:</span>
                  Study this photograph carefully. This person was seen moving across campus. You must locate them on foot, establish contact in character, and obtain the physical scrambled code they are carrying.
                </div>
              </div>
            )}
          </section>

          {/* STAGE 3: CLUE 3 */}
          <section
            id="stage-card-clue3"
            className={`border p-4 relative transition-colors ${
              currentIndex > 2
                ? 'border-line bg-paper/40'
                : currentIndex === 2
                ? `border-ink bg-paper ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-flash-error' : ''}`
                : 'border-dashed border-line/60 bg-paper/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono text-ink-soft">
                LEAD 03 // SCRAMBLED SIGHTING
              </span>
              {currentIndex > 2 && (
                <span className="text-xs font-mono text-verified-teal font-semibold">
                  ✓ Verified
                </span>
              )}
            </div>

            <h3 className="font-display text-base text-ink mb-1">
              Clue 3: The Scrambled Sighting
            </h3>

            {currentIndex < 2 ? (
              <p className="text-xs font-mono text-ink-soft/75">
                Solve Witness to unlock this
              </p>
            ) : currentIndex > 2 ? (
              <div className="text-xs font-mono text-ink-soft">
                Intercept deciphered — Next sector lead unlocked
              </div>
            ) : (
              <div className="space-y-2.5 mt-2">
                <p className="text-xs text-ink-soft leading-relaxed font-body">
                  The witness didn’t want to write it plain. Decrypt their dispatch intercept to discover where the suspect fled next.
                </p>
                <div className="text-xs font-mono bg-paper/90 p-3 border border-line text-ink space-y-1.5">
                  <div className="text-ink-soft text-[11px] uppercase tracking-wider font-semibold">
                    CLASSIFICATION: {stageData.clue3?.cipherType || 'ENCRYPTED DISPATCH'}
                  </div>
                  <div className="text-sm font-bold bg-line/20 p-2 border border-line text-center tracking-widest text-evidence-red">
                    {stageData.clue3?.intercept || 'ENCRYPTED DISPATCH'}
                  </div>
                  <p className="text-xs text-ink leading-relaxed pt-1 border-t border-line/50">
                    {stageData.clue3?.hint || 'Decode the intercept to reveal the next location name.'}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* STAGE 4: CLUE 4 */}
          <section
            id="stage-card-clue4"
            className={`border p-4 relative transition-colors ${
              currentIndex > 3
                ? 'border-line bg-paper/40'
                : currentIndex === 3
                ? `border-ink bg-paper ${justVerified ? 'animate-stamp' : ''} ${justErrored ? 'animate-flash-error' : ''}`
                : 'border-dashed border-line/60 bg-paper/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono text-ink-soft">
                LEAD 04 // PHYSICAL EVIDENCE
              </span>
              {currentIndex > 3 && (
                <span className="text-xs font-mono text-verified-teal font-semibold">
                  ✓ Verified
                </span>
              )}
            </div>

            <h3 className="font-display text-base text-ink mb-1">
              Clue 4: The Evidence
            </h3>

            {currentIndex < 3 ? (
              <p className="text-xs font-mono text-ink-soft/75">
                Solve Clue 3 to unlock this
              </p>
            ) : currentIndex > 3 ? (
              <div className="text-xs font-mono text-ink-soft">
                Physical evidence cleared — Final coordinates unlocked
              </div>
            ) : (
              <div className="space-y-2.5 mt-2">
                {stageData.clue3?.nextRiddle && (
                  <p className="text-xs text-ink italic bg-paper/80 p-2.5 border-l-2 border-line leading-relaxed">
                    &ldquo;{stageData.clue3.nextRiddle}&rdquo;
                  </p>
                )}
                <div className="text-xs font-mono bg-paper/90 p-2.5 border border-line text-ink leading-relaxed">
                  <span className="font-bold text-evidence-red block mb-1">FIELD DIRECTIVE:</span>
                  Decode the riddle above to determine where the suspect fled. Search the sector on site, find the hidden puzzle left behind, solve the calculation, and enter the final result below.
                </div>
              </div>
            )}
          </section>

          {/* FINAL STAGE: EMPTY STAGE */}
          <section
            id="stage-card-final"
            className={`border p-4 relative transition-colors ${
              currentStage === 'final'
                ? 'border-2 border-ink bg-paper'
                : 'border-dashed border-line/60 bg-paper/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono text-evidence-red font-semibold">
                CASE RESOLUTION // EMPTY STAGE
              </span>
            </div>

            <h3 className="font-display text-lg text-ink mb-1 transform -rotate-0.5">
              Final: Empty Stage
            </h3>

            {currentStage !== 'final' ? (
              <p className="text-xs font-mono text-ink-soft/75">
                Solve Clue 4 to unlock this
              </p>
            ) : (
              <div className="space-y-3 mt-2">
                <div className="text-xs font-mono bg-verified-teal/10 border-l-4 border-verified-teal p-3 text-ink">
                  CASE FILE UPDATED — FINAL LEAD. Whatever went missing that night, it didn’t stay lost for long. Get there before anyone else does.
                </div>
                <p className="text-sm font-body italic text-ink border-l-2 border-line pl-3 py-1">
                  Lights are down. No crowd tonight. Something’s hidden, out of sight. Three places hold what you came to find — the first to claim it leaves the rest behind.
                </p>
                <div className="text-xs font-mono bg-ink text-paper p-3">
                  <div className="font-bold mb-1">FIELD DIRECTIVE:</div>
                  3 hidden keys backstage at Empty Stage. Bring a key physically to organizers to claim 1st, 2nd, or 3rd place!
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Pinned Input + Submit (lower third of viewport) */}
      {currentStage !== 'final' ? (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-paper border-t-2 border-line px-4 py-3 z-30 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label
                htmlFor="case-answer-input"
                className="font-mono text-ink-soft uppercase tracking-wider"
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
                <span className="font-mono text-lockout-amber font-semibold">
                  LOCKOUT: {lockoutRemaining}s
                </span>
              ) : cooldownRemaining !== null ? (
                <span className="font-mono text-ink-soft">
                  COOLDOWN: {cooldownRemaining}s
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
                className="flex-1 bg-paper border-2 border-line px-3 py-2.5 font-mono text-sm text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none transition-colors disabled:opacity-50"
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
                className="bg-ink text-paper px-5 py-2.5 font-medium text-sm hover:bg-ink-soft active:translate-y-0.5 disabled:opacity-40 transition-colors"
              >
                {submitting ? 'Checking...' : 'Submit'}
              </button>
            </div>

            {errorMsg && (
              <div
                id="submission-error"
                className="text-xs font-mono text-evidence-red border-l-2 border-evidence-red pl-2 py-0.5"
              >
                {errorMsg}
              </div>
            )}
          </form>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-paper border-t-2 border-ink px-4 py-3 z-30">
          <div className="text-center font-mono text-xs text-ink py-2 font-medium">
            CASE ACTIVE AT EMPTY STAGE // PHYSICAL KEY HAND-OFF REQUIRED
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
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded font-mono text-xs transition-colors"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center py-4 overflow-hidden">
            <img
              src={stageData.crewmate.photo}
              alt={stageData.crewmate?.name || 'Person of Interest'}
              className="max-h-[75vh] max-w-[95vw] object-contain rounded border border-white/20 shadow-2xl"
            />
          </div>

          <div className="text-center pb-2">
            <div className="font-display text-lg text-white font-semibold">
              {stageData.crewmate.name || stageData.crewmate.id}
            </div>
            <div className="text-xs font-mono text-white/60 mt-1">
              Tap anywhere to return to case file
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
