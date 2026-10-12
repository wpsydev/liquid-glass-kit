#!/usr/bin/env python3
"""Original 12-second dnb/vibraphone study. MIT; no external samples."""
import argparse
import json
import math
import random
import struct
import wave
from array import array

p = argparse.ArgumentParser()
p.add_argument('--seed', type=int, default=40)
p.add_argument('--output', required=True)
a = p.parse_args()
rate, seconds, bpm = 48000, 12, 160
rng = random.Random(a.seed * 419)
beat = 60 / bpm
left = array('f', [0]) * (rate * seconds)
right = array('f', [0]) * (rate * seconds)

def add(at, length, voice, gain, pan=0):
    start = round(at * rate)
    if start < 0 or start >= len(left):
        return
    gl, gr = gain * math.sqrt((1-pan)/2), gain * math.sqrt((1+pan)/2)
    for i in range(min(round(length * rate), len(left)-start)):
        v = voice(i/rate)
        left[start+i] += v * gl
        right[start+i] += v * gr

def hz(midi):
    return 440 * 2 ** ((midi-69)/12)

def mallet(t, f):
    phase = 2 * math.pi * f * t
    # Original vibraphone-like partials and finite amplitude modulation.
    return (math.sin(phase) + .22*math.sin(phase*2.98)*math.exp(-t*12) + .08*math.sin(phase*6.12)*math.exp(-t*25)) * min(1,t*600) * math.exp(-t*6.2) * (.88+.12*math.sin(2*math.pi*5.5*t))

def kick(t):
    return math.sin(2*math.pi*(46*t+100*.018*(1-math.exp(-t/.018))))*math.exp(-t*16)

def snare(t):
    return rng.uniform(-1,1)*math.exp(-t*26)*.65 + math.sin(2*math.pi*195*t)*math.exp(-t*43)*.32

for bar in range(math.ceil(seconds/(4*beat))):
    at = bar * 4 * beat
    root = 46 + [0,3,-5,-2][bar%4]
    for k in [0,1.5,2.75]:
        add(at+k*beat,.32,kick,.62)
    for k in [1,3]:
        add(at+k*beat,.21,snare,.33)
    for step in range(16):
        add(at+step/4*beat,.055,lambda t:rng.uniform(-1,1)*math.exp(-t*110),.034 if step%2 else .048,.4 if step%2 else -.4)
    for step in [0,1.5,2.5]:
        for i, interval in enumerate([3,7,10]):
            f = hz(root+interval+12)
            add(at+step*beat,.7,lambda t,f=f:mallet(t,f),.06,(i-1)*.45)
    for step in range(8):
        f = hz(root+[0,7,10,3][(step+bar)%4]+24)
        pan = .55 if step%2 else -.55
        add(at+step/2*beat,.5,lambda t,f=f:mallet(t,f),.075,pan)
        add(at+(step/2+.75)*beat,.45,lambda t,f=f:mallet(t,f),.012,-pan)
    for k in [0,.75,1.5,2.75,3.5]:
        f = hz(root-12)
        add(at+k*beat,.26,lambda t,f=f:(math.sin(2*math.pi*f*t)+.12*math.sin(4*math.pi*f*t))*min(1,t*400)*math.exp(-t*8),.24)

peak = max(max(abs(v) for v in left),max(abs(v) for v in right))
pcm, energy = bytearray(), 0
for i, pair in enumerate(zip(left,right)):
    fade = min(1,i/rate/.015,(seconds-i/rate)/.24)
    for v in pair:
        v = math.tanh(v/peak*1.25)*.86*fade
        energy += v*v
        pcm.extend(struct.pack('<h',round(v*32767)))
with wave.open(a.output,'wb') as out:
    out.setnchannels(2)
    out.setsampwidth(2)
    out.setframerate(rate)
    out.writeframes(pcm)
print(json.dumps({'path':a.output,'durationSeconds':seconds,'bpm':bpm,'style':'dnb','patch':'vibraphone','seed':a.seed,'rms':round(math.sqrt(energy/(rate*seconds*2)),4),'provenance':'Original procedural synthesis; no external samples; MIT'}))
