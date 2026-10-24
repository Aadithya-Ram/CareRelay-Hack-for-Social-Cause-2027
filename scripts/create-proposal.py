from pathlib import Path
import json
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import simpleSplit
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf' / 'CareRelay-LaserHack-Proposal.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
W,H=A4
INK=HexColor('#1b3830'); GREEN=HexColor('#17634d'); MUTED=HexColor('#647b6e'); LINE=HexColor('#dce7dc'); PALE=HexColor('#f2f6ef')
c=canvas.Canvas(str(OUT),pagesize=A4)
c.setTitle('CareRelay - Dialysis Continuity Coordination')
c.setAuthor('CareRelay project')

def text(x,y,s,size=11,color=INK,bold=False):
    c.setFillColor(color); c.setFont('Helvetica-Bold' if bold else 'Helvetica',size); c.drawString(x,y,s)
def paragraph(x,y,s,width,size=10.5,leading=16,color=MUTED,bold=False):
    lines=simpleSplit(s,'Helvetica-Bold' if bold else 'Helvetica',size,width)
    for line in lines: text(x,y,line,size,color,bold);y-=leading
    return y
def rule(y):
    c.setStrokeColor(LINE);c.setLineWidth(.6);c.line(42,y,W-42,y)
def header(page,label):
    c.setFillColor(PALE);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(GREEN);c.rect(0,H-13,W,13,fill=1,stroke=0)
    text(42,H-47,'CareRelay',14,GREEN,True);text(W-177,H-47,'HEALTHTECH  /  LASERHACK',8,MUTED,True)
    rule(H-64)
    text(42,35,'Fictional prototype. Clinical requirements are supplied by staff.',8,MUTED)
    text(W-88,35,f'{page} / 2',8,MUTED)
    text(42,H-90,label,9,GREEN,True)
def section(y,title,body,width=W-84):
    text(42,y,title,15,INK,True)
    return paragraph(42,y-23,body,width)-21

header(1,'THE PROBLEM & PROPOSED SOLUTION')
text(42,H-137,'Dialysis continuity,',33,INK,True)
text(42,H-178,'coordinated.',33,GREEN,True)
y=paragraph(42,H-211,'Turn disrupted appointments into confirmed treatment arrangements - and identify the commitments or resources still missing.',W-105,13,19)
y-=26
y=section(y,'An open clinic is only one part of the answer.','When a machine breaks, staff are unavailable or a centre loses utilities, a replacement appointment needs a compatible machine, staffed treatment time, an accessible facility, suitable transport and explicit acceptance. The nearest centre may not meet those requirements.')
y=section(y,'One shared workflow for four roles.','Coordinators repair plans. Facilities verify resources and accept specific patients. Transport providers confirm suitable trips and record progress. Patients or caregivers update practical needs and record agreement. Staff verify duration, capability, priority and treatment-completion windows.')
steps=[('01','Match','Suitable slot, staffing, accessibility and funded transport.'),('02','Commit','Facility acceptance reserves the slot; provider confirms the trip.'),('03','Track','Departure, arrival, treatment start and completion are separate.'),('04','Repair','Preserve valid commitments; escalate underway failures.')]
for number,title,body in steps:
    c.setFillColor(white);c.roundRect(42,y-52,W-84,57,7,fill=1,stroke=0)
    text(56,y-16,number,15,GREEN,True);text(92,y-13,title,11,INK,True)
    paragraph(92,y-30,body,W-155,9.5,13)
    y-=66
y-=5
text(42,y,'Distinctive feature: test the next intervention.',14,INK,True)
paragraph(42,y-23,'Rerun the constraint model with one additional accessible vehicle, one staffed slot or verified reports. Show the measured change, including zero improvement when another bottleneck remains. Practice runs use independent fictional records.',W-84,10,15)
c.showPage()

def section(y,title,body,width=W-84):
    text(42,y,title,14,INK,True)
    return paragraph(42,y-21,body,width,9.5,14)-18

header(2,'TECHNICAL FEASIBILITY & DEMONSTRATION')
text(42,H-133,'A working, inspectable prototype',25,INK,True)
y=paragraph(42,H-163,'Everyday breakdown recovery and wider outages use the same coordination engine.',W-84,12,18)
y-=30
y=section(y,'Implementation','Responsive React and TypeScript application on Vinext; server API on Cloudflare Workers; persistent D1/SQLite records through Drizzle migrations. Atomic revision checks commit the reservation set and audit trail together. Private hosted access protects the demonstration workspace.')
y=section(y,'Constraint model and operational boundaries','Discrete staffed machine slots; staff-supplied treatment duration and completion deadline; facility capabilities and accessible treatment routes; vehicle suitability, caregiver seating, assistance, budget, journey timing and return to base. A bounded branch-and-bound search starts with a feasible greedy incumbent. Search-limited runs report feasible plans, not proven global optima.')
text(42,y,'Measured synthetic scenarios',15,INK,True);y-=23
rows=json.loads((ROOT/'output/evidence/benchmark.json').read_text())['rows']
lookup={r['scenario']:r for r in rows}
data=[('Verified district',lookup['All capacity verified']),('Accessible van cancelled',lookup['Accessible van cancellation']),('Staffing shortage',lookup['Fundamental capacity shortage'])]
c.setFillColor(GREEN);c.roundRect(42,y-28,W-84,30,5,fill=1,stroke=0)
for x,s in [(54,'Scenario'),(292,'Feasible'),(374,'Unresolved'),(470,'Violations')]:text(x,y-17,s,9,white,True)
y-=31
for i,(name,r) in enumerate(data):
    c.setFillColor(white if i%2==0 else PALE);c.rect(42,y-34,W-84,34,fill=1,stroke=0)
    for x,s in [(54,name),(308,str(r['feasible'])),(397,str(r['unresolved'])),(492,str(r['violations']))]:text(x,y-21,s,9.5,INK)
    y-=34
y-=15
y=paragraph(42,y,'In the verified district, a hypothetical accessible vehicle enables 2 more arrangements (24 to 26). With only one staffed machine per centre, that vehicle adds 0. Most scenarios tie the capacity-aware greedy baseline; a constructed compatibility case improves 1 to 2. These are fictional operational results, not claims of medical benefit.',W-84,9.5,14)-24
y=section(y,'Live demonstration','Start with a routine machine breakdown. Close Riverside, reconfirm Greenfield, accept patient-specific requests and confirm transport. Cancel an accessible vehicle, inspect unresolved needs, test and manually confirm a suitable funded fallback. Advance the scenario clock to demonstrate treatment completion. Export the audit trail and model evidence.')
text(42,y,'Feasibility and next validation',14,INK,True)
y=paragraph(42,y-22,'No hospital integration or model training is required for this prototype. Travel, messages and transport providers are simulated and labeled. Message extraction is rule-based, reviewed by staff. Real deployment needs coordinator interviews, clinical governance, verified road and provider data, real account authorization and privacy review.',W-84,9.5,14)
text(42,max(65,y-16),'Scope and rules: supplied CareRelay chat and LaserHack brief. Evidence: local synthetic runs.',7.5,MUTED)
c.save()
reader=PdfReader(OUT)
assert len(reader.pages)==2
for p in reader.pages: assert len(p.extract_text())>1000
print(f'Created two-page proposal: {OUT}')

