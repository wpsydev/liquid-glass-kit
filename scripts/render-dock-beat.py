#!/usr/bin/env python3
"""Original 12-second Orbit Dock score, synthesized without external samples.

Usage: python3 scripts/render-dock-beat.py /tmp/lg-dock-beat.wav
120 BPM: six two-second bars for a short UI film. This source and its
generated recording use the repository's MIT license.
"""
from array import array
import math
from pathlib import Path
import random
import struct
import sys
import wave

RATE = 48000
LENGTH = 12
BEAT = .5
left = array('f', [0]) * (RATE * LENGTH)
right = array('f', [0]) * (RATE * LENGTH)
rng = random.Random(1510)


def add(start, duration, synth, gain=1, pan=0):
    offset = round(start * RATE)
    gl = math.sqrt((1 - pan) / 2) * gain
    gr = math.sqrt((1 + pan) / 2) * gain
    for j in range(min(round(duration * RATE), len(left) - offset)):
        value = synth(j / RATE)
        left[offset + j] += value * gl
        right[offset + j] += value * gr


def note(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def kick(t):
    phase = 2 * math.pi * (46 * t + 90 * .021 * (1 - math.exp(-t / .021)))
    return math.sin(phase) * math.exp(-t * 17) + rng.uniform(-1, 1) * math.exp(-t * 230) * .07


def hat(t, decay=100):
    return rng.uniform(-1, 1) * math.exp(-t * decay) * (.6 + .4 * math.sin(2 * math.pi * 8700 * t))


def clap(t):
    bursts = sum(math.exp(-(t - s) * 90) if t >= s else 0 for s in (0, .009, .018))
    return rng.uniform(-1, 1) * bursts * .32


chords = ((50, 65, 69, 72, 76), (46, 65, 69, 70, 74), (41, 64, 67, 69, 72),
          (48, 64, 67, 72, 74), (50, 65, 69, 72, 76), (50, 65, 69, 72, 76))
for bar, chord in enumerate(chords):
    start = bar * 2
    for voice, midi in enumerate(chord[1:]):
        hz = note(midi)
        add(start, 1.95, lambda t, f=hz: (math.sin(2 * math.pi * f * t)
            + .13 * math.sin(2 * math.pi * f * 2.002 * t))
            * min(1, t * 16) * math.exp(-t * 1.5), .057, (voice - 1.5) / 3)
    for beat in range(4):
        at = start + beat * BEAT
        add(at, .31, kick, .72)
        if beat % 2:
            add(at, .12, clap, .29)
        add(at, .06, hat, .055, -.3)
        add(at + .25, .11, lambda t: hat(t, 50), .105, .4)
        bass = note(chord[0] - 12)
        add(at + .25, .19, lambda t, f=bass: (math.sin(2 * math.pi * f * t)
            + .16 * math.sin(2 * math.pi * f * 2 * t))
            * min(1, t * 400) * math.exp(-t * 11), .32)
    for step in range(8):
        midi = chord[1 + (step % 4)] + (12 if bar in (2, 4) and step % 2 else 0)
        hz = note(midi)
        pluck = lambda t, f=hz: ((math.sin(2 * math.pi * f * t)
            + .18 * math.sin(2 * math.pi * f * 2 * t))
            * min(1, t * 500) * math.exp(-t * 17))
        at = start + step * .25 + .125
        pan = -.45 if step % 2 else .45
        add(at, .24, pluck, .095, pan)
        add(at + .25, .24, pluck, .024, -pan)

# Small transition lifts support visual cuts without a large cinematic riser.
for boundary in (2, 4, 6, 8, 10):
    add(boundary - .25, .25, lambda t: rng.uniform(-1, 1) * (t / .25) ** 2, .04)

peak = max(max(abs(v) for v in left), max(abs(v) for v in right))
pcm = bytearray()
energy = 0
for i, (l, r) in enumerate(zip(left, right)):
    t = i / RATE
    fade = min(1, t / .012, (LENGTH - t) / .2)
    for value in (l, r):
        value = math.tanh(value / peak * 1.2) * .87 * fade
        energy += value * value
        pcm.extend(struct.pack('<h', round(value * 32767)))
path = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/lg-dock-beat.wav')
with wave.open(str(path), 'wb') as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(pcm)
print(f'{path}: {LENGTH}s, stereo {RATE}Hz, 120 BPM, '
      f'RMS {math.sqrt(energy / (RATE * LENGTH * 2)):.3f}; original synthesis')
