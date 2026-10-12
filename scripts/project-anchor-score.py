#!/usr/bin/env python3
"""Original 12s swing score: synthesized upright bass, brushes and woody reed. MIT."""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import random
import struct
import wave

p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--seed',type=int,default=47);args=p.parse_args()
rate,length,bpm=48000,12,138
beat=60/bpm;rng=random.Random(args.seed*311)
left,right=array('f',[0])*(rate*length),array('f',[0])*(rate*length)
def hz(n):return 440*2**((n-69)/12)
def add(at,duration,synth,gain,pan=0):
 start=round(at*rate)
 if start<0 or start>=len(left):return
 l,r=math.sqrt((1-pan)/2)*gain,math.sqrt((1+pan)/2)*gain
 for i in range(min(round(duration*rate),len(left)-start)):
  x=synth(i/rate);left[start+i]+=x*l;right[start+i]+=x*r
def upright(t,f):
 attack=min(1,t*420)
 # Fast bridge transient and slower dark fundamental, no recorded samples.
 return attack*(math.sin(2*math.pi*f*t)*math.exp(-t*5)+.26*math.sin(2*math.pi*f*2*t)*math.exp(-t*14)+.12*math.sin(2*math.pi*f*3*t)*math.exp(-t*32))
def reed(t,f):
 phase=2*math.pi*f*t+.004*math.sin(2*math.pi*4.8*t)
 return min(1,t*80)*math.exp(-t*6)*(math.sin(phase)+.23*math.sin(phase*3)+.08*math.sin(phase*5))
def vibraphone(t,f):return min(1,t*600)*math.exp(-t*5)*(math.sin(2*math.pi*f*t)+.15*math.sin(2*math.pi*f*3.99*t))* (.9+.1*math.sin(2*math.pi*5*t))
def brush(t):return rng.uniform(-1,1)*math.exp(-t*35)*min(1,t*1300)
def cymbal(t):return (rng.uniform(-1,1)*.55+math.sin(2*math.pi*6131*t)*.2)*math.exp(-t*90)
def soft_kick(t):return math.sin(2*math.pi*(55*t+30*.025*(1-math.exp(-t/.025))))*math.exp(-t*23)
root=46+args.seed%3
progression=[0,5,-2,3]
melody=[0,2,7,9,3,12,10,7,5,9,14,12]
for bar in range(math.ceil(length/(4*beat))):
 start=bar*4*beat;chord=root+progression[bar%4]
 # Walking quarter bass with a chromatic approach, original melody contour.
 for step,interval in enumerate([0,3,7,progression[(bar+1)%4]-progression[bar%4]-1]):
  f=hz(chord+interval-12);add(start+step*beat,.5,lambda t,f=f:upright(t,f),.3,-.12)
 for step in range(8):
  swung=(step//2)+(2/3 if step%2 else 0)
  add(start+swung*beat,.055,cymbal,.045 if step%2 else .025,.45)
  if step not in [(bar+2)%8,7]:
   note=chord+melody[(step+bar*3)%len(melody)]+12;f=hz(note)
   add(start+swung*beat,.3,lambda t,f=f:reed(t,f),.075,.3)
 for k in [1,3]:add(start+k*beat,.18,brush,.21,-.35)
 for k in [0,2.5]:add(start+k*beat,.25,soft_kick,.48)
 for at in [.75,2.75]:
  for voice,interval in enumerate([3,7,10]):
   f=hz(chord+interval+12);add(start+at*beat,.65,lambda t,f=f:vibraphone(t,f),.045,(voice-1)*.5)
peak=max(max(abs(x)for x in left),max(abs(x)for x in right));pcm,energy=bytearray(),0
for i,pair in enumerate(zip(left,right)):
 fade=min(1,i/rate/.02,(length-i/rate)/.32)
 for x in pair:
  value=math.tanh(x/peak*1.15)*.86*fade;energy+=value*value;pcm.extend(struct.pack('<h',round(value*32767)))
with wave.open(args.output,'wb')as output:
 output.setnchannels(2);output.setsampwidth(2);output.setframerate(rate);output.writeframes(pcm)
print(json.dumps({'path':args.output,'style':'swing-jazz','bpm':bpm,'patch':'upright bass / brushed drums / woody reed / vibraphone','seed':args.seed,'durationSeconds':length,'rms':round(math.sqrt(energy/(rate*length*2)),4),'sha256':hashlib.sha256(Path(args.output).read_bytes()).hexdigest(),'provenance':'Original procedural score with new swing rhythm/melody/voicings; no external samples; MIT'}))
