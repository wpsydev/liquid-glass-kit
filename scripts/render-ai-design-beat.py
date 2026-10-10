#!/usr/bin/env python3
"""Render an original six-bar, 120 BPM groove for the AI design showcase.

Usage:
    python3 scripts/render-ai-design-beat.py
    python3 scripts/render-ai-design-beat.py /tmp/ai-design-beat.wav

Only Python's standard library is used. Every oscillator, percussion event,
and note is synthesized here. No samples, voice, or third-party music.
The source and generated soundtrack are offered under the repository MIT license.
"""
from array import array
import hashlib
import math
from pathlib import Path
import random
import struct
import sys
import wave

RATE = 48000
SECONDS = 12
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
FRAMES = RATE * SECONDS
SEED = 91206
TARGET_PEAK = 0.79


def frequency(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def render(path):
    left = array('f', [0]) * FRAMES
    right = array('f', [0]) * FRAMES
    rng = random.Random(SEED)

    def add(start, duration, synth, gain=1, pan=0):
        offset = round(start * RATE)
        count = max(0, min(round(duration * RATE), FRAMES - offset))
        gl = math.sqrt((1 - pan) / 2) * gain
        gr = math.sqrt((1 + pan) / 2) * gain
        for j in range(count):
            sample = synth(j / RATE)
            left[offset + j] += sample * gl
            right[offset + j] += sample * gr

    def kick(t):
        # Integrated falling pitch: rounded low body, a restrained initial click.
        phase = 2 * math.pi * (51 * t + 103 * .016 * (1 - math.exp(-t / .016)))
        envelope = min(1, t / .0018) * math.exp(-t * 17)
        body = math.sin(phase) + .08 * math.sin(phase * 2)
        return body * envelope

    def filtered_noise(decay, highpass=.88):
        # One-pole high-pass plus a small low-pass removes rumble and brittle hiss.
        previous = 0
        hp = 0
        low = 0

        def synth(t):
            nonlocal previous, hp, low
            white = rng.uniform(-1, 1)
            hp = highpass * (hp + white - previous)
            previous = white
            low += .38 * (hp - low)
            return low * min(1, t / .001) * math.exp(-t * decay)
        return synth

    def rim(t):
        # A dry rounded wooden tone rather than a loud clap or synthetic sweep.
        tone = math.sin(2 * math.pi * 1780 * t) + .25 * math.sin(2 * math.pi * 2630 * t)
        return tone * min(1, t / .0007) * math.exp(-t * 150)

    def bass(midi, duration):
        hz = frequency(midi - 12)

        def synth(t):
            envelope = min(1, t / .006) * math.exp(-t * 7.7)
            envelope *= min(1, max(0, duration - t) / .035)
            # Fundamental stays mono; small harmonics carry the groove on phones.
            body = math.sin(2 * math.pi * hz * t)
            body += .30 * math.sin(2 * math.pi * hz * 2 * t)
            body += .055 * math.sin(2 * math.pi * hz * 3 * t)
            return math.tanh(body * 1.12) * envelope
        return synth

    def soft_key(midi, duration, attack=.035):
        hz = frequency(midi)

        def synth(t):
            attack_envelope = min(1, t / attack)
            release = min(1, max(0, duration - t) / .18)
            phase = 2 * math.pi * hz * t
            body = math.sin(phase) + .14 * math.sin(phase * 2.002) + .035 * math.sin(phase * 3)
            return body * attack_envelope * math.exp(-t * 1.85) * release
        return synth

    # Six complete 4/4 bars. Dmaj9 → Bm9 → Gmaj9 → A13 → Dmaj9 → A6.
    # Upper voicings keep space for the bass; no melody is borrowed from a song.
    roots = [38, 35, 31, 33, 38, 33]
    voicings = [
        (54, 61, 64, 69), (54, 57, 61, 64), (54, 57, 62, 66),
        (55, 61, 66, 71), (54, 61, 64, 69), (54, 61, 64, 69),
    ]
    top_notes = [(76, 78), (73, 76), (74, 78), (76, 73), (78, 81), (76, 73)]

    for bar, root in enumerate(roots):
        start = bar * BAR
        for beat in range(4):
            add(start + beat * BEAT, .31, kick, .68)
            # A quiet on-grid tick and a slightly swung off-beat brush.
            add(start + beat * BEAT, .045, filtered_noise(150), .060, -.25)
            add(start + beat * BEAT + .267, .115, filtered_noise(59), .097, .30)
            if beat in (1, 3):
                add(start + beat * BEAT, .035, rim, .105, -.08)
                add(start + beat * BEAT + .006, .12, filtered_noise(67, .83), .074, .06)
        # Syncopation leaves the kick's first 70 ms open for a clean low end.
        bass_pattern = [(0.5, root), (1.5, root), (2.25, root + 7), (3.5, root)]
        for beat, midi in bass_pattern:
            add(start + beat * BEAT, .27, bass(midi, .27), .46)
        for n, midi in enumerate(voicings[bar]):
            add(start + .028 + n * .007, 1.78, soft_key(midi, 1.78, .095), .060, [-.48, -.15, .15, .48][n])
        # Two restrained high notes add lift without fighting the visuals.
        for n, midi in enumerate(top_notes[bar]):
            at = start + (1.75 if n == 0 else 3.25) * BEAT
            add(at, .34, soft_key(midi, .34, .008), .041, -.36 if n == 0 else .36)
        if bar in (1, 3, 5):
            # A tiny ghost rim makes the ending of alternate bars feel human.
            add(start + 3.75 * BEAT, .03, rim, .026, .32)

    # Gentle saturation before normalization, then short click-free entry/exit fades.
    raw_peak = max(max(abs(v) for v in left), max(abs(v) for v in right))
    saturated_peak = math.tanh(raw_peak * 1.12)
    gain = TARGET_PEAK / saturated_peak
    pcm = bytearray()
    for i, (l, r) in enumerate(zip(left, right)):
        t = i / RATE
        fade_in = min(1, t / .025)
        fade_out = min(1, (SECONDS - t) / .24)
        fade = math.sin(fade_in * math.pi / 2) * math.sin(fade_out * math.pi / 2)
        for value in (l, r):
            sample = math.tanh(value * 1.12) * gain * fade
            pcm.extend(struct.pack('<h', round(sample * 32767)))

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm)

    # Measure the actual quantized PCM output rather than the float mix.
    with wave.open(str(path), 'rb') as output:
        samples = array('h', output.readframes(output.getnframes()))
        if sys.byteorder != 'little':
            samples.byteswap()
        duration = output.getnframes() / output.getframerate()
    peak = max(abs(v) for v in samples) / 32768
    rms = math.sqrt(sum((v / 32768) ** 2 for v in samples) / len(samples))
    clipped = sum(abs(v) >= 32767 for v in samples)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    print(f'{path}\nDuration: {duration:.6f}s; {RATE} Hz; stereo; 16-bit PCM; {BPM} BPM; 6 bars')
    print(f'Sample peak: {peak:.6f} ({20 * math.log10(peak):.3f} dBFS)')
    print(f'PCM RMS: {rms:.6f} ({20 * math.log10(rms):.3f} dBFS); clipped samples: {clipped}')
    print(f'SHA-256: {digest}; deterministic seed: {SEED}; original procedural synthesis')


if __name__ == '__main__':
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('docs/campaign/assets/ai-design-beat.wav')
    render(destination)
