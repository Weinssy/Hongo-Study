import asyncio
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
PHRASES_FILE = ROOT / "scripts" / "audio-phrases.json"
AUDIO_DIR = ROOT / "public" / "audio"
MANIFEST_FILE = ROOT / "js" / "audio-manifest.json"
VOICE = "ja-JP-NanamiNeural"
CONCURRENCY = 8


def phrase_filename(text: str) -> str:
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]
    return f"{digest}.mp3"


async def generate_one(sem: asyncio.Semaphore, text: str, out_path: Path, tmp_dir: Path) -> bool:
    if out_path.exists() and out_path.stat().st_size > 200:
        return True

    raw_path = tmp_dir / f"raw_{out_path.name}"
    async with sem:
        for attempt in range(3):
            try:
                communicate = edge_tts.Communicate(text, VOICE, rate="-6%")
                await communicate.save(str(raw_path))
                proc = await asyncio.create_subprocess_exec(
                    "ffmpeg",
                    "-loglevel",
                    "error",
                    "-i",
                    str(raw_path),
                    "-af",
                    "silenceremove=start_periods=1:start_silence=0.04:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_silence=0.04:start_threshold=-45dB,areverse",
                    "-ac",
                    "1",
                    "-ar",
                    "24000",
                    "-b:a",
                    "24k",
                    "-y",
                    str(out_path),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                await proc.wait()
                if raw_path.exists():
                    raw_path.unlink()
                if proc.returncode == 0 and out_path.exists() and out_path.stat().st_size > 200:
                    return True
            except Exception:
                await asyncio.sleep(0.6 * (attempt + 1))
        return False


async def main() -> None:
    phrases = json.loads(PHRASES_FILE.read_text(encoding="utf-8"))
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(CONCURRENCY)

    manifest = {}
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        tasks = []
        for phrase in phrases:
            fname = phrase_filename(phrase)
            manifest[phrase] = fname
            tasks.append((phrase, generate_one(sem, phrase, AUDIO_DIR / fname, tmp_dir)))

        results = await asyncio.gather(*(t for _, t in tasks))

    ok_count = sum(1 for r in results if r)
    failed = [p for (p, _), r in zip(tasks, results) if not r]
    # Only include generated clips in manifest
    final_manifest = {p: f for p, f in manifest.items() if (AUDIO_DIR / f).exists()}
    MANIFEST_FILE.write_text(json.dumps(final_manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    total_bytes = sum((AUDIO_DIR / f).stat().st_size for f in final_manifest.values())
    print(f"Generated {ok_count}/{len(phrases)} clips ({total_bytes / 1024 / 1024:.2f} MB). Failed: {len(failed)}")
    if failed:
        print("Failed samples:", failed[:10])


if __name__ == "__main__":
    asyncio.run(main())
