// Reviewed reporting stays separate from official warnings, gauges and map geometry.
export function safeNewsSource(source){
 try{const u=new URL(source.url);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return false;
 return source.name==='Daily Mirror'&&u.hostname==='www.dailymirror.lk'&&/^\/breaking-news\/[A-Za-z0-9-]+\/108-\d+$/.test(u.pathname)||source.name==='News First'&&u.hostname==='english.newsfirst.lk'&&/^\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+$/.test(u.pathname);
 }catch{return false;}
}
export function reviewedNews(feed,districts=null,now=Date.now()){
 if(feed==null)return [];
 if(feed.schemaVersion!==1||feed.kind!=='reviewed_news_updates'||!Array.isArray(feed.updates)||feed.updates.length>30||!Number.isFinite(now))throw Error('Invalid news feed');
 const ids=new Set();return feed.updates.flatMap(x=>{
  if(!/^[a-z0-9-]{8,100}$/.test(x.id)||ids.has(x.id)||x.kind!=='media'||x.scope!=='reported_conditions_no_geometry'||!Array.isArray(x.districtCodes)||!x.districtCodes.length||x.districtCodes.some(c=>!/^LK\d{2}$/.test(c))||!x.title?.en||!x.summary?.en||!Array.isArray(x.sources)||!x.sources.length||x.sources.length>4||['geometry','coordinates','roadStatus','severity'].some(k=>k in x))throw Error('Invalid reviewed news');
  ids.add(x.id);const published=Date.parse(x.publishedAt),reviewed=Date.parse(x.reviewedAt),until=Date.parse(x.displayUntil);
  if(![published,reviewed,until].every(Number.isFinite)||reviewed<published||until<=published||until-published>24*3600000)throw Error('Invalid news timing');
  for(const source of x.sources){const at=Date.parse(source.publishedAt);if(!safeNewsSource(source)||!Number.isFinite(at)||at>published||at>reviewed||(source.sha256!==undefined&&!/^[a-f0-9]{64}$/.test(source.sha256)))throw Error('Invalid news source');}
  if(Math.max(...x.sources.map(s=>Date.parse(s.publishedAt)))!==published)throw Error('News publication mismatch');
  if(published>now||reviewed>now||until<=now||districts!==null&&!x.districtCodes.some(c=>districts.includes(c)))return [];
  return [{...x,source:x.sources.map(s=>s.name).join(' + '),url:x.sources[0].url,sourceLinks:x.sources}];
 }).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
}
