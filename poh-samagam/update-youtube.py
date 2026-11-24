#!/usr/bin/env python3
"""Discover current and last completed livestream, retaining last verified recording.
YouTube's /streams tab is the primary source; never claim ordinary uploads are live recordings.
"""
import json
import subprocess
import datetime
import pathlib
import sys
import time

ROOT=pathlib.Path(__file__).parent
OUT=ROOT/"youtube-status.json"
CHANNELS=[
 "https://www.youtube.com/@akaaljisahaitv1313/streams",
 "https://www.youtube.com/channel/UCDxFgFt0_TKCKZxnf7KSmNA/streams",
 "https://www.youtube.com/playlist?list=UULVDxFgFt0_TKCKZxnf7KSmNA"
]
NOW=datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00","Z")
try: old=json.loads(OUT.read_text(encoding="utf-8"))
except (FileNotFoundError,ValueError): old={}
status={"checkedAt":NOW,"live":None,"recorded":old.get("recorded"),"status":"unavailable","message":""}
def query(url,flat=False,limit=12):
    cmd=[sys.executable,"-m","yt_dlp","--dump-single-json","--skip-download","--ignore-errors","--no-warnings","--socket-timeout","20","--retries","2"]
    if flat:cmd+=["--flat-playlist","--playlist-items",f"1:{limit}"]
    else:cmd+=["--no-playlist"]
    cmd.append(url)
    proc=subprocess.run(cmd,capture_output=True,text=True,timeout=130)
    if not proc.stdout.strip():raise RuntimeError((proc.stderr or "No YouTube response")[-600:])
    try:return json.loads(proc.stdout)
    except ValueError as e:raise RuntimeError("Invalid YouTube response") from e

def video_id(entry):
    vid=entry.get("id")
    if isinstance(vid,str) and len(vid)==11:return vid
    return None

def normalize(data):
    when=data.get("release_timestamp") or data.get("timestamp")
    if when:
        when=datetime.datetime.fromtimestamp(when,datetime.timezone.utc).isoformat().replace("+00:00","Z")
    elif data.get("release_date") or data.get("upload_date"):
        v=data.get("release_date") or data.get("upload_date")
        when=f"{v[:4]}-{v[4:6]}-{v[6:]}T00:00:00Z" if len(v)==8 else None
    else:when=None
    return {"videoId":data["id"],"title":data.get("title") or "Akaal Ji Sahai TV","date":when}

def candidates():
    result=[]
    errors=[]
    for channel in CHANNELS:
        try:
            listing=query(channel,flat=True,limit=15)
            for item in listing.get("entries") or []:
                if item and video_id(item) and video_id(item) not in [x["id"] for x in result]:
                    result.append({"id":video_id(item),"title":item.get("title"),"live_status":item.get("live_status"),"date":item.get("release_date") or item.get("upload_date")})
            if result:break
        except Exception as exc:errors.append(str(exc)[:180])
    if not result:raise RuntimeError("; ".join(errors) or "No publicly accessible streams")
    return result

try:
    # Check the dedicated /live URL as well as the stream archive.
    # The /live endpoint may redirect to a video; only trust live_status=is_live.
    try:
        current=query("https://www.youtube.com/channel/UCDxFgFt0_TKCKZxnf7KSmNA/live")
        if video_id(current) and current.get("live_status")=="is_live":
            status["live"]=normalize(current)
    except Exception as exc:
        print("Direct live lookup failed:",str(exc)[:140])
    try:
        ids=candidates()
    except Exception as exc:
        print('Livestream history lookup failed:',str(exc)[:180])
        ids=[]
    completed=[]
    for item in ids[:12]:
        vid=item["id"]
        flat_state=item.get("live_status")
        if flat_state in ("is_upcoming","upcoming"):continue
        try:
            v=query("https://www.youtube.com/watch?v="+vid)
            if not video_id(v):continue
            live=v.get("live_status")
            if live=="is_live":
                status["live"]=normalize(v)
                continue
            if live in ("is_upcoming","upcoming"):continue
            # These IDs were taken ONLY from the channel's dedicated
            # Streams tab / UULV livestream playlist. YouTube sometimes
            # reports a completed stream with an empty live_status.
            if live in ("was_live","post_live") or v.get("was_live") is True or (
                (v.get("duration") or 0)>0 and live not in ("is_live","is_upcoming")
            ):
                completed.append(normalize(v))
        except Exception as exc:
            print("Cannot inspect",vid,str(exc)[:130])
            # When the detailed video endpoint is rate-limited, retain a
            # candidate proven to belong to the livestream-only list.
            if flat_state not in ("is_live","is_upcoming","upcoming"):
                when=item.get("date")
                date=when[:4]+"-"+when[4:6]+"-"+when[6:8]+"T00:00:00Z" if isinstance(when,str) and len(when)==8 else None
                completed.append({"videoId":vid,"title":item.get("title") or "Past livestream","date":date})
    if completed:
        completed.sort(key=lambda x:x.get("date") or "",reverse=True)
        status["recorded"]=completed[0]
    if status["recorded"] or status["live"]:
        status["status"]="ok"
    else:
        status["message"]="Stream tab read but no verified completed recordings identified"
except Exception as exc:
    status["message"]=str(exc)[:250]
    print("YouTube discovery issue:",status["message"])
# Keep verified recording during network failures, but no unverified 'currently live' status.
OUT.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(status,ensure_ascii=False))
