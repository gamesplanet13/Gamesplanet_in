#!/usr/bin/env python3
"""Update last completed livestream and currently broadcasting video for Akaal Ji Sahai TV.
Non-authoritative YouTube extraction; failure preserves last recorded entry.
"""
import json, subprocess, datetime, pathlib, sys

OUT=pathlib.Path(__file__).with_name("youtube-status.json")
CHANNEL="https://www.youtube.com/@akaaljisahaitv1313/streams"
now=datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00","Z")
try:
    old=json.loads(OUT.read_text(encoding="utf-8"))
except (FileNotFoundError,ValueError):
    old={}
status={"checkedAt":now,"live":None,"recorded":old.get("recorded"),"status":"unavailable"}
def extract(url, flat=False):
    args=[sys.executable,"-m","yt_dlp","-J","--no-warnings","--no-playlist","--skip-download",url]
    if flat: args += ["--flat-playlist","--playlist-items","1:12"]
    else: args += ["--socket-timeout","12"]
    p=subprocess.run(args,capture_output=True,text=True,timeout=100)
    if p.returncode: raise RuntimeError(p.stderr[-550:])
    return json.loads(p.stdout)
def candidate(entry):
    vid=entry.get("id") or entry.get("url","").split("v=")[-1]
    if not isinstance(vid,str) or len(vid)!=11: return None
    return vid
def normalize(v):
    date=v.get("release_timestamp") or v.get("timestamp")
    if date:
        date=datetime.datetime.fromtimestamp(date,datetime.timezone.utc).isoformat().replace("+00:00","Z")
    elif v.get("upload_date") and len(v["upload_date"])==8:
        d=v["upload_date"];date=f"{d[:4]}-{d[4:6]}-{d[6:]}T00:00:00Z"
    else: date=None
    return {"videoId":v["id"],"title":v.get("title") or "Akaal Ji Sahai TV","date":date}
try:
    # Process actual /streams tab, not the general channel videos (so fallback is a recorded LIVE).
    args=[sys.executable,"-m","yt_dlp","-J","--flat-playlist","--playlist-items","1:12","--skip-download","--no-warnings",CHANNEL]
    p=subprocess.run(args,capture_output=True,text=True,timeout=110)
    if p.returncode: raise RuntimeError(p.stderr[-700:])
    listing=json.loads(p.stdout)
    entries=listing.get("entries") or []
    complete=[]
    for item in entries[:8]:
        if not item: continue
        vid=candidate(item)
        if not vid: continue
        try: meta=extract("https://www.youtube.com/watch?v="+vid)
        except Exception as err: print("skip",vid,str(err)[:150]);continue
        state=meta.get("live_status")
        if state=="is_live":
            status["live"]=normalize(meta)
        elif state in ("was_live","post_live") or (meta.get("was_live") and state=="not_live"):
            complete.append(normalize(meta))
        if status["live"] and complete: break
    if complete:
        # Stream tab entries usually newest first; prefer actual timestamps where available.
        complete.sort(key=lambda x:x.get("date") or "",reverse=True)
        status["recorded"]=complete[0]
    status["status"]="ok"
except Exception as err:
    print("YouTube check failed:",str(err)[:500])
# Persist last recorded stream; don't falsely label an old Live as currently live.
OUT.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(status,ensure_ascii=False))
