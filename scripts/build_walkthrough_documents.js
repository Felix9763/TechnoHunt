const fs = require('fs');
const path = require('path');

// 1. Load Round 1 Data
const r1Stages = JSON.parse(fs.readFileSync('config/round1/stages.json', 'utf8'));
const r1Teams = JSON.parse(fs.readFileSync('config/round1/teams.json', 'utf8'));
const r1TeamMap = {};
for (const t of r1Teams) {
  r1TeamMap[t.code] = t;
}

// 2. Load Round 2 Data
const r2Stages = JSON.parse(fs.readFileSync('config/round2/stages.json', 'utf8'));
const r2Teams = JSON.parse(fs.readFileSync('config/round2/teams.json', 'utf8'));
const r2TeamMap = {};
for (const t of r2Teams) {
  r2TeamMap[t.code] = t;
}

// Parse TEAM_PATHS.md for Round 2 extra physical details
const teamPathsRaw = fs.readFileSync('planning/TEAM_PATHS.md', 'utf8');
const r2ParsedBlocks = {};
const rawBlocks = teamPathsRaw.split(/### Team /g).slice(1);
for (const b of rawBlocks) {
  const teamCode = b.split(' ')[0].trim();
  const step2PuzzleMatch = b.match(/Physical Card Puzzle[^\:]*:\*\*\s*`?([^`\n]+)`?/);
  const step3ActorMatch = b.match(/Assigned Volunteer Actor:\*\*\s*\*\*([^\*]+)\*\*/);
  const step3SlipMatch = b.match(/Physical Slip to Hand Team:\*\*\s*Paper slip with:\s*\*\*`?([^`\*\n]+)`?\*\*/);
  const step4InterceptMatch = b.match(/Intercept to Decode:\*\*\s*`?([^`\n]+)`?/);
  const step5PuzzleMatch = b.match(/Physical Evidence Puzzle[^\:]*:\*\*\s*`?([^`\n]+)`?/);

  r2ParsedBlocks[teamCode] = {
    step2Puzzle: step2PuzzleMatch ? step2PuzzleMatch[1].trim() : '',
    step3Actor: step3ActorMatch ? step3ActorMatch[1].trim() : '',
    step3Slip: step3SlipMatch ? step3SlipMatch[1].trim() : '',
    step4Intercept: step4InterceptMatch ? step4InterceptMatch[1].trim() : '',
    step5Puzzle: step5PuzzleMatch ? step5PuzzleMatch[1].trim() : '',
  };
}

// Helper to clean HTML entities
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Build Round 1 Walkthrough
function buildRound1() {
  const teams = Object.keys(r1Stages);
  let md = `# TechnoHunt — Round 1 Full Walkthrough & Physical Chits\n\n`;
  md += `**Event:** TechnoHunt Round 1  \n`;
  md += `**Total Teams:** ${teams.length} teams (Tracks A, B, C, D)  \n`;
  md += `**Format:** Physical chits, envelope clues, volunteer slips, online ciphers, and final resolution.  \n\n`;
  md += `---\n\n`;

  let htmlBody = '';

  for (const teamCode of teams) {
    const s = r1Stages[teamCode];
    const tInfo = r1TeamMap[teamCode] || { pin: 'N/A', track: teamCode[0] };

    // Clue 1 Envelope
    const c1Zone = s.clue2?.zone || '';
    const c1Riddle = s.clue2?.riddle || '';

    // Clue 2 Physical Chit
    const c2Puzzle = s.clue2?.prompt || '';
    const c2Codeword = s.clue2?.codeword || '';

    // Crewmate Slip
    const cmName = s.crewmate?.name || s.crewmate?.id || 'Crewmate';
    const cmScript = s.crewmate?.script || '';
    const cmCode = s.crewmate?.code || '';

    // Clue 3 Online Cipher
    const c3Cipher = s.clue3?.cipherType || 'Cipher Intercept';
    const c3Intercept = s.clue3?.intercept || '';
    const c3Hint = s.clue3?.hint || '';
    const c3Ans = s.clue3?.answer || '';
    const c3NextZone = s.clue3?.nextZone || s.clue4?.zone || '';

    // Clue 4 Physical Evidence
    const c4Zone = s.clue4?.zone || '';
    const c4Puzzle = s.clue4?.prompt || '';
    const c4Ans = s.clue4?.answer || '';

    // Final Stage
    const finalZone = s.final?.zone || '';
    const finalDir = s.final?.directive || '';

    // Markdown content
    md += `## Team ${teamCode} (Track ${tInfo.track}) — PIN: \`${tInfo.pin}\`\n\n`;
    md += `**Initial Destination:** ${c1Zone} | **Final Destination:** ${finalZone}\n\n`;

    md += `### ${teamCode} — CLUE 1: THE INITIAL ORDER - - physical hint\n`;
    md += `*(Inside check-in envelope handed to team at start)*\n\n`;
    md += `Case #0426 — Open. Tonight you are detectives. Follow what was left behind.\n\n`;
    md += `"${c1Riddle}"\n\n`;
    md += `**Where must you go?**  \n`;
    md += `Your answer is your first physical destination.\n\n`;
    md += `**Answer: ${c1Zone}**\n\n`;
    md += `---\n\n`;

    md += `### ${teamCode} — CLUE 2 - - physical hint\n`;
    md += `*(Physical chit taped on site at ${c1Zone})*\n\n`;
    md += `You reached ${c1Zone}!\n\n`;
    md += `"${c2Puzzle}"\n\n`;
    md += `Your answer is the secret codeword.  \n`;
    md += `Enter your answer online to see your next destination.\n\n`;
    md += `**Answer: ${c2Codeword}**\n\n`;
    md += `---\n\n`;

    md += `### ${teamCode} — CREWMATE SLIP --- given by volunteer actor (${cmName})\n`;
    md += `*(Physical slip handed over when team spots ${cmName})*\n\n`;
    md += `"${cmScript}"\n\n`;
    md += `Your secret code is: **${cmCode}**  \n`;
    md += `Enter this code online to unlock the next challenge.\n\n`;
    md += `**Answer: ${cmCode}**\n\n`;
    md += `---\n\n`;

    md += `### ${teamCode} — CLUE 3: THE SCRAMBLED SIGHTING – shown online after ${cmCode} is entered\n`;
    md += `*(Online decrypt screen)*\n\n`;
    md += `**Cipher Type:** ${c3Cipher}  \n`;
    md += `**Intercept:**\n\`\`\`\n${c3Intercept}\n\`\`\`\n`;
    if (c3Hint) md += `**Hint:** ${c3Hint}  \n`;
    md += `**Answer: ${c3Ans}**  \n`;
    md += `*(If entered correctly it reveals the 4th clue is at ${c3NextZone})*\n\n`;
    md += `---\n\n`;

    md += `### ${teamCode} — CLUE 4 - - physical hint\n`;
    md += `*(Physical evidence puzzle on site at ${c4Zone})*\n\n`;
    md += `You located the evidence at ${c4Zone}!\n\n`;
    md += `${c4Puzzle}\n\n`;
    md += `Enter your answer online to unlock the finale!\n\n`;
    md += `**Answer: ${c4Ans}**  \n`;
    md += `*(If entered correctly it unlocks the finale at ${finalZone})*\n\n`;
    md += `---\n\n`;

    md += `### ${teamCode} — FINALE: CASE RESOLUTION\n`;
    md += `**Destination:** ${finalZone}  \n`;
    md += `${finalDir}\n\n`;
    md += `========================================================================\n\n`;

    // HTML content
    htmlBody += `
    <div class="team-dossier" id="team-${esc(teamCode)}">
      <div class="team-title">
        TEAM ${esc(teamCode)} (Track ${esc(tInfo.track)}) &nbsp;|&nbsp; LOGIN PIN: ${esc(tInfo.pin)} &nbsp;|&nbsp; START: ${esc(c1Zone)} &rarr; FINAL: ${esc(finalZone)}
      </div>

      <!-- CHIT 1 -->
      <div class="chit-box">
        <div class="cut-guide">&ndash; &ndash; &ndash; &ndash; [CUT ALONG DASHED LINE FOR CHIT] &ndash; &ndash; &ndash; &ndash;</div>
        <div class="chit-header">${esc(teamCode)} &mdash; CLUE 1: THE INITIAL ORDER - - physical hint</div>
        <div class="chit-body">
          <em>(Placed inside team starting envelope)</em><br><br>
          Case #0426 &mdash; Open. Follow the trail left behind.<br><br>
          <div class="chit-prompt">&ldquo;${esc(c1Riddle)}&rdquo;</div>
          Where must you go?<br>
          Your answer is your first physical destination.
        </div>
        <div class="chit-ans">Answer: ${esc(c1Zone)}</div>
      </div>

      <!-- CHIT 2 -->
      <div class="chit-box">
        <div class="cut-guide">&ndash; &ndash; &ndash; &ndash; [CUT ALONG DASHED LINE FOR CHIT] &ndash; &ndash; &ndash; &ndash;</div>
        <div class="chit-header">${esc(teamCode)} &mdash; CLUE 2 - - physical hint</div>
        <div class="chit-body">
          <em>(Physical card taped on site at ${esc(c1Zone)})</em><br><br>
          You found the first lead at ${esc(c1Zone)}!<br><br>
          <div class="chit-prompt">&ldquo;${esc(c2Puzzle)}&rdquo;</div>
          Your answer is the secret codeword.<br>
          Enter your answer online to see your next destination.
        </div>
        <div class="chit-ans">Answer: ${esc(c2Codeword)}</div>
      </div>

      <!-- CREWMATE SLIP -->
      <div class="chit-box">
        <div class="cut-guide">&ndash; &ndash; &ndash; &ndash; [CUT ALONG DASHED LINE FOR CHIT] &ndash; &ndash; &ndash; &ndash;</div>
        <div class="chit-header">${esc(teamCode)} &mdash; CREWMATE SLIP &mdash;&mdash;&mdash; given by volunteer actor (${esc(cmName)})</div>
        <div class="chit-body">
          <em>(Physical slip handed over when team spots ${esc(cmName)})</em><br><br>
          &ldquo;${esc(cmScript)}&rdquo;<br><br>
          Your secret code is: <strong>${esc(cmCode)}</strong><br>
          Use this code online to unlock your next challenge.
        </div>
        <div class="chit-ans">Answer: ${esc(cmCode)}</div>
      </div>

      <!-- CLUE 3 ONLINE -->
      <div class="chit-box">
        <div class="chit-header">${esc(teamCode)} &mdash; CLUE 3: THE SCRAMBLED SIGHTING &ndash; shown online after ${esc(cmCode)} is entered</div>
        <div class="chit-body">
          <em>(Online decrypt interface on student mobile screen)</em><br><br>
          <strong>Cipher Protocol:</strong> ${esc(c3Cipher)}<br>
          <strong>Intercept:</strong><br>
          <div class="chit-code">${esc(c3Intercept)}</div>
          ${c3Hint ? `<strong>Hint:</strong> ${esc(c3Hint)}<br>` : ''}
          <em>Decode the transmission above to reveal where the suspect fled.</em>
        </div>
        <div class="chit-ans">Answer: ${esc(c3Ans)}</div>
        <div style="font-size: 10px; margin-top: 4px; color: #333;">&rarr; When entered correctly, website reveals 4th clue location: <strong>${esc(c3NextZone)}</strong></div>
      </div>

      <!-- CHIT 4 -->
      <div class="chit-box">
        <div class="cut-guide">&ndash; &ndash; &ndash; &ndash; [CUT ALONG DASHED LINE FOR CHIT] &ndash; &ndash; &ndash; &ndash;</div>
        <div class="chit-header">${esc(teamCode)} &mdash; CLUE 4 - - physical hint</div>
        <div class="chit-body">
          <em>(Physical evidence question taped on site at ${esc(c4Zone)})</em><br><br>
          You located the physical evidence at ${esc(c4Zone)}!<br><br>
          <div class="chit-code">${esc(c4Puzzle)}</div>
          Enter your answer online to unlock the finale!
        </div>
        <div class="chit-ans">Answer: ${esc(c4Ans)}</div>
        <div style="font-size: 10px; margin-top: 4px; color: #333;">&rarr; When entered correctly, website reveals final sprint to <strong>${esc(finalZone)}</strong></div>
      </div>

      <!-- FINALE -->
      <div class="chit-box" style="border-style: solid; border-width: 1px;">
        <div class="chit-header">${esc(teamCode)} &mdash; FINALE: CASE RESOLUTION</div>
        <div class="chit-body">
          <strong>Final Rendezvous:</strong> ${esc(finalZone)}<br>
          <strong>Directive:</strong> ${esc(finalDir)}
        </div>
      </div>
    </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TechnoHunt - Round 1 Full Walkthrough & Physical Chits</title>
<style>
  @page {
    size: A4;
    margin: 10mm 10mm 10mm 10mm;
  }
  body {
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 16px;
  }
  .print-controls {
    margin-bottom: 20px;
    padding: 12px;
    background: #f4f4f4;
    border: 1px solid #000;
    font-family: Arial, sans-serif;
  }
  .print-btn {
    padding: 6px 16px;
    font-size: 13px;
    cursor: pointer;
    background: #000;
    color: #fff;
    border: none;
    font-weight: bold;
  }
  @media print {
    .print-controls {
      display: none !important;
    }
    body {
      padding: 0;
    }
    .team-dossier {
      page-break-after: always;
      break-after: page;
    }
  }
  .team-dossier {
    border-bottom: 2px solid #000;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .team-title {
    font-size: 13px;
    font-weight: bold;
    border-bottom: 1px solid #000;
    padding-bottom: 4px;
    margin-bottom: 10px;
  }
  .chit-box {
    border: 1px dashed #333;
    padding: 8px 10px;
    margin: 8px 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .chit-header {
    font-weight: bold;
    font-size: 11px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .chit-body {
    margin: 4px 0;
  }
  .chit-prompt {
    font-style: italic;
    margin: 4px 0;
  }
  .chit-code {
    font-weight: bold;
    margin: 4px 0;
    white-space: pre-wrap;
  }
  .chit-ans {
    font-weight: bold;
    margin-top: 6px;
    font-size: 11px;
  }
  .cut-guide {
    font-size: 8px;
    color: #777;
    text-align: right;
    margin-top: -4px;
    margin-bottom: 2px;
  }
</style>
</head>
<body>
  <div class="print-controls">
    <h2 style="margin: 0 0 6px 0; font-size: 16px;">TechnoHunt &mdash; Round 1 Organizer Dossier & Physical Chits</h2>
    <p style="margin: 0 0 10px 0; font-size: 12px;">32 Teams (A1&ndash;A8, B1&ndash;B8, C1&ndash;C8, D1&ndash;D8). Ready for direct physical printing or cutting into chits. Clean low font, no background colors.</p>
    <button class="print-btn" onclick="window.print()">Print Document (Ctrl+P / Save as PDF)</button>
  </div>
  ${htmlBody}
</body>
</html>`;

  return { md, html };
}

// Build Round 2 Walkthrough
function buildRound2() {
  const teams = Object.keys(r2Stages);
  let md = `# TechnoHunt — Round 2 Full Walkthrough & Physical Chits\n\n`;
  md += `**Event:** TechnoHunt Round 2  \n`;
  md += `**Total Teams:** ${teams.length} teams (Tracks A & B, 16 teams each)  \n`;
  md += `**Format:** Physical chits, envelope clues, volunteer slips, online ciphers, and final resolution.  \n\n`;
  md += `---\n\n`;

  let htmlBody = '';

  for (const teamCode of teams) {
    const s = r2Stages[teamCode];
    const tInfo = r2TeamMap[teamCode] || { pin: 'N/A', track: teamCode[0] };
    const parsed = r2ParsedBlocks[teamCode] || {};

    // Clue 1 Envelope
    const c1Zone = s.clue2?.zone || '';
    const c1Riddle = s.clue2?.riddle || '';

    // Clue 2 Physical Card on Site
    const c2Puzzle = parsed.step2Puzzle || s.clue2?.prompt || `Decode clue to get codeword ${s.clue2?.codeword}`;
    const c2Codeword = s.clue2?.codeword || '';

    // Crewmate Slip
    const cmName = parsed.step3Actor || s.crewmate?.name || s.crewmate?.id || 'Volunteer';
    const cmScript = s.crewmate?.script || 'You found me, Detective. Take this scrambled code.';
    const cmCode = parsed.step3Slip || s.crewmate?.code || '';

    // Clue 3 Online Cipher
    const c3Cipher = s.clue3?.cipherType || 'Cipher Intercept';
    const c3Intercept = parsed.step4Intercept || s.clue3?.intercept || cmCode;
    const c3Hint = s.clue3?.hint || '';
    const c3Ans = s.clue3?.answer || '';
    const c3NextZone = s.clue3?.nextZone || s.clue4?.zone || '';

    // Clue 4 Physical Evidence
    const c4Zone = s.clue4?.zone || '';
    const c4Puzzle = parsed.step5Puzzle || s.clue4?.prompt || `Physical evidence calculation at ${c4Zone}`;
    const c4Ans = s.clue4?.answer || '';

    // Final Stage
    const finalZone = s.final?.zone || 'Empty Stage';
    const finalDir = s.final?.directive || 'Sprint to Empty Stage. First 3 teams to reach organizers win!';
    const finalRiddle = s.final?.riddle || 'Wide open plains of lush green grass harbor the spirit of sports, beside a stage where bold tales are told.';

    // Markdown content
    md += `## Team ${teamCode} (Track ${tInfo.track}) — PIN: \`${tInfo.pin}\`\n\n`;
    md += `**Initial Destination:** ${c1Zone} | **Final Destination:** ${finalZone}\n\n`;

    md += `### ${teamCode} — CLUE 1: THE INITIAL ORDER - - physical hint\n`;
    md += `*(Inside check-in envelope handed to team at start)*\n\n`;
    md += `Case #0426 — Open. Tonight you are detectives. Follow what was left behind.\n\n`;
    md += `"${c1Riddle}"\n\n`;
    md += `**Where must you go?**  \n`;
    md += `Your answer is your first physical destination.\n\n`;
    md += `**Answer: ${c1Zone}**\n\n`;
    md += `---\n\n`;

    md += `### ${teamCode} — CLUE 2 - - physical hint\n`;
    md += `*(Physical chit taped on site at ${c1Zone})*\n\n`;
    md += `You found the first lead at ${c1Zone}!\n\n`;
    md += `${c2Puzzle}\n\n`;
    md += `Your answer is the secret codeword.  \n`;
    md += `Enter your answer online to see your next destination.\n\n`;
    md += `**Answer: ${c2Codeword}**\n\n`;
    md += `---\n\n`;

    md += `### ${teamCode} — CREWMATE SLIP --- given by volunteer actor (${cmName})\n`;
    md += `*(Physical slip handed over when team spots ${cmName})*\n\n`;
    md += `"${cmScript}"\n\n`;
    md += `Your secret code is: **${cmCode}**  \n`;
    md += `Use this code online to unlock the next challenge.\n\n`;
    md += `**Answer: ${cmCode}**\n\n`;
    md += `---\n\n`;

    md += `### ${teamCode} — CLUE 3: THE SCRAMBLED SIGHTING – shown online after ${cmCode} is entered\n`;
    md += `*(Online decrypt screen)*\n\n`;
    md += `**Cipher Protocol:** ${c3Cipher}  \n`;
    md += `**Intercept:**\n\`\`\`\n${c3Intercept}\n\`\`\`\n`;
    if (c3Hint) md += `**Hint:** ${c3Hint}  \n`;
    md += `**Answer: ${c3Ans}**  \n`;
    md += `*(If entered correctly it reveals the 4th clue is at ${c3NextZone})*\n\n`;
    md += `---\n\n`;

    md += `### ${teamCode} — CLUE 4 - - physical hint\n`;
    md += `*(Physical evidence puzzle on site at ${c4Zone})*\n\n`;
    md += `You located the physical evidence at ${c4Zone}!\n\n`;
    md += `${c4Puzzle}\n\n`;
    md += `Enter your answer online to unlock the finale!\n\n`;
    md += `**Answer: ${c4Ans}**  \n`;
    md += `*(If entered correctly it unlocks the finale at ${finalZone})*\n\n`;
    md += `---\n\n`;

    md += `### ${teamCode} — FINALE: CASE RESOLUTION\n`;
    md += `**Hint Riddle:** "${finalRiddle}"  \n`;
    md += `**Final Destination:** ${finalZone}  \n`;
    md += `${finalDir}\n\n`;
    md += `========================================================================\n\n`;

    // HTML content
    htmlBody += `
    <div class="team-dossier" id="team-${esc(teamCode)}">
      <div class="team-title">
        TEAM ${esc(teamCode)} (Track ${esc(tInfo.track)}) &nbsp;|&nbsp; LOGIN PIN: ${esc(tInfo.pin)} &nbsp;|&nbsp; START: ${esc(c1Zone)} &rarr; FINAL: ${esc(finalZone)}
      </div>

      <!-- CHIT 1 -->
      <div class="chit-box">
        <div class="cut-guide">&ndash; &ndash; &ndash; &ndash; [CUT ALONG DASHED LINE FOR CHIT] &ndash; &ndash; &ndash; &ndash;</div>
        <div class="chit-header">${esc(teamCode)} &mdash; CLUE 1: THE INITIAL ORDER - - physical hint</div>
        <div class="chit-body">
          <em>(Placed inside team starting envelope)</em><br><br>
          Case #0426 &mdash; Open. Follow the trail left behind.<br><br>
          <div class="chit-prompt">&ldquo;${esc(c1Riddle)}&rdquo;</div>
          Where must you go?<br>
          Your answer is your first physical destination.
        </div>
        <div class="chit-ans">Answer: ${esc(c1Zone)}</div>
      </div>

      <!-- CHIT 2 -->
      <div class="chit-box">
        <div class="cut-guide">&ndash; &ndash; &ndash; &ndash; [CUT ALONG DASHED LINE FOR CHIT] &ndash; &ndash; &ndash; &ndash;</div>
        <div class="chit-header">${esc(teamCode)} &mdash; CLUE 2 - - physical hint</div>
        <div class="chit-body">
          <em>(Physical card taped on site at ${esc(c1Zone)})</em><br><br>
          You found the first lead at ${esc(c1Zone)}!<br><br>
          <div class="chit-code">${esc(c2Puzzle)}</div>
          Your answer is the secret codeword.<br>
          Enter your answer online to see your next destination.
        </div>
        <div class="chit-ans">Answer: ${esc(c2Codeword)}</div>
      </div>

      <!-- CREWMATE SLIP -->
      <div class="chit-box">
        <div class="cut-guide">&ndash; &ndash; &ndash; &ndash; [CUT ALONG DASHED LINE FOR CHIT] &ndash; &ndash; &ndash; &ndash;</div>
        <div class="chit-header">${esc(teamCode)} &mdash; CREWMATE SLIP &mdash;&mdash;&mdash; given by volunteer actor (${esc(cmName)})</div>
        <div class="chit-body">
          <em>(Physical slip handed over when team spots ${esc(cmName)})</em><br><br>
          &ldquo;${esc(cmScript)}&rdquo;<br><br>
          Your secret code is: <strong>${esc(cmCode)}</strong><br>
          Use this code online to unlock your next challenge.
        </div>
        <div class="chit-ans">Answer: ${esc(cmCode)}</div>
      </div>

      <!-- CLUE 3 ONLINE -->
      <div class="chit-box">
        <div class="chit-header">${esc(teamCode)} &mdash; CLUE 3: THE SCRAMBLED SIGHTING &ndash; shown online after code is entered</div>
        <div class="chit-body">
          <em>(Online decrypt interface on student mobile screen)</em><br><br>
          <strong>Cipher Protocol:</strong> ${esc(c3Cipher)}<br>
          <strong>Intercept:</strong><br>
          <div class="chit-code">${esc(c3Intercept)}</div>
          ${c3Hint ? `<strong>Hint:</strong> ${esc(c3Hint)}<br>` : ''}
          <em>Decode the transmission above to reveal where the suspect fled.</em>
        </div>
        <div class="chit-ans">Answer: ${esc(c3Ans)}</div>
        <div style="font-size: 10px; margin-top: 4px; color: #333;">&rarr; When entered correctly, website reveals 4th clue location: <strong>${esc(c3NextZone)}</strong></div>
      </div>

      <!-- CHIT 4 -->
      <div class="chit-box">
        <div class="cut-guide">&ndash; &ndash; &ndash; &ndash; [CUT ALONG DASHED LINE FOR CHIT] &ndash; &ndash; &ndash; &ndash;</div>
        <div class="chit-header">${esc(teamCode)} &mdash; CLUE 4 - - physical hint</div>
        <div class="chit-body">
          <em>(Physical evidence question taped on site at ${esc(c4Zone)})</em><br><br>
          You located the physical evidence at ${esc(c4Zone)}!<br><br>
          <div class="chit-code">${esc(c4Puzzle)}</div>
          Enter your answer online to unlock the finale!
        </div>
        <div class="chit-ans">Answer: ${esc(c4Ans)}</div>
        <div style="font-size: 10px; margin-top: 4px; color: #333;">&rarr; When entered correctly, website reveals final sprint to <strong>${esc(finalZone)}</strong></div>
      </div>

      <!-- FINALE -->
      <div class="chit-box" style="border-style: solid; border-width: 1px;">
        <div class="chit-header">${esc(teamCode)} &mdash; FINALE: CASE RESOLUTION</div>
        <div class="chit-body">
          <strong>Finale Riddle (Hint):</strong> &ldquo;${esc(finalRiddle)}&rdquo;<br>
          <strong>Final Rendezvous:</strong> ${esc(finalZone)}<br>
          <strong>Directive:</strong> ${esc(finalDir)}
        </div>
      </div>
    </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TechnoHunt - Round 2 Full Walkthrough & Physical Chits</title>
<style>
  @page {
    size: A4;
    margin: 10mm 10mm 10mm 10mm;
  }
  body {
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 16px;
  }
  .print-controls {
    margin-bottom: 20px;
    padding: 12px;
    background: #f4f4f4;
    border: 1px solid #000;
    font-family: Arial, sans-serif;
  }
  .print-btn {
    padding: 6px 16px;
    font-size: 13px;
    cursor: pointer;
    background: #000;
    color: #fff;
    border: none;
    font-weight: bold;
  }
  @media print {
    .print-controls {
      display: none !important;
    }
    body {
      padding: 0;
    }
    .team-dossier {
      page-break-after: always;
      break-after: page;
    }
  }
  .team-dossier {
    border-bottom: 2px solid #000;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .team-title {
    font-size: 13px;
    font-weight: bold;
    border-bottom: 1px solid #000;
    padding-bottom: 4px;
    margin-bottom: 10px;
  }
  .chit-box {
    border: 1px dashed #333;
    padding: 8px 10px;
    margin: 8px 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .chit-header {
    font-weight: bold;
    font-size: 11px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .chit-body {
    margin: 4px 0;
  }
  .chit-prompt {
    font-style: italic;
    margin: 4px 0;
  }
  .chit-code {
    font-weight: bold;
    margin: 4px 0;
    white-space: pre-wrap;
  }
  .chit-ans {
    font-weight: bold;
    margin-top: 6px;
    font-size: 11px;
  }
  .cut-guide {
    font-size: 8px;
    color: #777;
    text-align: right;
    margin-top: -4px;
    margin-bottom: 2px;
  }
</style>
</head>
<body>
  <div class="print-controls">
    <h2 style="margin: 0 0 6px 0; font-size: 16px;">TechnoHunt &mdash; Round 2 Organizer Dossier & Physical Chits</h2>
    <p style="margin: 0 0 10px 0; font-size: 12px;">32 Teams (A1&ndash;A16, B1&ndash;B16). Ready for direct physical printing or cutting into chits. Clean low font, no background colors.</p>
    <button class="print-btn" onclick="window.print()">Print Document (Ctrl+P / Save as PDF)</button>
  </div>
  ${htmlBody}
</body>
</html>`;

  return { md, html };
}

// Build Combined Master Print HTML
function buildCombined(r1Html, r2Html) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TechnoHunt - Master Print Center (Round 1 & Round 2)</title>
<style>
  @page {
    size: A4;
    margin: 10mm 10mm 10mm 10mm;
  }
  body {
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 16px;
  }
  .nav-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #f8f8f8;
    border: 2px solid #000;
    padding: 12px;
    margin-bottom: 20px;
    font-family: Arial, sans-serif;
  }
  .nav-btn {
    padding: 6px 14px;
    font-size: 12px;
    cursor: pointer;
    background: #000;
    color: #fff;
    border: none;
    font-weight: bold;
    margin-right: 8px;
  }
  .nav-btn.secondary {
    background: #fff;
    color: #000;
    border: 1px solid #000;
  }
  @media print {
    .nav-bar {
      display: none !important;
    }
    body {
      padding: 0;
    }
    .team-dossier {
      page-break-after: always;
      break-after: page;
    }
    .round-section.hidden-print {
      display: none !important;
    }
  }
  .team-dossier {
    border-bottom: 2px solid #000;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .team-title {
    font-size: 13px;
    font-weight: bold;
    border-bottom: 1px solid #000;
    padding-bottom: 4px;
    margin-bottom: 10px;
  }
  .chit-box {
    border: 1px dashed #333;
    padding: 8px 10px;
    margin: 8px 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .chit-header {
    font-weight: bold;
    font-size: 11px;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .chit-body {
    margin: 4px 0;
  }
  .chit-prompt {
    font-style: italic;
    margin: 4px 0;
  }
  .chit-code {
    font-weight: bold;
    margin: 4px 0;
    white-space: pre-wrap;
  }
  .chit-ans {
    font-weight: bold;
    margin-top: 6px;
    font-size: 11px;
  }
  .cut-guide {
    font-size: 8px;
    color: #777;
    text-align: right;
    margin-top: -4px;
    margin-bottom: 2px;
  }
  .round-divider {
    page-break-before: always;
    break-before: page;
    padding: 24px 0 12px 0;
    margin-bottom: 20px;
    border-bottom: 3px solid #000;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
  }
</style>
<script>
  function showAll() {
    document.getElementById('r1-section').style.display = 'block';
    document.getElementById('r2-section').style.display = 'block';
    document.getElementById('r1-section').classList.remove('hidden-print');
    document.getElementById('r2-section').classList.remove('hidden-print');
  }
  function showRound1Only() {
    document.getElementById('r1-section').style.display = 'block';
    document.getElementById('r2-section').style.display = 'none';
    document.getElementById('r1-section').classList.remove('hidden-print');
    document.getElementById('r2-section').classList.add('hidden-print');
  }
  function showRound2Only() {
    document.getElementById('r1-section').style.display = 'none';
    document.getElementById('r2-section').style.display = 'block';
    document.getElementById('r1-section').classList.add('hidden-print');
    document.getElementById('r2-section').classList.remove('hidden-print');
  }
</script>
</head>
<body>
  <div class="nav-bar">
    <div style="font-weight: bold; font-size: 15px; margin-bottom: 6px;">TechnoHunt &mdash; Master Printable Dossier & Physical Chits</div>
    <div style="font-size: 12px; margin-bottom: 10px;">Select which round you want to view/print, or print both together. Use Ctrl+P or the button below.</div>
    <div>
      <button class="nav-btn" onclick="window.print()">Print Document (Ctrl+P)</button>
      <button class="nav-btn secondary" onclick="showAll()">Show Both Rounds</button>
      <button class="nav-btn secondary" onclick="showRound1Only()">Show Round 1 Only (32 Teams)</button>
      <button class="nav-btn secondary" onclick="showRound2Only()">Show Round 2 Only (32 Teams)</button>
    </div>
  </div>

  <div id="r1-section" class="round-section">
    <div class="round-divider">ROUND 1 &mdash; 32 TEAMS (A1&ndash;A8, B1&ndash;B8, C1&ndash;C8, D1&ndash;D8)</div>
    ${r1Html}
  </div>

  <div id="r2-section" class="round-section">
    <div class="round-divider">ROUND 2 &mdash; 32 TEAMS (A1&ndash;A16, B1&ndash;B16)</div>
    ${r2Html}
  </div>
</body>
</html>`;
}

// Generate files
const r1 = buildRound1();
const r2 = buildRound2();
const combinedHtml = buildCombined(r1.html.replace(/<\/?(html|head|body)[^>]*>/gi, '').replace(/<title>.*?<\/title>/gi, ''), r2.html.replace(/<\/?(html|head|body)[^>]*>/gi, '').replace(/<title>.*?<\/title>/gi, ''));

if (!fs.existsSync('planning')) {
  fs.mkdirSync('planning', { recursive: true });
}

fs.writeFileSync('planning/walkthrough_round1.md', r1.md, 'utf8');
fs.writeFileSync('planning/walkthrough_round1.html', r1.html, 'utf8');
fs.writeFileSync('planning/walkthrough_round2.md', r2.md, 'utf8');
fs.writeFileSync('planning/walkthrough_round2.html', r2.html, 'utf8');
fs.writeFileSync('planning/all_teams_walkthrough_print.html', combinedHtml, 'utf8');

console.log('Successfully generated:');
console.log(' - planning/walkthrough_round1.md');
console.log(' - planning/walkthrough_round1.html');
console.log(' - planning/walkthrough_round2.md');
console.log(' - planning/walkthrough_round2.html');
console.log(' - planning/all_teams_walkthrough_print.html');
