"""Ten exact approved data paths; normal push and explicit Pages build with an ephemeral token."""
import base64,hashlib,json,os,re,subprocess,time
from datetime import datetime,timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request,urlopen

ROOT=Path(__file__).resolve().parents[2]
REPOSITORY='UNIS25/openatg-site'
PATH='floodlens/data/reservoirs.json'
PUBLIC='https://openatg.com/'
ALLOWED={PATH,'floodlens/data/forecast/forecast.json','floodlens/data/forecast/provenance.json','floodlens/data/clouds/clouds.json','floodlens/data/clouds/provenance.json',*[f'floodlens/data/clouds/frame-{i}.png' for i in range(3)],'floodlens/data/tides/colombo.json','floodlens/data/tides/validation.json'}

def git(*args,env=None):
    return subprocess.check_output(['git',*args],cwd=ROOT,env=env,text=True).strip()

def assert_paths(paths):
    if not paths or len(set(paths))!=len(paths) or not set(paths)<=ALLOWED:raise ValueError('Publication rejected: unexpected changed paths')

def assert_regular_files(paths):
    assert_paths(paths)
    for name in paths:
        target=ROOT/name
        if target.is_symlink() or not target.is_file() or target.stat().st_size>2_000_000 or target.stat().st_mode & 0o111:raise ValueError('Unexpected file type or size')
        if any(p.is_symlink() for p in target.parents if p!=ROOT and ROOT in p.parents):raise ValueError('Symlink directory rejected')
        mode=git('ls-files','--stage','--',name).split()[0]
        if mode!='100644':raise ValueError('Only pre-existing regular data files may be published')

def validate_changed(paths):
    assert_regular_files(paths)
    for group in ['forecast','clouds','tides']:
        if any(p.startswith('floodlens/data/'+group+'/') for p in paths):
            before=ROOT/'artifacts/floodlens/publisher/baseline'/group;before.mkdir(parents=True,exist_ok=True)
            name={'forecast':'forecast.json','clouds':'clouds.json','tides':'colombo.json'}[group]
            (before/name).write_text(git('show','HEAD:floodlens/data/'+group+'/'+name))
            subprocess.run(['node','scripts/floodlens/validate_publication.mjs',group,str(ROOT/'floodlens/data'/group),str(before)],cwd=ROOT,check=True)
    if PATH in paths:
        import update_reservoirs as updater
        previous=json.loads(git('show','HEAD:'+PATH));current=json.loads((ROOT/PATH).read_text())
        if current['schemaVersion']!=1 or current['sourceUrl']!=updater.SOURCE or current['units']!=updater.UNITS:raise ValueError('Reservoir contract changed')
        if current['ingestion']['status']=='error':
            if {k:v for k,v in previous.items() if k!='ingestion'}!={k:v for k,v in current.items() if k!='ingestion'}:raise ValueError('Failed source modified last-good data')
        elif current['ingestion']['status']=='ok':
            raw=ROOT/'artifacts/floodlens/reservoir-update'/(current['sourceSha256']+'.csv')
            if hashlib.sha256(raw.read_bytes()).hexdigest()!=current['sourceSha256'] or updater.validate(raw.read_bytes(),previous,datetime.now(timezone.utc))!=current['records']:raise ValueError('Reservoir records do not match validated raw source')
        else:raise ValueError('Unexpected reservoir status')

def api(endpoint,token,method='GET'):
    url='https://api.github.com/repos/'+REPOSITORY+endpoint
    request=Request(url,data=b'{}' if method=='POST' else None,method=method,headers={
        'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'OpenATG-FloodLens-publisher'})
    with urlopen(request,timeout=30) as response:return json.load(response)

def wait_for_pages_build(commit,get,deadline,clock=time.monotonic,pause=time.sleep):
    """A duplicate failed build is not proof that every build of this commit failed.

    Poll the bounded recent history until an exact-commit success or the existing
    deadline. Never accept a newer unrelated commit, or retry a denied API call.
    """
    if not re.fullmatch(r'[a-f0-9]{40}',commit):raise ValueError('Invalid publication commit')
    saw_failed=False
    while clock()<deadline:
        history=get('/pages/builds')
        if not isinstance(history,list) or len(history)>100 or any(not isinstance(b,dict) for b in history):raise ValueError('Invalid Pages build history')
        matching=[b for b in history if b.get('commit')==commit]
        for build in matching:
            if build.get('status') not in ['queued','building','built','errored']:raise ValueError('Unknown Pages build outcome')
            if build['status']=='built':
                if not re.fullmatch(r'https://api\.github\.com/repos/'+re.escape(REPOSITORY)+r'/pages/builds/\d+',build.get('url','')):raise ValueError('Unexpected Pages build identity')
                return build
        saw_failed=saw_failed or any(b['status']=='errored' for b in matching)
        pause(min(15,max(0,deadline-clock())))
    if saw_failed:raise RuntimeError('Pages build errored; no successful build for the exact published commit confirmed before deadline')
    raise TimeoutError('Pages build for the exact published commit not confirmed before deadline')

def main():
    if os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('GITHUB_REPOSITORY')!=REPOSITORY or os.environ.get('GITHUB_REF')!='refs/heads/main':
        raise ValueError('Publisher only runs on the approved repository main workflow')
    token=os.environ['GH_TOKEN'];base=git('rev-parse','HEAD')
    paths=git('diff','--name-only','--no-renames').splitlines()
    if not paths:
        print('No changed validated data; no commit/build requested');return
    validate_changed(paths)
    if git('diff','--cached','--name-only'):raise ValueError('Unexpected pre-staged changes')
    if git('ls-files','--others','--exclude-standard'):raise ValueError('Unexpected untracked files')
    expected={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in paths}
    git('add','--',*paths);assert_paths(git('diff','--cached','--name-only').splitlines())
    if git('diff','--name-only'):raise ValueError('Unexpected unstaged changes')
    git('-c','user.name=OpenATG observation updater','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','Refresh validated Ark reservoir and weather data')
    commit=git('rev-parse','HEAD');assert_paths(git('diff-tree','--no-commit-id','--name-only','-r',commit).splitlines())
    env=os.environ.copy();env.update(GIT_CONFIG_COUNT='1',GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',GIT_CONFIG_VALUE_0='AUTHORIZATION: basic '+base64.b64encode(('x-access-token:'+token).encode()).decode())
    remote='https://github.com/'+REPOSITORY+'.git'
    if git('ls-remote',remote,'refs/heads/main',env=env).split()[0]!=base:raise ValueError('Main advanced; next scheduled run must re-fetch')
    git('push',remote,'HEAD:main',env=env)  # No force, no credential persisted.
    print(json.dumps({'publicationCommit':commit,'committedSha256':expected,'state':'pushed-awaiting-pages'}),flush=True)
    api('/pages/builds',token,'POST')
    deadline=time.monotonic()+480
    public_verified=False;public_status='pending'
    build=wait_for_pages_build(commit,lambda endpoint:api(endpoint,token),deadline)
    checks={}
    for name,digest in expected.items():
        while time.monotonic()<deadline:
            try:
                with urlopen(Request(PUBLIC+name+'?publication='+commit,headers={'Cache-Control':'no-cache'}),timeout=25) as response:raw=response.read(2_000_001)
                if hashlib.sha256(raw).hexdigest()==digest:checks[name]='hash_matched';break
            except HTTPError as error:
                if error.code in (401,403):
                    checks[name]='blocked_http_'+str(error.code)
                    print('::warning::Pages build confirmed; public edge verification denied. Separate browser verification required; no bypass attempted.')
                    break
                if error.code!=404:raise
            time.sleep(15)
        else:raise TimeoutError('Public data hash did not match committed file')
        if checks[name].startswith('blocked_'):break # Stop all edge probes after explicit denial.
    public_verified=len(checks)==len(expected) and all(v=='hash_matched' for v in checks.values())
    public_status='hash_matched' if public_verified else 'blocked_edge_browser_verification_required'
    evidence={'commit':commit,'pagesBuild':build['url'],'publicUrl':PUBLIC+'ark/','committedSha256':expected,'fileChecks':checks,'pagesBuildVerified':True,'publicHashVerified':public_verified,'publicCheck':public_status}
    print(json.dumps(evidence))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write(f"\n## Pages publication verified\n\nCommit: [{commit}](https://github.com/{REPOSITORY}/commit/{commit})\n\nPages build: {build['url']}\n\nPublic app: {PUBLIC}ark/\n\nChanged exact data paths and SHA-256: `{expected}`.\n\nPublic edge check: **{public_status}**. Public hash verified: **{public_verified}**. A blocked edge check needs separate browser verification; it is not reported as a public hash match.\n")
if __name__=='__main__':main()
