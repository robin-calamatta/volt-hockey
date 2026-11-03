#!/usr/bin/env python3
"""Brings every clip in assets/commentary to a steady loudness: excited clips peak at -0.5 dB, calm ones at -4 dB."""
import os, re, subprocess, sys, tempfile
d = os.path.join(os.path.dirname(__file__), '..', 'assets', 'commentary')
for f in sorted(os.listdir(d)):
    if not f.endswith('.mp3'): continue
    p = os.path.join(d, f)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', p, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.search(r'max_volume: (-?[\d.]+) dB', r)
    if not m: continue
    gain = (-0.5 if f[3] == 'h' else -4.0) - float(m.group(1))     # file names start pbph_ / pbpl_ / colh_ / coll_
    tmp = tempfile.mktemp(suffix='.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', p, '-af', 'volume=%.2fdB' % gain, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', tmp], check=True)
    os.replace(tmp, p)
print('done')
