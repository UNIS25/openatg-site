"""Explicit visual review update, 26 October 2026, PDF pages 1-3. Not scheduled."""
import hashlib,json
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[2];DATA=ROOT/'floodlens/data'
raw=Path('/tmp/floodlens-landslide-1445.pdf').read_bytes();assert raw.startswith(b'%PDF-')
assert hashlib.sha256(raw).hexdigest()=='29f80d780c681a9090d51c713c5642db0756ab03aa74aeb003c5a5471582aa52','Raw file differs from the visually reviewed source'
now=datetime.now(timezone.utc).isoformat();d=json.loads((DATA/'reviewed.json').read_text());w=next(w for w in d['bulletins'] if w['kind']=='landslide')
assert w['id']=='LEWM-26-10-2026-0900-31','Refusing to overwrite another reviewed bulletin'
w.update(id='LEWM-26-10-2026-1445-00',issuedAt='2026-10-26T14:45:00+05:30',expiresAt='2026-10-27T14:45:00+05:30',listingAt='2026-10-26T14:45:00+05:30',url='https://www.dmc.gov.lk/images/dmcreports/Landslide_EW_Report_at_1445hrs_on_2026__1793007485.pdf',sha256=hashlib.sha256(raw).hexdigest(),areas=[],districtCodes=[])
w['summary']={
'en':'Levels 1 (Yellow), 2 (Amber) and 3 (Red) apply to named DS divisions and surrounding areas. Level 3 names six Ratnapura district divisions. Read the original warning and the authority’s evacuation instructions for the affected areas.',
'si':'නම් කළ කොට්ඨාස සහ අවට ප්‍රදේශ සඳහා මට්ටම් 1 (කහ), 2 (ඇම්බර්) සහ 3 (රතු) අදාළය. රත්නපුර දිස්ත්‍රික්කයේ කොට්ඨාස හයක් මට්ටම 3 යටතේ ඇත. අදාළ ප්‍රදේශ සඳහා මුල් අනතුරු ඇඟවීම සහ බලධාරීන්ගේ ඉවත් වීමේ උපදෙස් කියවන්න.',
'ta':'பெயரிடப்பட்ட பிரிவுகளிலும் சுற்றுப்பகுதிகளிலும் நிலைகள் 1 (மஞ்சள்), 2 (அம்பர்), 3 (சிவப்பு) பொருந்துகின்றன. இரத்தினபுரி மாவட்டத்தின் ஆறு பிரிவுகள் நிலை 3 இல் உள்ளன. பாதிக்கப்பட்ட பகுதிகளுக்கான அசல் எச்சரிக்கையையும் அதிகாரிகளின் வெளியேற்ற அறிவுறுத்தல்களையும் படிக்கவும்.'}
level_groups={
1:{'Galle':['Karandeniya','Thawalama'],'Gampaha':['Attanagalla'],'Kalutara':['Millaniya','Ingiriya','Beruwala','Horana','Palindanuwara'],'Kandy':['Udapalatha','Udadumbara','Ganga Ihala Korale'],'Kegalle':['Ruwanwella','Warakapola','Kegalle','Mawanella','Yatiyanthota'],'Kurunegala':['Mawathagama','Narammala','Alawwa'],'Nuwara Eliya':['Kothmale West'],'Ratnapura':['Imbulpe','Weligepola','Kahawaththa','Kolonna']},
2:{'Kalutara':['Walallawita','Dodangoda','Bulathsinhala','Madurawala'],'Kandy':['Udunuwara','Pasbage Korale'],'Kegalle':['Dehiowita','Aranayake','Galigamuwa','Deraniyagala'],'Kurunegala':['Kurunegala'],'Nuwara Eliya':['Ambagamuwa Korale','Kotmale East','Norwood'],'Ratnapura':['Nivithigala','Kiriella','Balangoda','Eheliyagoda','Kalawana']},
3:{'Ratnapura':['Ratnapura','Ayagama','Pelmadulla','Kuruwita','Elapatha','Openayake']}}
catalog=json.loads((DATA/'areas.json').read_text());districts={a['names']['en']:a['code'] for a in catalog['districts']}
aliases={('Kandy','Udadumbara'):'LK2118',('Kandy','Pasbage Korale'):'LK2157',('Kegalle','Yatiyanthota'):'LK9227',('Ratnapura','Kuruwita'):'LK9106',('Ratnapura','Openayake'):'LK9121',('Ratnapura','Kahawaththa'):'LK9139',('Nuwara Eliya','Kotmale East'):'LK2303'}
exact={(a['districtCode'],a['names']['en']):a['code'] for a in catalog['divisions']}
for level,groups in level_groups.items():
 for district,names in groups.items():
  for name in names:
   code=aliases.get((district,name)) or exact[(districts[district],name)]
   w['areas'].append(dict(district=district,division=name,level=level,districtCode=districts[district],divisionCode=code))
   a=next(a for a in catalog['divisions'] if a['code']==code)
   if name!=a['names']['en'] and name not in a['aliases']:a['aliases'].append(name)
d['reviewedAt']=now
(DATA/'reviewed.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
(DATA/'areas.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n')
provenance=json.loads((DATA/'provenance.json').read_text());provenance['sources'].append(dict(id=w['id'],url=w['url'],checkedAt=now,status='ok',sha256=w['sha256'],bytes=len(raw),contentType='application/pdf',review='Visual verification of pages 1, 2 and 3; exact severity columns, original validity period and district-scoped DS aliases.',supersedes='LEWM-26-10-2026-0900-31'))
(DATA/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
print({'reviewedAt':now,'levels':{level:sum(a['level']==level for a in w['areas']) for level in level_groups},'sha256':w['sha256']})
