"""One-file, normal Git push + explicit legacy Pages build, using an ephemeral token."""
import base64,hashlib,json,os,subprocess,time
from pathlib import Path
from urllib.request import Request,urlopen

ROOT=Path(__file__).resolve().parents[2]
REPOSITORY='UNIS25/openatg-site'
PATH='floodlens/data/reservoirs.json'
PUBLIC='https://openatg.com/'+PATH

def git(*args,env=None):
    return subprocess.check_output(['git',*args],cwd=ROOT,env=env,text=True).strip()

def assert_paths(paths):
    if set(paths)!={PATH}:raise ValueError('Publication rejected: unexpected changed paths')

def api(endpoint,token,method='GET'):
    url='https://api.github.com/repos/'+REPOSITORY+endpoint
    request=Request(url,data=b'{}' if method=='POST' else None,method=method,headers={
        'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'OpenATG-FloodLens-publisher'})
    with urlopen(request,timeout=30) as response:return json.load(response)

def main():
    if os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('GITHUB_REPOSITORY')!=REPOSITORY or os.environ.get('GITHUB_REF')!='refs/heads/main':
        raise ValueError('Publisher only runs on the approved repository main workflow')
    token=os.environ['GH_TOKEN'];base=git('rev-parse','HEAD')
    assert_paths(git('diff','--name-only').splitlines())
    if git('diff','--cached','--name-only'):raise ValueError('Unexpected pre-staged changes')
    if git('ls-files','--others','--exclude-standard'):raise ValueError('Unexpected untracked files')
    git('add','--',PATH);assert_paths(git('diff','--cached','--name-only').splitlines())
    if git('diff','--name-only'):raise ValueError('Unexpected unstaged changes')
    git('-c','user.name=OpenATG observation updater','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','Refresh validated FloodLens reservoir observations')
    commit=git('rev-parse','HEAD');assert_paths(git('diff-tree','--no-commit-id','--name-only','-r',commit).splitlines())
    env=os.environ.copy();env.update(GIT_CONFIG_COUNT='1',GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',GIT_CONFIG_VALUE_0='AUTHORIZATION: basic '+base64.b64encode(('x-access-token:'+token).encode()).decode())
    remote='https://github.com/'+REPOSITORY+'.git'
    if git('ls-remote',remote,'refs/heads/main',env=env).split()[0]!=base:raise ValueError('Main advanced; next scheduled run must re-fetch')
    git('push',remote,'HEAD:main',env=env)  # No force, no credential persisted.
    api('/pages/builds',token,'POST')
    expected=hashlib.sha256((ROOT/PATH).read_bytes()).hexdigest()
    deadline=time.monotonic()+480;build=None
    while time.monotonic()<deadline:
        latest=api('/pages/builds/latest',token)
        if latest.get('commit')==commit:
            if latest.get('status')=='errored':raise RuntimeError('Pages build failed')
            if latest.get('status')=='built':build=latest;break
        time.sleep(15)
    if not build:raise TimeoutError('Pages build for published commit not confirmed')
    while time.monotonic()<deadline:
        try:
            with urlopen(Request(PUBLIC+'?publication='+commit,headers={'Cache-Control':'no-cache'}),timeout=25) as response:
                raw=response.read(2*1024*1024)
            if hashlib.sha256(raw).hexdigest()==expected:break
        except Exception:pass
        time.sleep(15)
    else:raise TimeoutError('Public data hash did not match committed file')
    evidence={'commit':commit,'pagesBuild':build['url'],'publicUrl':PUBLIC,'publicSha256':expected,'verified':True}
    print(json.dumps(evidence))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write(f"\n## Publication verified\n\nCommit: [{commit}](https://github.com/{REPOSITORY}/commit/{commit})\n\nPages build: {build['url']}\n\nPublic file: {PUBLIC}\n\nPublic SHA-256 matched: `{expected}`.\n")
if __name__=='__main__':main()
