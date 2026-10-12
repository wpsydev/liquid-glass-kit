#!/usr/bin/env python3
"""Original bright 144bpm two-step score with inharmonic glass tines. MIT, no samples."""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import random
import struct
import wave
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--seed',type=int,default=59);args=p.parse_args()
rate,length,bpm=48000,12,144;beat=60/bpm;rng=random.Random(args.seed*409)
left,right=array('f',[0])*(rate*length),array('f',[0])*(rate*length)
def hz(n):return 440*2**((n-69)/12)
def add(at,duration,synth,gain,pan=0):
 start=round(at*rate)
 if start<0 or start>=len(left):return
 l,r=math.sqrt((1-pan)/2)*gain,math.sqrt((1+pan)/2)*gain
 for i in range(min(round(duration*rate),len(left)-start)):
  value=synth(i/rate);left[start+i]+=value*l;right[start+i]+=value*r
def tine(t,f):
 phase=2*math.pi*f*t
 return min(1,t*800)*(math.sin(phase+.5*math.sin(phase*3.1)*math.exp(-t*11))*math.exp(-t*8)+.18*math.sin(phase*5.42)*math.exp(-t*30))
def sub(t,f):return min(1,t*400)*math.exp(-t*8)*(math.sin(2*math.pi*f*t)+.2*math.sin(2*math.pi*f*2*t))
def kick(t):return math.sin(2*math.pi*(48*t+90*.016*(1-math.exp(-t/.016))))*math.exp(-t*18)
def rim(t):return (math.sin(2*math.pi*1260*t)+.3*math.sin(2*math.pi*1920*t))*math.exp(-t*70)
def snap(t):return rng.uniform(-1,1)*math.exp(-t*38)+math.sin(2*math.pi*230*t)*math.exp(-t*55)*.3
def hat(t):return rng.uniform(-1,1)*math.exp(-t*145)
root=49+args.seed%5;progression=[0,4,-3,7];melody=[0,5,7,12,9,4,14,7,11,16,12,9]
for bar in range(math.ceil(length/(beat*4))):
 start=bar*4*beat;chord=root+progression[bar%4]
 for at in [0,1.75,2.5]:add(start+at*beat,.3,kick,.59)
 for at in [1,3]:add(start+at*beat,.2,snap,.23);add(start+(at+.04)*beat,.07,rim,.1,.2)
 for i in range(8):
  at=i/2+(.11 if i%2 else 0)
  add(start+at*beat,.04,hat,.045 if i%2 else .02,-.45 if i%2 else .45)
  if i in [0,1,3,4,6]:
   f=hz(chord+melody[(i+bar*2)%len(melody)]+12)
   add(start+(at+.125)*beat,.42,lambda t,f=f:tine(t,f),.085,.45 if i%2 else -.45)
 for at,interval in [(0,0),(.75,0),(1.75,7),(2.75,0),(3.5,2)]:
  f=hz(chord+interval-12);add(start+at*beat,.32,lambda t,f=f:sub(t,f),.27)
 for at in [.5,2.5]:
  for voice,interval in enumerate([4,7,11]):
   f=hz(chord+interval+12);add(start+at*beat,.45,lambda t,f=f:tine(t,f),.045,(voice-1)*.6)
peak=max(max(abs(v)for v in left),max(abs(v)for v in right));pcm,energy=bytearray(),0
for i,pair in enumerate(zip(left,right)):
 fade=min(1,i/rate/.015,(length-i/rate)/.25)
 for v in pair:
  value=math.tanh(v/peak*1.18)*.86*fade;energy+=value*value;pcm.extend(struct.pack('<h',round(value*32767)))
with wave.open(args.output,'wb')as output:
 output.setnchannels(2);output.setsampwidth(2);output.setframerate(rate);output.writeframes(pcm)
print(json.dumps({'path':args.output,'style':'two-step / glass-tine pop','bpm':bpm,'patch':'inharmonic glass tines / plucked sub / rim and shuffled drums','seed':args.seed,'durationSeconds':length,'rms':round(math.sqrt(energy/(rate*length*2)),4),'sha256':hashlib.sha256(Path(args.output).read_bytes()).hexdigest(),'provenance':'Original procedural score with new melody/progression/drum pattern; no external samples; MIT'}))
