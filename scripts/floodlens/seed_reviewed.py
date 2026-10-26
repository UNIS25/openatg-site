"""One-time, source-verified bulletin transcription. Never run on a schedule.
All listed severity/area mappings were checked against the official PDFs.
This file contains no fixtures or generated predictions.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'floodlens/data'
if (OUT/'reviewed.json').exists():raise SystemExit('Refusing to overwrite an existing reviewed snapshot. This script is only a first-release reproduction aid.')
def local(en,si,ta): return dict(en=en,si=si,ta=ta)
def groups(mapping,level=None):
    return [dict(district=d, division=n, **({'level':level} if level else {})) for d,names in mapping.items() for n in names]
bulletins = [
dict(id='kalu-20261026-01',kind='flood',title=local('Kalu River Basin','කළු ගඟ ද්‍රෝණිය','களு கங்கை ஆற்றுப் படுகை'),authority='Irrigation Department',
issuedAt='2026-10-26T11:30:00+05:30',expiresAt='2026-10-27T11:30:00+05:30',listingAt='2026-10-26T11:30:00+05:30',
url='https://www.dmc.gov.lk/images/dmcreports/Flood_warning_for_Kalu_River_Basin_-_No_01_-_2026__1792995574.pdf',
summary=local('Minor flooding is possible in low-lying parts of the Kalu floodplain in the named DS divisions. The warning does not apply uniformly to every place in a division.','නම් කළ කොට්ඨාසවල කළු ගඟ ගංවතුර තැනිතලාවේ පහත් බිම්වල සුළු ගංවතුර ඇති විය හැක. කොට්ඨාසයක සෑම ස්ථානයකටම එක සේ අදාළ නොවේ.','பெயரிடப்பட்ட பிரிவுகளில் களு கங்கை வெள்ளச் சமவெளியின் தாழ்நிலப் பகுதிகளில் சிறிய வெள்ளம் ஏற்படலாம். பிரிவின் எல்லா இடங்களுக்கும் ஒரே விதமாகப் பொருந்தாது.'),
areas=groups({'Ratnapura':['Pelmadulla','Nivithigala','Ratnapura','Kuruwita','Ayagama','Elapatha'],'Kalutara':['Ingiriya','Horana','Dodangoda','Millaniya','Bulathsinhala','Madurawala','Palindanuwara']})),
dict(id='mahaweli-20261026-01',kind='flood',title=local('Mahaweli · Pasbage Korale','මහවැලි · පස්බාගේ කෝරළේ','மகாவலி · பஸ்பாகே கோரளை'),authority='Irrigation Department',
issuedAt='2026-10-26T11:30:00+05:30',expiresAt='2026-10-27T11:30:00+05:30',listingAt='2026-10-26T11:30:00+05:30',
url='https://www.dmc.gov.lk/images/dmcreports/Flood_Warning_for_Mahaweli_River_-_No_01_-_2026__1792998739.pdf',
summary=local('Minor flood risk in low-lying areas beside the Mahaweli River within Pasbage Korale DS division. This is not a warning for the entire Mahaweli basin.','පස්බාගේ කෝරළේ කොට්ඨාසයේ මහවැලි ගඟ අසල පහත් බිම්වල සුළු ගංවතුර අවදානමක් ඇත. සම්පූර්ණ මහවැලි ද්‍රෝණිය සඳහා අනතුරු ඇඟවීමක් නොවේ.','பஸ்பாகே கோரளை பிரிவில் மகாவலி ஆற்றருகிலுள்ள தாழ்நிலப் பகுதிகளில் சிறிய வெள்ள அபாயம் உள்ளது. முழு மகாவலி ஆற்றுப் படுகைக்கான எச்சரிக்கை அல்ல.'),areas=groups({'Kandy':['Pasbage Korale']})),
dict(id='LEWM-26-10-2026-0900-31',kind='landslide',title=local('Landslide early warning','නායයෑම් පූර්ව අනතුරු ඇඟවීම','மண்சரிவு முன்னெச்சரிக்கை'),authority='NBRI / DMC',issuedAt='2026-10-26T09:00:00+05:30',expiresAt='2026-10-27T09:00:00+05:30',listingAt=None,
url='https://www.dmc.gov.lk/images/dmcreports/Landslide_EW_Report_at_0900hrs_on_2026__1792988751.pdf',
summary=local('Levels 1 (Yellow) and 2 (Amber) in named DS divisions and surrounding areas. Pay attention to susceptible slopes, valleys, cut slopes and roads. Read the original for the level in each division.','නම් කළ කොට්ඨාස සහ අවට ප්‍රදේශ සඳහා මට්ටම 1 (කහ) සහ 2 (ඇම්බර්). අවදානම් බෑවුම්, නිම්න, කපා ඇති බෑවුම් හා මාර්ග පිළිබඳ අවධානය යොමු කරන්න. කොට්ඨාසයට අදාළ මට්ටම මුල් නිවේදනයෙන් බලන්න.','பெயரிடப்பட்ட பிரிவுகளிலும் சுற்றுப்பகுதிகளிலும் நிலை 1 (மஞ்சள்), நிலை 2 (அம்பர்). அபாயமான சரிவுகள், பள்ளத்தாக்குகள், வெட்டுச் சரிவுகள், வீதிகளைக் கவனிக்கவும். ஒவ்வொரு பிரிவின் நிலைக்கும் அசல் அறிவிப்பைப் பார்க்கவும்.'),
areas=groups({'Galle':['Thawalama'],'Gampaha':['Attanagalla'],'Kalutara':['Madurawala','Beruwala','Millaniya','Horana'],'Kandy':['Udadumbara','Pasbage Korale','Udapalatha','Udunuwara'],'Kegalle':['Kegalle','Mawanella','Deraniyagala','Warakapola','Aranayake','Ruwanwella','Yatiyanthota'],'Kurunegala':['Narammala','Kurunegala'],'Ratnapura':['Kiriella','Openayake']},1)+groups({'Kalutara':['Walallawita','Bulathsinhala'],'Kegalle':['Dehiowita','Galigamuwa'],'Nuwara Eliya':['Ambagamuwa Korale','Norwood'],'Ratnapura':['Ratnapura','Kuruwita','Pelmadulla','Elapatha','Ayagama','Nivithigala']},2)),
dict(id='rain-20261026-0300',kind='rain',title=local('Heavy-rain advisory','තද වැසි නිවේදනය','கடும் மழை அறிவிப்பு'),authority='Department of Meteorology / DMC',issuedAt='2026-10-26T03:00:00+05:30',expiresAt='2026-10-27T05:30:00+05:30',listingAt='2026-10-26T03:30:00+05:30',
url='https://www.dmc.gov.lk/images/dmcreports/Advisory_for_Heavy_Rain_at_0330_hrs_on_2026__1792968291.pdf',
summary=local('Falls over 100 mm are possible in Northern, Western, Sabaragamuwa, North Western, Central and Southern provinces and Anuradhapura district. This is a rainfall advisory, not observed flood inundation.','උතුරු, බස්නාහිර, සබරගමුව, වයඹ, මධ්‍යම හා දකුණු පළාත්වල සහ අනුරාධපුර දිස්ත්‍රික්කයේ මි.මී. 100 ඉක්මවූ වැසි ඇති විය හැක. මෙය වැසි නිවේදනයකි; නිරීක්ෂිත ගංවතුර තත්ත්වයක් නොවේ.','வடக்கு, மேற்கு, சபரகமுவ, வடமேற்கு, மத்திய, தெற்கு மாகாணங்களிலும் அனுராதபுரம் மாவட்டத்திலும் 100 மி.மீ.க்கு மேல் மழை பெய்யலாம். இது மழை அறிவிப்பு; அவதானிக்கப்பட்ட வெள்ளப் பரவல் அல்ல.'),areas=[],districts=['Jaffna','Kilinochchi','Mannar','Mullaitivu','Vavuniya','Colombo','Gampaha','Kalutara','Kegalle','Ratnapura','Kurunegala','Puttalam','Kandy','Matale','Nuwara Eliya','Galle','Matara','Hambantota','Anuradhapura'])
]
river_url='https://www.dmc.gov.lk/images/dmcreports/Water_level_%26_Rainfall_2026__1792998944.pdf'
stations=[dict(name=name,basin=basin,value=value,unit='m',status=status,observedAt='2026-10-26T12:00:00+05:30',issuedAt='2026-10-26T12:30:00+05:30',url=river_url) for name,basin,value,status in [
('Holombuwa','Gurugoda Oya · Kelani',4.65,'minorRising'),('Rathnapura','Kalu Ganga',7.62,'minorRising'),('Kithulgala','Kelani Ganga',3.14,'alertRising'),('Norwood','Kehelgamu Oya · Kelani',2.26,'alertRising'),('Magura','Maguru Ganga · Kalu',4.18,'alertFalling'),('Kalawellawa (Millakanda)','Kuda Ganga · Kalu',5.92,'alertRising'),('Nawalapitiya','Mahaweli Ganga',3.93,'alertRising'),('Dunamale','Attanagalu Oya',3.41,'alertRising')]]
reservoir_url='https://docs.google.com/spreadsheets/d/e/2PACX-1vTcSGhi9RESl7CMCl1TQnrKe07Gx5Q696YiSB9jneIHqIP9lifpqSErgI3D5k9KtQXSdW5JpycIIr5e/pub?gid=1238978530&single=true&output=csv'
reservoirs=[dict(name=name,river=river,depthFeet=depth,effectiveStorageAcreFeet=storage,effectivePercent=pct,spilling=True,spillCusecs=spill,observedDate='2026-10-26',observedAt=None,url=reservoir_url) for name,river,depth,storage,pct,spill in [('Inginimitiya','Mee Oya',21.33,47168,92.75,1000),('Tabbowa','Nanneri Oya',16.10,15000,99.98,2200)]]
snapshot=dict(schemaVersion=1,reviewedAt=None,reviewMethod='Official PDFs visually checked; structured source transcription. Not an agency endorsement.',bulletins=bulletins,stations=stations,reservoirs=reservoirs)
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'reviewed.json').write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
