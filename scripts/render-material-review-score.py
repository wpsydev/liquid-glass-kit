#!/usr/bin/env python3
"""Original 12 second jungle score with airy bells, hand drums and soft sub. MIT, no samples."""
import argparse,json,math,random,struct,wave
from array import array
p=argparse.ArgumentParser();p.add_argument('--seed',type=int,default=89);p.add_argument('--output',required=True);a=p.parse_args()
rate,length,bpm=48000,12,160;beat=60/bpm;rng=random.Random(a.seed*911)
left=array('f',[0])*(rate*length);right=array('f',[0])*(rate*length)
def hz(m):return 440*2**((m-69)/12)
def add(start,duration,voice,gain,pan=0):
 off=round(start*rate)
 if off<0 or off>=len(left):return
 gl,gr=gain*math.sqrt((1-pan)/2),gain*math.sqrt((1+pan)/2)
 for i in range(min(round(duration*rate),len(left)-off)):
  v=voice(i/rate);left[off+i]+=v*gl;right[off+i]+=v*gr
def kick(t):return math.sin(2*math.pi*(45*t+75*.021*(1-math.exp(-t/.021))))*math.exp(-t*19)
def snare(t):return (.72*rng.uniform(-1,1)+.23*math.sin(2*math.pi*185*t))*math.exp(-t*32)
def hand(t,f):return (math.sin(2*math.pi*(f*t+f*.009*(1-math.exp(-t/.009))))+.24*math.sin(2*math.pi*f*1.62*t))*min(1,t*900)*math.exp(-t*26)
def bell(t,f):return (math.sin(2*math.pi*f*t)+.21*math.sin(2*math.pi*f*2.71*t)*math.exp(-t*7)+.11*math.sin(2*math.pi*f*5.43*t)*math.exp(-t*14))*min(1,t*350)*math.exp(-t*5)
def bass(t,f):return (math.sin(2*math.pi*f*t)+.13*math.sin(2*math.pi*2*f*t))*min(1,t*90)*min(1,max(0,.33-t)*35)
melody=[12,7,14,10,19,14,9,7]
for bar in range(math.ceil(length/(4*beat))):
 at=bar*4*beat;root=38+[0,5,0,3][bar%4]
 for k in [[0,1.5,2.5,3.75],[0,.75,2,2.75],[0,.5,1.75,2.5,3.25]][bar%3]:add(at+k*beat,.28,kick,.51)
 for k in [1,3]:add(at+k*beat,.17,snare,.31)
 for k in [.875,2.75,3.625]:add(at+k*beat,.075,snare,.07,.3)
 for s in range(16):
  add(at+(s/4+.018*(s%2))*beat,.04,lambda t:rng.uniform(-1,1)*math.exp(-t*145),.033 if s%2 else .024,.65 if s%2 else -.65)
 for k,f in [(.5,270),(1.75,340),(2.25,230),(3.5,310)]:add(at+k*beat,.13,lambda t,f=f:hand(t,f),.1,.4 if k<2 else -.4)
 for k,n in [(0,0),(1.5,7),(2.25,0),(3.25,3)]:add(at+k*beat,.33,lambda t,f=hz(root+n):bass(t,f),.21)
 for s in [0,3,5,7]:
  f=hz(root+24+melody[(s+bar)%8]);pan=.38 if s%2 else -.38
  add(at+s*.5*beat,.55,lambda t,f=f:bell(t,f),.07,pan)
  add(at+(s*.5+.67)*beat,.45,lambda t,f=f:bell(t,f),.014,-pan)
peak=max(max(abs(v)for v in left),max(abs(v)for v in right));pcm=bytearray();energy=0
for i,pair in enumerate(zip(left,right)):
 fade=min(1,i/rate/.018,(length-i/rate)/.22)
 for v in pair:
  v=math.tanh(v/peak*1.2)*.86*fade;energy+=v*v;pcm.extend(struct.pack('<h',round(v*32767)))
with wave.open(a.output,'wb')as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm)
print(json.dumps({'path':a.output,'durationSeconds':length,'bpm':bpm,'style':'jungle','patch':'airy inharmonic bells, hand drums and soft bass','seed':a.seed,'rms':round(math.sqrt(energy/(rate*length*2)),4),'provenance':'Original procedural MIT synthesis; fresh melody/rhythm, no external recordings or samples'}))
