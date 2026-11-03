#!/usr/bin/env python3
"""Renders the commentary clips with Kokoro (neural text-to-speech) into assets/commentary/*.mp3.
   pip install kokoro-onnx soundfile; get kokoro-v1.0.int8.onnx and voices-v1.0.bin from the kokoro-onnx GitHub releases.
   usage: node tools/dump_commentary.js > /tmp/clips.json && python3 tools/make_commentary.py /tmp/clips.json MODEL.onnx VOICES.bin [SHARD SHARDS]"""
import json, os, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro
clips = json.load(open(sys.argv[1])); shard, shards = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (0, 1); clips = clips[shard::shards]; k = Kokoro(sys.argv[2], sys.argv[3])
out = os.path.join(os.path.dirname(__file__), '..', 'assets', 'commentary'); os.makedirs(out, exist_ok=True)
VOICES = {'pbp': ('am_fenrir', 1.04, 1.12), 'col': ('bm_george', 0.97, 1.05)}   # voice, calm speed, excited speed
TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'
done = 0
for c in clips:
    path = os.path.join(out, c['id'] + '.mp3')
    if os.path.exists(path): continue
    v, calm, hot = VOICES[c['voice']]
    text = c['text']
    samples, sr = k.create(text, voice=v, speed=hot if c['hi'] else calm, lang='en-gb' if c['voice'] == 'col' else 'en-us')
    tmp = tempfile.mktemp(suffix='.wav'); sf.write(tmp, samples, sr)
    fx = TRIM + ',highpass=f=70,acompressor=threshold=0.18:ratio=3:attack=5:release=80' + (',volume=1.6' if c['hi'] else ',volume=1.2')     # no pitch shifting or echo: they make it sound processed
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', fx, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '48k', path], check=True)
    os.remove(tmp); done += 1
    if done % 25 == 0: print(done, flush=True)
print('rendered', done, 'clips')
ids = sorted(f[:-4] for f in os.listdir(out) if f.endswith('.mp3'))
json.dump(ids, open(os.path.join(out, 'index.json'), 'w'))      # the game only asks for clips listed here
