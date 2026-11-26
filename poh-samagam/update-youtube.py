#!/usr/bin/env python3
"""Refresh the current and newest completed public channel livestream."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import sys
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
    elif isinstance(value, (list, tuple)):
        for child in value:
            yield from nodes(child)


def source_entries(page):
    seen = set()
    for node in nodes(embedded_json(page, "ytInitialData").get("contents", {})):
        for key in ("lockupViewModel", "videoRenderer", "gridVideoRenderer", "playlistVideoRenderer"):
            item = node.get(key)
            if not isinstance(item, dict):
                continue
            video_id = item.get("videoId") or item.get("contentId")
            if not isinstance(video_id, str) or not VIDEO_ID.fullmatch(video_id) or video_id in seen:
                continue
            seen.add(video_id)
            title = item.get("title") or item.get("metadata", {}).get("lockupMetadataViewModel", {}).get("title", {})
            title = title.get("content") or title.get("simpleText") or "".join(run.get("text", "") for run in title.get("runs", []))
            overlays = (item.get("contentImage"), item.get("thumbnailOverlays"), item.get("badges"))
            yield video_id, title, badge_state(overlays)


def badge_state(overlays):
    for card in overlays:
        for node in nodes(card):
            style = node.get("badgeStyle") or node.get("style")
            if style in ("THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE", "BADGE_STYLE_TYPE_LIVE_NOW", "LIVE"):
                return "live"
            if style in ("THUMBNAIL_OVERLAY_BADGE_STYLE_UPCOMING", "UPCOMING"):
                return "upcoming"
    for card in overlays:
        for node in nodes(card):
            value = node.get("text")
            if isinstance(value, str) and re.fullmatch(r"(?:\d+:)?\d{1,3}:\d{2}", value):
                return "recorded"
            if isinstance(value, dict) and re.fullmatch(r"(?:\d+:)?\d{1,3}:\d{2}", value.get("simpleText", "")):
                return "recorded"
    return None


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


def extractor_fallback():
    command = [sys.executable, "-m", "yt_dlp", "--dump-single-json", "--skip-download",
               "--socket-timeout", "8", "--retries", "0", "--flat-playlist",
               "--playlist-items", "1:8", f"{CHANNEL}/streams"]
    try:
        proc = subprocess.run(command, capture_output=True, text=True, timeout=30, check=True)
        entries = json.loads(proc.stdout).get("entries", [])
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        print(f"YouTube extractor fallback unavailable: {exc}")
        return []
    states = {"is_live": "live", "was_live": "recorded", "post_live": "recorded", "is_upcoming": "upcoming"}
    return [(item["id"], item.get("title"), states.get(item.get("live_status")))
            for item in entries if item and VIDEO_ID.fullmatch(item.get("id") or "")]


def refresh(old):
    with ThreadPoolExecutor(max_workers=8) as pool:
        direct, streams = pool.map(safe_fetch, (f"{CHANNEL}/live?hl=en", f"{CHANNEL}/streams?hl=en"))
        entries = list(source_entries(streams))
        if not entries:
            entries = list(source_entries(safe_fetch(ARCHIVE)))
        if not entries:
            entries = extractor_fallback()
        entries = entries[:8]
        pages = pool.map(safe_fetch, (f"{YOUTUBE}/watch?v={video_id}&hl=en" for video_id, _, _ in entries))
        direct_result = stream_metadata(direct)
        live = [direct_result[1]] if direct_result and direct_result[0] == "live" else []
        recordings = []
        previous = old.get("recorded")
        for (video_id, title, badge), page in zip(entries, pages):
            watch = stream_metadata(page, video_id)
            if watch:
                (live if watch[0] == "live" else recordings).append(watch[1])
            elif badge in ("live", "recorded"):
                entry = {"videoId": video_id, "title": title or "Akaal Ji Sahai TV", "date": None}
                if previous and previous.get("videoId") == video_id:
                    entry = previous
                (live if badge == "live" else recordings).append(entry)
    if recordings and all(timestamp(item.get("endedAt") or item.get("date")) for item in recordings):
        recordings.sort(key=lambda item: timestamp(item.get("endedAt") or item.get("date")), reverse=True)
    return {
        "checkedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "live": live[0] if live else None,
        "recorded": recordings[0] if recordings else previous,
        "status": "ok" if live or recordings else "unavailable",
        "message": "" if live or recordings else "YouTube did not return verifiable live or replay metadata",
    }


if __name__ == "__main__":
    try:
        old = json.loads(OUT.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        old = {}
    status = refresh(old)
    OUT.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(status, ensure_ascii=False))
