#!/usr/bin/env python3
"""Original 12-second acoustic UI-film score, no samples or artist imitation. MIT."""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import random
import struct
import wave

parser=argparse.ArgumentParser()
parser.add_argument('--output',required=True)
parser.add_argument('--seed',type=int,default=43)
args=parser.parse_args()
rate,length,bpm=48000,12,116
beat=60/bpm
rng=random.Random(args.seed*197)
left,right=array('f',[0])*(rate*length),array('f',[0])*(rate*length)
def hz(note):return 440*2**((note-69)/12)
def add(at,duration,voice,gain,pan=0):
 start=round(at*rate)
 if start<0 or start>=len(left):return
 l,r=math.sqrt((1-pan)/2)*gain,math.sqrt((1+pan)/2)*gain
 for i in range(min(round(duration*rate),len(left)-start)):
  value=voice(i/rate);left[start+i]+=value*l;right[start+i]+=value*r
def nylon(t,f):
 # Original plucked harmonic body with faster upper-partial decay.
 attack=min(1,t*700)
 return attack*(math.sin(2*math.pi*f*t)*math.exp(-t*5)+.36*math.sin(2*math.pi*f*2*t)*math.exp(-t*13)+.15*math.sin(2*math.pi*f*3*t)*math.exp(-t*23)+.07*math.sin(2*math.pi*f*5*t)*math.exp(-t*40))
def brush(t):return rng.uniform(-1,1)*math.exp(-t*80)*min(1,t*1600)
def wood(t):return (math.sin(2*math.pi*720*t)+.4*math.sin(2*math.pi*1150*t))*math.exp(-t*90)
def kick(t):return math.sin(2*math.pi*(52*t+55*.024*(1-math.exp(-t/.024))))*math.exp(-t*20)
root=50+args.seed%4
progression=[0,-3,5,7]
melody=[0,7,4,12,9,7,2,4]
bars=math.ceil(length/(beat*4))
for bar in range(bars):
 start=bar*beat*4;chord=root+progression[bar%4]
 # Six-note broken voicings and a different melody contour from other scores.
 for n,interval in enumerate([0,7,11,4,7,14]):
  at=start+[0,.5,1.25,2,2.5,3.25][n]*beat
  f=hz(chord+interval+12)
  add(at,.65,lambda t,f=f:nylon(t,f),.11,-.45 if n%2 else .45)
 for step in range(4):
  f=hz(chord+melody[(step+bar*2)%len(melody)]+24)
  add(start+(step+.25)*beat,.55,lambda t,f=f:nylon(t,f),.06,.18)
 for k in [0,1.5,2,3.5]:add(start+k*beat,.3,kick,.56)
 for k in [1,3]:
  add(start+k*beat,.07,brush,.25)
  add(start+(k+.045)*beat,.07,brush,.16,.35)
 for k in [.75,1.5,2.75,3.5]:add(start+k*beat,.09,wood,.09,-.35)
 for k in [0,.5,1,1.5,2,2.5,3,3.5]:add(start+k*beat,.025,brush,.045 if k%1 else .025,.5)
 for k,interval in [(0,0),(1.5,7),(2.5,0),(3.5,2)]:
  f=hz(chord-12+interval)
  add(start+k*beat,.3,lambda t,f=f:math.sin(2*math.pi*f*t)*math.exp(-t*9)*min(1,t*400),.24)
peak=max(max(abs(x)for x in left),max(abs(x)for x in right))
pcm,energy=bytearray(),0
for i,pair in enumerate(zip(left,right)):
 fade=min(1,i/rate/.02,(length-i/rate)/.3)
 for x in pair:
  value=math.tanh(x/peak*1.2)*.85*fade;energy+=value*value;pcm.extend(struct.pack('<h',round(value*32767)))
with wave.open(args.output,'wb')as output:
 output.setnchannels(2);output.setsampwidth(2);output.setframerate(rate);output.writeframes(pcm)
record={'path':args.output,'style':'acoustic-pop','bpm':bpm,'patch':'nylon pluck / brushed handclaps / woodblock','seed':args.seed,'durationSeconds':length,'rms':round(math.sqrt(energy/(rate*length*2)),4),'provenance':'Original synthesis, melody/voicings/rhythm; no external samples; MIT','sha256':hashlib.sha256(Path(args.output).read_bytes()).hexdigest()}
print(json.dumps(record))
