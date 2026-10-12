#!/usr/bin/env python3
"""Original chamber-pizzicato UI score: plucked string harmonics and an upbeat126BPM pulse.

No external samples, artist imitation or downloaded recordings. MIT licensed.
Usage: python3 scripts/render-series-score.py --style dnb --seed 16 --output /tmp/score.wav
"""
import argparse
from array import array
import json
import math
from pathlib import Path
import random
import struct
import wave

parser = argparse.ArgumentParser()
parser.add_argument('--style', choices=['dnb', 'garage', 'disco', 'synthpop', 'afro', 'funk', 'electro', 'cinematic', 'chamber'], required=True)
parser.add_argument('--seed', type=int, default=16)
parser.add_argument('--output', required=True)
args = parser.parse_args()
RATE, LENGTH = 48000, 12
palettes = {
    'dnb': (160, [0, 3, 7, 10], .12, 'fm', 'break'),
    'garage': (132, [0, 4, 7, 11], .21, 'bell', 'shuffle'),
    'disco': (120, [0, 4, 7, 9], .04, 'keys', 'four'),
    'synthpop': (112, [0, 3, 7, 12], .02, 'square', 'pop'),
    'afro': (124, [0, 3, 7, 10], .13, 'marimba', 'clave'),
    'funk': (104, [0, 4, 7, 10], .17, 'brass', 'syncopated'),
    'electro': (144, [0, 3, 6, 10], .0, 'metal', 'electro'),
    'cinematic': (96, [0, 4, 7, 12], .0, 'piano', 'half'),
    'chamber': (126, [0, 4, 7, 11], .04, 'pizzicato', 'four'),
}
bpm, intervals, swing, patch, groove = palettes[args.style]
beat = 60 / bpm
root = 45 + (args.seed % 7)
rng = random.Random(args.seed * 103 + bpm)
left, right = array('f', [0]) * (RATE * LENGTH), array('f', [0]) * (RATE * LENGTH)

def add(start, duration, synth, gain=1, pan=0):
    offset = round(start * RATE)
    if offset >= len(left) or offset < 0: return
    gl, gr = math.sqrt((1-pan)/2)*gain, math.sqrt((1+pan)/2)*gain
    for j in range(min(round(duration * RATE), len(left)-offset)):
        v = synth(j/RATE)
        left[offset+j] += v*gl
        right[offset+j] += v*gr

def hz(midi): return 440 * 2 ** ((midi-69)/12)
def kick(t): return math.sin(2*math.pi*(48*t+110*.018*(1-math.exp(-t/.018))))*math.exp(-t*15)
def noise(t, decay=80): return rng.uniform(-1,1)*math.exp(-t*decay)
def snare(t): return noise(t, 25)*.55 + math.sin(2*math.pi*185*t)*math.exp(-t*45)*.4
def tone(t, f, kind):
    phase = 2*math.pi*f*t
    attack = min(1,t*300)
    if kind == 'pizzicato': return (math.sin(phase)+.26*math.sin(phase*2)+.18*math.sin(phase*3)+.08*math.sin(phase*5))*min(1,t*500)*math.exp(-t*15)
    if kind == 'fm': return math.sin(phase+1.2*math.sin(phase*2)*math.exp(-t*12))*attack*math.exp(-t*9)
    if kind == 'bell': return (math.sin(phase)+.35*math.sin(phase*2.76))*attack*math.exp(-t*7)
    if kind == 'keys': return (math.sin(phase)+.19*math.sin(phase*2)+.06*math.sin(phase*3))*attack*math.exp(-t*8)
    if kind == 'square': return (math.sin(phase)+math.sin(phase*3)/3+math.sin(phase*5)/5)*attack*math.exp(-t*6)
    if kind == 'marimba': return (math.sin(phase)+.35*math.sin(phase*4)*math.exp(-t*30))*attack*math.exp(-t*12)
    if kind == 'brass': return (math.sin(phase)+.28*math.sin(phase*2)+.18*math.sin(phase*3))*min(1,t*60)*math.exp(-t*10)
    if kind == 'metal': return math.sin(phase+2.4*math.sin(phase*1.414)*math.exp(-t*15))*attack*math.exp(-t*11)
    return (math.sin(phase)+.32*math.sin(phase*2)+.11*math.sin(phase*3))*attack*math.exp(-t*4)

bars = math.ceil(LENGTH/(beat*4))
for bar in range(bars):
    start = bar*beat*4
    chord_root = root + [0, -5, 3, -2][bar%4]
    # Chord voicings and syncopated stabs vary by palette, not just tempo.
    chord_times = [0, 1.5, 2.5] if groove in ['shuffle','syncopated'] else [0,2] if groove != 'half' else [0]
    for k in chord_times:
        for voice, interval in enumerate(intervals[1:]):
            f = hz(chord_root+interval+12)
            add(start+k*beat, .75 if groove=='half' else .3, lambda t,f=f: tone(t,f,patch), .065, (voice-1)*.5)
    kick_times = {'break':[0,1.5,2.75], 'shuffle':[0,1.75,2.5], 'four':[0,1,2,3], 'pop':[0,2,2.75], 'clave':[0,1,2,3], 'syncopated':[0,.75,2,3.5], 'electro':[0,1.5,2,3.75], 'half':[0,2.5]}[groove]
    for k in kick_times: add(start+k*beat,.32,kick,.62)
    for k in ([2] if groove=='half' else [1,3]): add(start+k*beat,.2,snare,.22 if groove=='clave' else .33)
    for step in range(8 if groove!='break' else 16):
        division = 4 if groove=='break' else 2
        k = step/division + (swing/division if step%2 else 0)
        add(start+k*beat,.055,lambda t:noise(t,110),.045 if step%2==0 else .025, .4 if step%2 else -.4)
    if groove=='clave':
        for k in [0,.75,1.5,2.5,3]: add(start+k*beat,.13,lambda t:math.sin(2*math.pi*900*t)*math.exp(-t*70),.085,.2)
    bass_times = [0,.75,1.5,2.75,3.5] if groove in ['break','shuffle','syncopated'] else [.5,1.5,2.5,3.5]
    for index,k in enumerate(bass_times):
        f=hz(chord_root-12+(7 if index==3 and groove=='syncopated' else 0))
        add(start+k*beat,.24,lambda t,f=f:(math.sin(2*math.pi*f*t)+.13*math.sin(2*math.pi*f*2*t))*min(1,t*300)*math.exp(-t*7),.23)
    for step in range(8):
        if groove=='half' and step%2: continue
        midi=chord_root+intervals[(step+bar)%4]+24
        f=hz(midi);at=start+(step/2+swing/2*(step%2))*beat
        add(at,.35,lambda t,f=f:tone(t,f,patch),.07, .5 if step%2 else -.5)
        add(at+beat*.75,.35,lambda t,f=f:tone(t,f,patch),.015, -.5 if step%2 else .5)
    if bar:
        add(start-.12,.12,lambda t:noise(t,4)*(t/.12)**2,.05)

peak = max(max(abs(v) for v in left),max(abs(v) for v in right))
pcm, energy = bytearray(), 0
for i,(l,r) in enumerate(zip(left,right)):
    fade=min(1,i/RATE/.015,(LENGTH-i/RATE)/.24)
    for value in [l,r]:
        value=math.tanh(value/peak*1.25)*.86*fade
        energy+=value*value
        pcm.extend(struct.pack('<h',round(value*32767)))
with wave.open(args.output,'wb') as output:
    output.setnchannels(2);output.setsampwidth(2);output.setframerate(RATE);output.writeframes(pcm)
print(json.dumps({'path':str(Path(args.output)),'durationSeconds':LENGTH,'bpm':bpm,'style':args.style,'patch':patch,'seed':args.seed,'rms':round(math.sqrt(energy/(RATE*LENGTH*2)),4),'provenance':'Original procedural synthesis; no external samples; MIT'}))
