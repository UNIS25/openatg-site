import copy,csv,io,json,sys,unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/floodlens'))
import update_reservoirs as updater
from publish_reservoirs import assert_paths,PATH

class ObservationUpdater(unittest.TestCase):
 def setUp(self):
  self.before=json.loads((ROOT/PATH).read_text());self.now=datetime.now(timezone.utc)
  self.rows=[]
  fields={'depthFeet':'Water Depth_ft','effectiveStorageAcreFeet':'Effective Storage_Acft','grossStorageAcreFeet':'Gross Storage_Acft','effectivePercent':'Effective Storage_per','spillCusecs':'Spilling_Cusec','previousDayRainfallMm':'Rainfall_Preceding Day_mm'}
  for r in self.before['records']:
   row={k:'' for k in updater.HEADERS};row.update(Reservoir=r['name'],Range=r['range'],Spilling={True:'Yes',False:'No',None:''}[r['spilling']])
   for key,column in [('observedDate','Date'),('updatedDate','Update Date')]:row[column]=datetime.fromisoformat(r[key]).strftime('%m/%d/%Y') if r[key] else '#REF!'
   for key,column in fields.items():row[column]='' if r[key] is None else str(r[key])
   self.rows.append(row)
 def raw(self,rows=None,headers=None):
  out=io.StringIO();writer=csv.DictWriter(out,fieldnames=headers or updater.HEADERS);writer.writeheader();writer.writerows(rows if rows is not None else self.rows);return out.getvalue().encode()
 def test_valid_snapshot_retains_dates_units_and_hash(self):
  raw=self.raw();result=updater.update(self.before,lambda url:(raw,'text/csv',url),self.now)
  self.assertEqual(result['ingestion']['status'],'ok');self.assertEqual(result['records'],self.before['records']);self.assertEqual(result['units']['depthFeet'],'ft');self.assertTrue(all(r['observedAt'] is None for r in result['records']))
 def test_source_failure_preserves_prior_values_and_freshness(self):
  def unavailable(url):raise TimeoutError()
  result=updater.update(self.before,unavailable,self.now)
  for field in ['records','sourceSha256','retrievedAt']:self.assertEqual(result[field],self.before[field])
  self.assertEqual(result['ingestion']['status'],'error');self.assertEqual(result['ingestion']['lastAttemptAt'],self.now.isoformat())
 def test_malformed_source_is_published_only_as_failure_metadata(self):
  result=updater.update(self.before,lambda url:(b'<html>error</html>','text/html',url),self.now)
  self.assertEqual(result['ingestion']['status'],'error');self.assertEqual(result['records'],self.before['records'])
 def test_schema_units_and_missing_duplicate_or_new_records_rejected(self):
  with self.assertRaises(ValueError):updater.validate(self.raw().replace(b'Water Depth_ft',b'Water Depth_m'),self.before,self.now)
  for rows in [self.rows[:-1],self.rows+[self.rows[0]],self.rows+[dict(self.rows[0],Reservoir='Unreviewed reservoir')]]:
   with self.assertRaises(ValueError):updater.validate(self.raw(rows),self.before,self.now)
 def test_future_and_regressed_dates_rejected(self):
  for date in [(self.now+timedelta(days=2)).strftime('%m/%d/%Y'),'01/01/2000']:
   rows=copy.deepcopy(self.rows);rows[0]['Date']=date
   with self.assertRaises(ValueError):updater.validate(self.raw(rows),self.before,self.now)
 def test_unknown_stays_unknown_and_no_numeric_default_is_invented(self):
  records=updater.validate(self.raw(),self.before,self.now)
  self.assertEqual(sum(r['observedDate'] is None for r in records),sum(r['observedDate'] is None for r in self.before['records']))
  for key in ['spillCusecs','depthFeet','effectivePercent']:
   self.assertEqual(sum(r[key] is None for r in records),sum(r[key] is None for r in self.before['records']))
 def test_out_of_range_values_and_changed_identity_rejected(self):
  for field,value in [('Effective Storage_per','999'),('Spilling_Cusec','-1'),('Range','New identity')]:
   rows=copy.deepcopy(self.rows);rows[0][field]=value
   with self.assertRaises(ValueError):updater.validate(self.raw(rows),self.before,self.now)
 def test_exact_single_path_allowlist(self):
  assert_paths([PATH])
  for paths in [[],[PATH,'.github/workflows/other.yml'],['floodlens/data/reviewed.json'],['floodlens/data/../app.mjs']]:
   with self.assertRaises(ValueError):assert_paths(paths)
if __name__=='__main__':unittest.main()
