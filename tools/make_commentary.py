"""v14.3.25 Renders the Volt Hockey commentary clips with Pocket TTS (Kyutai, via sherpa-onnx), copying the booth's two voices from the
   reference clips in tools/voice_refs (the play-by-play man calm and at full volume, and the colour man).
   Every take is checked with speech recognition (Moonshine) and the best of up to four (six for names) kept. A take is stopped once it runs
   past its words and cut at the first long pause (the model can ramble on single words). A name that won't come out right is skipped:
   the game then says the player's number.
   Setup (from github.com/k2-fsa/sherpa-onnx releases): pip install sherpa-onnx soundfile librosa numpy, then put next to this script
     sherpa-onnx-pocket-tts-int8-2026-01-26/  (tts-models release)   and   sherpa-onnx-moonshine-base-en-int8/  (asr-models release)
   usage: node tools/dump_commentary.js > clips.json && python3 tools/make_commentary.py clips.json assets/commentary
          then: node tools/commentary_index.js   (writes assets/commentary/index.json). Existing clips are kept: delete one to redo it."""
import json, os, sys, re, difflib, subprocess, time, numpy as np, soundfile as sf, librosa, sherpa_onnx
clips = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
shard, shards = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (0, 1); clips = clips[shard::shards]
here = os.path.dirname(os.path.abspath(__file__)); d = os.path.join(here, 'sherpa-onnx-pocket-tts-int8-2026-01-26/')
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(pocket=sherpa_onnx.OfflineTtsPocketModelConfig(
    lm_flow=d+'lm_flow.int8.onnx', lm_main=d+'lm_main.int8.onnx', encoder=d+'encoder.onnx', decoder=d+'decoder.int8.onnx', text_conditioner=d+'text_conditioner.onnx', vocab_json=d+'vocab.json', token_scores_json=d+'token_scores.json'), num_threads=2 // shards or 1)))
R = lambda n: sf.read(os.path.join(here, 'voice_refs', n + '.wav'), dtype='float32')[0]; SR = 24000
REF = {'pbpl': R('pbp_calm'), 'pbph': R('pbp_peak'), 'coll': R('colour')}
m = os.path.join(here, 'sherpa-onnx-moonshine-base-en-int8/')
rec = sherpa_onnx.OfflineRecognizer.from_moonshine(preprocessor=m+'preprocess.onnx', encoder=m+'encode.int8.onnx', uncached_decoder=m+'uncached_decode.int8.onnx', cached_decoder=m+'cached_decode.int8.onnx', tokens=m+'tokens.txt', num_threads=1)
words = lambda s: re.sub(r"[^a-z' ]", ' ', s.lower()).split()
def heard(s):
    st = rec.create_stream(); st.accept_waveform(16000, librosa.resample(s, orig_sr=SR, target_sr=16000)); rec.decode_stream(st); return st.result.text
NUMS = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split()
def letters(s):
    s = re.sub(r'\d+', lambda m: ' ' + (NUMS[int(m.group())] if int(m.group()) <= 20 else m.group()) + ' ', s.lower()).replace('volts', 'bolts')
    return re.sub(r'[^a-z]', '', s)
def score(text, s):                                             # how well the take says the text (letters, so "5 to 3" = "five to three")
    return difflib.SequenceMatcher(None, letters(text), letters(heard(s))).ratio()
def gen(text, ref):
    n = len(letters(text)); cap = int((0.11 * n + 0.9) * SR); got = [0]
    def cb(samples, progress): got[0] += len(samples); return 0 if got[0] > cap else 1      # stop a take that runs on past the words
    gc = sherpa_onnx.GenerationConfig(); gc.reference_audio = REF[ref].tolist(); gc.reference_sample_rate = SR; gc.num_steps = 3; gc.speed = 1.0
    s = np.array(tts.generate(text, gc, cb).samples, dtype=np.float32)[:cap]
    # cut at the first long pause after the words should be done (anything after it is the model rambling)
    env = np.convolve(np.abs(s), np.ones(240) / 240, 'same'); quiet = env < 0.004; minlen = int((0.045 * n + 0.15) * SR); run = 0
    for i in range(minlen, len(s), 120):
        run = run + 120 if quiet[i] else 0
        if run >= int(0.3 * SR): s = s[:i - run + int(0.12 * SR)]; break
    return s
done = 0; t0 = time.time()
for c in clips:
    path = os.path.join(out, c['id'] + '.mp3')
    if os.path.exists(path): continue
    ref = c['voice'] + ('h' if c['hi'] else 'l'); text = c['text']; w = words(text); best = None
    for k in range(6 if '_m_' in c['id'] else 4):
        s = gen(text, ref)
        idx = np.where(np.abs(s) > 0.006)[0]
        if not len(idx): continue
        s = s[max(0, idx[0] - int(0.06 * SR)):idx[-1] + int(0.15 * SR)]   # (a little room either side: a tight trim lost first words)
        dur = len(s) / SR; sc = score(text, s)
        if dur > 0.11 * len(letters(text)) + 1.0: sc -= 0.5      # too long for the words
        if not best or sc > best[0]: best = (sc, s)
        if sc >= 0.8: break
    if not best or ('_m_' in c['id'] and best[0] < 0.6): print('FAILED', c['id'], flush=True); continue   # (a name that won't come out right is left out: the game says the number)
    s = best[1] / (np.sqrt(np.mean(best[1] ** 2)) + 1e-9) * 0.1   # every clip at the same loudness; the game sets the energy's level
    tmp = path[:-4] + '.wav'; sf.write(tmp, np.clip(s, -1, 1), SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', 'highpass=f=70,afade=t=out:st=%.3f:d=0.03' % max(0, len(s) / SR - 0.03), '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '48k', path], check=True)
    os.remove(tmp); done += 1
    if best[0] < 0.7: print('LOW', round(best[0], 2), c['id'], text, '| heard', heard(best[1]), flush=True)
    if done % 25 == 0: print(done, 'clips', round(time.time() - t0), 's', flush=True)
print('rendered', done, flush=True)
