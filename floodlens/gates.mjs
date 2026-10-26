const copy={en:{gates:'Reported spill gates',unknown:'Gate openings not reported in a supported format',time:'operation time not reported'},si:{gates:'වාර්තා කළ වාන් දොරටු',unknown:'වාන් දොරටු විවෘත ප්‍රමාණය තහවුරු කර නැත',time:'ක්‍රියාත්මක කළ වේලාව වාර්තා කර නැත'},ta:{gates:'பதிவான மிகைநீர் கதவுகள்',unknown:'கதவு திறப்பு அளவு உறுதிப்படுத்தப்படவில்லை',time:'இயக்க நேரம் பதிவாகவில்லை'}};
export function gateSummary(record,language='en'){
 const c=copy[language]||copy.en,g=record?.gateConfiguration;
 if(g?.status!=='reported_configuration'||!Array.isArray(g.groups)||!g.groups.length||g.groups.some(x=>!Number.isInteger(x.count)||x.count<1||x.count>20||!Number.isFinite(x.openingFeet)||x.openingFeet<=0||x.openingFeet>20)||g.groups.reduce((n,x)=>n+x.count,0)!==g.gateCount)return c.unknown;
 return c.gates+': '+g.gateCount+' ('+g.groups.map(x=>x.count+' × '+x.openingFeet+' ft').join(' + ')+'); '+c.time;
}
