#!/usr/bin/env python3
"""Refresh the current and newest completed public channel livestream."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen

OUT = Path(__file__).with_name("youtube-status.json")
CHANNEL_ID = "UCDxFgFt0_TKCKZxnf7KSmNA"
YOUTUBE = "https://www.youtube.com"
CHANNEL = f"{YOUTUBE}/channel/{CHANNEL_ID}"
ARCHIVE = f"{YOUTUBE}/playlist?list=UULV{CHANNEL_ID[2:]}"
VIDEO_ID = re.compile(r"[A-Za-z0-9_-]{11}")
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36"


def fetch(url):
    request = Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    with urlopen(request, timeout=12) as response:
        return response.read().decode("utf-8")


def embedded_json(page, name):
    for marker in re.finditer(r'(?:var\s+|window\["?)?' + name + r'(?:"\])?\s*=\s*(?=\{)', page):
        try:
            return json.JSONDecoder().raw_decode(page, marker.end())[0]
        except ValueError:
            continue
    return {}


def nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from nodes(child)


def source_ids(page):
    seen = set()
    for node in nodes(embedded_json(page, "ytInitialData").get("contents", {})):
        for key in ("lockupViewModel", "videoRenderer", "gridVideoRenderer", "playlistVideoRenderer"):
            item = node.get(key)
            if not isinstance(item, dict):
                continue
            video_id = item.get("videoId") or item.get("contentId")
            if isinstance(video_id, str) and VIDEO_ID.fullmatch(video_id) and video_id not in seen:
                seen.add(video_id)
                yield video_id


def stream_metadata(page, expected_id=None):
    player = embedded_json(page, "ytInitialPlayerResponse")
    details = player.get("videoDetails", {})
    metadata = player.get("microformat", {}).get("playerMicroformatRenderer", {})
    broadcast = metadata.get("liveBroadcastDetails") or {}
    video_id = details.get("videoId") or expected_id
    if (not isinstance(video_id, str) or not VIDEO_ID.fullmatch(video_id)
            or details.get("channelId") != CHANNEL_ID
            or expected_id and video_id != expected_id):
        return None
    if broadcast.get("isLiveNow") is True or details.get("isLive") is True:
        state = "live"
    elif broadcast.get("endTimestamp"):
        state = "recorded"
    else:
        return None
    return state, {
        "videoId": video_id,
        "title": details.get("title") or "Akaal Ji Sahai TV",
        "date": broadcast.get("startTimestamp") or metadata.get("publishDate"),
        "endedAt": broadcast.get("endTimestamp"),
    }


def safe_fetch(url):
    try:
        return fetch(url)
    except (OSError, ValueError) as exc:
        print(f"YouTube request failed for {url}: {exc}")
        return ""


def timestamp(value):
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError, AttributeError):
        return 0


def refresh(old):
    with ThreadPoolExecutor(max_workers=8) as pool:
        direct, streams = pool.map(safe_fetch, (f"{CHANNEL}/live?hl=en", f"{CHANNEL}/streams?hl=en"))
        ids = list(source_ids(streams)) or list(source_ids(direct))
        if not ids:
            ids = list(source_ids(safe_fetch(ARCHIVE)))
        ids = ids[:8]
        pages = pool.map(safe_fetch, (f"{YOUTUBE}/watch?v={video_id}&hl=en" for video_id in ids))
        found = [stream_metadata(direct)]
        found.extend(stream_metadata(page, video_id) for video_id, page in zip(ids, pages))
    live = [item for result in found if result for state, item in (result,) if state == "live"]
    recordings = [item for result in found if result for state, item in (result,) if state == "recorded"]
    if old.get("recorded"):
        recordings.append(old["recorded"])
    return {
        "checkedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "live": max(live, key=lambda item: timestamp(item.get("date")), default=None),
        "recorded": max(recordings, key=lambda item: timestamp(item.get("endedAt") or item.get("date")), default=None),
        "status": "ok" if any(found) else "unavailable",
        "message": "" if any(found) else "YouTube did not return verifiable live or replay metadata",
    }


if __name__ == "__main__":
    try:
        old = json.loads(OUT.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        old = {}
    status = refresh(old)
    OUT.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(status, ensure_ascii=False))
