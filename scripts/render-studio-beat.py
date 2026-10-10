#!/usr/bin/env python3
"""Original 12-second, 120 BPM soundtrack. No samples or third-party music.

Usage: python3 scripts/render-studio-beat.py /tmp/studio-beat.wav
Each of the four six-beat phrases lasts three seconds, matching the studio chapter length.
Source and generated audio are licensed under the repository's MIT license.
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
BEAT = 60 / 120
left = array('f', [0]) * (RATE * LENGTH)
right = array('f', [0]) * (RATE * LENGTH)
rng = random.Random(606)


def add(start, duration, synth, gain=1, pan=0):
    offset = round(start * RATE)
    gl = math.sqrt((1 - pan) / 2) * gain
    gr = math.sqrt((1 + pan) / 2) * gain
    for j in range(min(round(duration * RATE), len(left) - offset)):
        t = j / RATE
        v = synth(t)
        left[offset + j] += v * gl
        right[offset + j] += v * gr


def note(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def kick(t):
    phase = 2 * math.pi * (48 * t + 92 * .025 * (1 - math.exp(-t / .025)))
    return math.sin(phase) * math.exp(-t * 16) + rng.uniform(-1, 1) * math.exp(-t * 200) * .12


def hat(t, decay=95):
    return rng.uniform(-1, 1) * math.exp(-t * decay) * (.5 + .5 * math.sin(t * 2 * math.pi * 9200))


def clap(t):
    bursts = sum(math.exp(-max(t - s, 0) * 90) if t >= s else 0 for s in [0, .009, .018])
    return rng.uniform(-1, 1) * bursts * .45


chords = [(48, 55, 60, 64, 67), (53, 60, 65, 69, 72), (50, 57, 62, 65, 69), (55, 62, 67, 71, 74)]
for phrase, chord in enumerate(chords):
    start = phrase * 3
    for midi in chord[1:]:
        hz = note(midi)
        add(start, 2.95, lambda t, f=hz: (math.sin(2 * math.pi * f * t) + .22 * math.sin(2 * math.pi * f * 2.003 * t)) * min(1, t * 12) * math.exp(-t * 1.4), .075, (midi % 3 - 1) * .5)
    for step in range(6):
        at = start + step * BEAT
        add(at, .3, kick, .78)
        if step % 2 == 1:
            add(at, .16, clap, .25)
        add(at, .08, hat, .07, -.3)
        add(at + BEAT / 2, .14, lambda t: hat(t, 42), .12, .4)
        if phrase >= 1:
            add(at + BEAT / 4, .04, hat, .035, -.6)
            add(at + BEAT * .75, .04, hat, .045, .6)
        bass = note(chord[0] - 12)
        add(at + BEAT / 2, .17, lambda t, f=bass: (math.sin(2 * math.pi * f * t) + .18 * math.sin(2 * math.pi * f * 2 * t)) * min(1, t * 500) * math.exp(-t * 12), .35)
        midi = chord[2 + (step % 3)] + (12 if phrase == 2 else 0)
        hz = note(midi)
        pluck = lambda t, f=hz: (math.sin(2 * math.pi * f * t) + .3 * math.sin(2 * math.pi * f * 2 * t)) * min(1, t * 350) * math.exp(-t * 13)
        add(at + BEAT / 2, .3, pluck, .13, (-1 if step % 2 else 1) * .3)
        add(at + BEAT, .3, pluck, .04, (-1 if step % 2 else 1) * -.7)
    if phrase:
        add(start, .5, lambda t: rng.uniform(-1, 1) * math.exp(-t * 12), .08, .2)

# Short transition lifts; keep the musical pulse clear under the visual cuts.
for boundary in [3, 6, 9]:
    add(boundary - .375, .375, lambda t: (rng.uniform(-1, 1) * .6 + math.sin(2 * math.pi * (600 * t + 2200 * t * t))) * (t / .375) ** 2, .065)

peak = max(max(abs(v) for v in left), max(abs(v) for v in right))
pcm = bytearray()
energy = 0
for i, (l, r) in enumerate(zip(left, right)):
    t = i / RATE
    fade = min(1, t / .015, (LENGTH - t) / .18)
    for value in [l, r]:
        value = math.tanh(value / peak * 1.25) * .87 * fade
        energy += value * value
        pcm.extend(struct.pack('<h', round(value * 32767)))
path = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/studio-beat.wav')
with wave.open(str(path), 'wb') as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(pcm)
print(f'{path}: {LENGTH}s, stereo {RATE}Hz, 120 BPM, RMS {math.sqrt(energy / (RATE * LENGTH * 2)):.3f}; original synthesis')
