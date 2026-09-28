import json
import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

# Load Round 1 stages
with open('config/round1/stages.json', 'r', encoding='utf-8') as f:
    r1_stages = json.load(f)

# Load Round 2 stages
with open('config/round2/stages.json', 'r', encoding='utf-8') as f:
    r2_stages = json.load(f)

# Parse Round 2 TEAM_PATHS.md
with open('planning/TEAM_PATHS.md', 'r', encoding='utf-8') as f:
    team_paths_raw = f.read()

r2_parsed = {}
for block in team_paths_raw.split('### Team ')[1:]:
    team_code = block.split(' ')[0].strip()
    step2_match = re.search(r'Physical Card Puzzle[^\:]*:\*\*\s*`?([^`\n]+)`?', block)
    step3_actor_match = re.search(r'Assigned Volunteer Actor:\*\*\s*\*\*([^\*]+)\*\*', block)
    step3_slip_match = re.search(r'Physical Slip to Hand Team:\*\*\s*Paper slip with:\s*\*\*`?([^`\*\n]+)`?\*\*', block)
    step5_puzzle_match = re.search(r'Physical Evidence Puzzle[^\:]*:\*\*\s*`?([^`\n]+)`?', block)
    
    r2_parsed[team_code] = {
        'step2': step2_match.group(1).strip() if step2_match else '',
        'actor': step3_actor_match.group(1).strip() if step3_actor_match else '',
        'slip': step3_slip_match.group(1).strip() if step3_slip_match else '',
        'step5': step5_puzzle_match.group(1).strip() if step5_puzzle_match else '',
    }

def clean_html(text):
    if not text:
        return ''
    s = str(text)
    s = s.replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")
    s = s.replace('—', ' - ').replace('–', ' - ').replace('…', '...')
    s = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return s

def format_answer(ans):
    if not ans:
        return ''
    # If contains pipe, take the cleanest / primary answer
    parts = [p.strip() for p in ans.split('|')]
    return parts[0].upper() if len(parts) > 1 else ans.upper()

def get_team_chits(round_num, track_name, team_code):
    if round_num == 1:
        s = r1_stages[team_code]
        c1_zone = (s.get('clue2', {}).get('zone') or '').upper()
        c1_riddle = s.get('clue2', {}).get('riddle') or ''
        
        c2_prompt = s.get('clue2', {}).get('prompt') or ''
        c2_code = format_answer(s.get('clue2', {}).get('codeword') or '')
        
        cm_code = s.get('crewmate', {}).get('code') or ''
        
        c4_prompt = s.get('clue4', {}).get('prompt') or ''
        c4_ans = format_answer(s.get('clue4', {}).get('answer') or '')
        c4_zone = s.get('clue4', {}).get('zone') or ''
        
        # Context intros matching TrackC / reference format
        if track_name == 'TrackA':
            c1_intro = "A temporal anomaly has fractured campus time. The clockmaker left this encrypted coordinate behind:"
            c2_intro = f"You reached {c1_zone}! Taped to the sector wall, a note survives:"
            c4_intro = f"The time-dilation lock is hidden at {c4_zone}. What is printed?"
        elif track_name == 'TrackB':
            c1_intro = "The kingdom's royal vault has been breached. The ancient guards left this parchment behind:"
            c2_intro = f"You reached {c1_zone}! Hidden near the stones, an ancient riddle lies:"
            c4_intro = f"The royal treasure vault at {c4_zone} is sealed by this code. What is printed?"
        elif track_name == 'TrackC':
            c1_intro = "A priceless diamond has vanished from the museum display. The thief left nothing behind but a note:"
            c2_intro = f"You've found the spot where the clue was hidden at {c1_zone}. A folded note reads:"
            c4_intro = f"The safe holding the recovered evidence at {c4_zone} is locked behind this code. What is printed?"
        else: # TrackD
            c1_intro = "AHOY, PIRATES! The Captain has disappeared, leaving behind this first order:"
            c2_intro = f"You reached {c1_zone}! The Captain's first map piece is taped here with a riddle:"
            c4_intro = f"The Captain's treasure safe at {c4_zone} is locked behind a countdown! What is printed?"

    else: # Round 2
        s = r2_stages[team_code]
        parsed = r2_parsed.get(team_code, {})
        c1_zone = (s.get('clue2', {}).get('zone') or '').upper()
        c1_riddle = s.get('clue2', {}).get('riddle') or ''
        
        c2_prompt = parsed.get('step2') or s.get('clue2', {}).get('prompt') or f"Solve puzzle for codeword {s.get('clue2', {}).get('codeword')}"
        c2_code = format_answer(s.get('clue2', {}).get('codeword') or '')
        
        cm_code = parsed.get('slip') or s.get('crewmate', {}).get('code') or ''
        
        c4_zone = s.get('clue4', {}).get('zone') or ''
        c4_prompt = parsed.get('step5') or s.get('clue4', {}).get('prompt') or f"Physical evidence puzzle taped at {c4_zone}"
        c4_ans = format_answer(s.get('clue4', {}).get('answer') or '')
        
        if track_name == 'TrackA':
            c1_intro = "Case #0426 — The Case of the Missing Pendrive. Track the coordinator's trail:"
            c2_intro = f"You found the dropped exhibit at {c1_zone}! A recovered slip reads:"
            c4_intro = f"Physical evidence is secured at {c4_zone}. Analyze the question below:"
        else: # TrackB
            c1_intro = "Case #0426 — The Case of the Missing Pendrive. Track the debtor's flight path:"
            c2_intro = f"You arrived at {c1_zone}! A torn receipt left behind reads:"
            c4_intro = f"Physical evidence is hidden at {c4_zone}. Analyze the question below:"

    return {
        'team': team_code,
        'c1_intro': c1_intro,
        'c1_riddle': c1_riddle,
        'c1_zone': c1_zone,
        'c2_intro': c2_intro,
        'c2_prompt': c2_prompt,
        'c2_code': c2_code,
        'cm_code': cm_code,
        'c4_intro': c4_intro,
        'c4_prompt': c4_prompt,
        'c4_ans': c4_ans
    }

def generate_track_pdf(round_num, track_name, teams, output_pdf):
    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        'TrackHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        spaceAfter=8,
        spaceBefore=14
    )
    body_style = ParagraphStyle(
        'TrackBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        spaceAfter=6
    )
    riddle_style = ParagraphStyle(
        'TrackRiddle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14,
        spaceAfter=6,
        leftIndent=12
    )
    code_style = ParagraphStyle(
        'TrackCode',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=10,
        leading=13,
        spaceAfter=6,
        leftIndent=12
    )
    ans_style = ParagraphStyle(
        'TrackAns',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        spaceAfter=14
    )
    
    story = []
    
    for i, t in enumerate(teams):
        chits = get_team_chits(round_num, track_name, t)
        
        # CLUE 1 Block
        story.append(Paragraph(f"<b>{t} - CLUE 1</b>", header_style))
        story.append(Paragraph(clean_html(chits['c1_intro']), body_style))
        story.append(Paragraph(f'"{clean_html(chits["c1_riddle"])}"', riddle_style))
        story.append(Paragraph("Where must you go?", body_style))
        story.append(Paragraph(f"<b>Answer: {clean_html(chits['c1_zone'])}</b>", ans_style))
        
        # CLUE 2 Block
        story.append(Paragraph(f"<b>{t} - CLUE 2</b>", header_style))
        story.append(Paragraph(clean_html(chits['c2_intro']), body_style))
        story.append(Paragraph(f'"{clean_html(chits["c2_prompt"]).replace(chr(10), "<br/>")}"', riddle_style))
        story.append(Paragraph("Enter your answer online to see your next destination.", body_style))
        story.append(Paragraph(f"<b>Answer: {clean_html(chits['c2_code'])}</b>", ans_style))
        
        # CREWMATE CODE Block
        story.append(Paragraph(f"<b>Crewmate Code:</b>", header_style))
        story.append(Paragraph(f"<b>{clean_html(chits['cm_code'])}</b>", ans_style))
        
        # CLUE 4 Block
        story.append(Paragraph(f"<b>{t} - CLUE 4</b>", header_style))
        story.append(Paragraph(clean_html(chits['c4_intro']), body_style))
        story.append(Paragraph(clean_html(chits['c4_prompt']).replace('\n', '<br/>'), code_style))
        story.append(Paragraph("Enter the printed value online to unlock the treasure!", body_style))
        story.append(Paragraph(f"<b>Answer: {clean_html(chits['c4_ans'])}</b>", ans_style))
        
        if (i + 1) % 2 == 0 and i < len(teams) - 1:
            story.append(PageBreak())
        else:
            story.append(Spacer(1, 10))
            
    doc.build(story)
    print(f"Generated PDF: {output_pdf}")

def generate_track_html(round_num, track_name, teams, output_html):
    cards_html = ""
    for t in teams:
        c = get_team_chits(round_num, track_name, t)
        cards_html += f"""
    <!-- {t} CLUE 1 -->
    <div class="chit-block">
      <div class="chit-header">{clean_html(t)} &mdash; CLUE 1</div>
      <div class="chit-text">{clean_html(c['c1_intro'])}</div>
      <div class="chit-riddle">&ldquo;{clean_html(c['c1_riddle'])}&rdquo;</div>
      <div class="chit-text">Where must you go?</div>
      <div class="chit-ans">Answer: {clean_html(c['c1_zone'])}</div>
    </div>

    <!-- {t} CLUE 2 -->
    <div class="chit-block">
      <div class="chit-header">{clean_html(t)} &mdash; CLUE 2</div>
      <div class="chit-text">{clean_html(c['c2_intro'])}</div>
      <div class="chit-riddle">{clean_html(c['c2_prompt']).replace(chr(10), '<br>')}</div>
      <div class="chit-text">Enter your answer online to see your next destination.</div>
      <div class="chit-ans">Answer: {clean_html(c['c2_code'])}</div>
    </div>

    <!-- {t} CREWMATE CODE -->
    <div class="chit-block">
      <div class="chit-header">Crewmate Code:</div>
      <div class="chit-code">{clean_html(c['cm_code'])}</div>
    </div>

    <!-- {t} CLUE 4 -->
    <div class="chit-block">
      <div class="chit-header">{clean_html(t)} &mdash; CLUE 4</div>
      <div class="chit-text">{clean_html(c['c4_intro'])}</div>
      <div class="chit-code">{clean_html(c['c4_prompt']).replace(chr(10), '<br>')}</div>
      <div class="chit-text">Enter the printed value online to unlock the treasure!</div>
      <div class="chit-ans">Answer: {clean_html(c['c4_ans'])}</div>
    </div>
"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TechnoHunt &mdash; Round {round_num} {track_name}</title>
<style>
  @page {{
    size: A4;
    margin: 12mm 12mm 12mm 12mm;
  }}
  body {{
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 16px;
  }}
  .print-bar {{
    background: #f4f4f4;
    border: 1px solid #000;
    padding: 10px 14px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .print-btn {{
    padding: 6px 14px;
    background: #000;
    color: #fff;
    font-weight: bold;
    border: none;
    cursor: pointer;
    font-size: 12px;
  }}
  @media print {{
    .print-bar {{
      display: none !important;
    }}
    body {{
      padding: 0;
    }}
  }}
  .chit-block {{
    margin-bottom: 16px;
    page-break-inside: avoid;
    break-inside: avoid;
  }}
  .chit-header {{
    font-weight: bold;
    font-size: 13px;
    margin-bottom: 6px;
  }}
  .chit-text {{
    margin-bottom: 6px;
  }}
  .chit-riddle {{
    font-style: italic;
    margin: 6px 0;
    padding-left: 8px;
  }}
  .chit-code {{
    font-family: "Courier New", Courier, monospace;
    font-weight: bold;
    margin: 6px 0;
    padding-left: 8px;
    white-space: pre-wrap;
  }}
  .chit-ans {{
    font-weight: bold;
    margin-top: 6px;
  }}
</style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong>TechnoHunt &mdash; Round {round_num} {track_name} Physical Chits</strong>
      <span style="color: #555; margin-left: 8px;">({len(teams)} Teams)</span>
    </div>
    <button class="print-btn" onclick="window.print()">Print Track (Ctrl+P / PDF)</button>
  </div>
  {cards_html}
</body>
</html>"""

    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Generated HTML: {output_html}")

def generate_track_md(round_num, track_name, teams, output_md):
    md = f"# TechnoHunt — Round {round_num} {track_name}\n\n"
    for t in teams:
        c = get_team_chits(round_num, track_name, t)
        md += f"### {t} — CLUE 1\n\n"
        md += f"{c['c1_intro']}\n\n"
        md += f"\"{c['c1_riddle']}\"\n\n"
        md += "Where must you go?\n\n"
        md += f"**Answer: {c['c1_zone']}**\n\n"
        
        md += f"### {t} — CLUE 2\n\n"
        md += f"{c['c2_intro']}\n\n"
        md += f"{c['c2_prompt']}\n\n"
        md += "Enter your answer online to see your next destination.\n\n"
        md += f"**Answer: {c['c2_code']}**\n\n"
        
        md += f"### Crewmate Code:\n\n"
        md += f"**{c['cm_code']}**\n\n"
        
        md += f"### {t} — CLUE 4\n\n"
        md += f"{c['c4_intro']}\n\n"
        md += f"{c['c4_prompt']}\n\n"
        md += "Enter the printed value online to unlock the treasure!\n\n"
        md += f"**Answer: {c['c4_ans']}**\n\n"
        md += "---\n\n"
        
    with open(output_md, 'w', encoding='utf-8') as f:
        f.write(md)
    print(f"Generated MD: {output_md}")

# Define all 6 tracks
tracks = [
    (1, 'TrackA', [f'A{i}' for i in range(1, 9)]),
    (1, 'TrackB', [f'B{i}' for i in range(1, 9)]),
    (1, 'TrackC', [f'C{i}' for i in range(1, 9)]),
    (1, 'TrackD', [f'D{i}' for i in range(1, 9)]),
    (2, 'TrackA', [f'A{i}' for i in range(1, 17)]),
    (2, 'TrackB', [f'B{i}' for i in range(1, 17)]),
]

for round_num, track_name, teams in tracks:
    filename_base = f"Round_{round_num}_{track_name}"
    pdf_path = os.path.join('planning', f"{filename_base}.pdf")
    html_path = os.path.join('planning', f"{filename_base}.html")
    md_path = os.path.join('planning', f"{filename_base}.md")
    
    generate_track_pdf(round_num, track_name, teams, pdf_path)
    generate_track_html(round_num, track_name, teams, html_path)
    generate_track_md(round_num, track_name, teams, md_path)

print("\nALL 6 TRACK DOCUMENTS GENERATED SUCCESSFULLY!")
