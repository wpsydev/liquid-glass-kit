#!/usr/bin/env python3
"""Original 12s breakbeat/acid-bass score, 148 BPM. MIT, no samples."""
import argparse,json,math,random,struct,wave
from array import array
p=argparse.ArgumentParser();p.add_argument('--seed',type=int,default=73);p.add_argument('--output',required=True);a=p.parse_args()
rate,length,bpm=48000,12,148;beat=60/bpm;rng=random.Random(a.seed*617)
left=array('f',[0])*(rate*length);right=array('f',[0])*(rate*length)
def hz(midi):return 440*2**((midi-69)/12)
def add(start,duration,voice,gain,pan=0):
    offset=round(start*rate)
    if offset<0 or offset>=len(left):return
    gl,gr=gain*math.sqrt((1-pan)/2),gain*math.sqrt((1+pan)/2)
    for i in range(min(round(duration*rate),len(left)-offset)):
        v=voice(i/rate);left[offset+i]+=v*gl;right[offset+i]+=v*gr
def kick(t):return math.sin(2*math.pi*(47*t+90*.022*(1-math.exp(-t/.022))))*math.exp(-t*16)
def snap(t):return (rng.uniform(-1,1)*.67+math.sin(2*math.pi*205*t)*.24)*math.exp(-t*29)
def acid(t,f,accent):
    phase=2*math.pi*f*t;cutoff=1.1+5.5*math.exp(-t*16)*(1.3 if accent else 1)
    v=sum(math.sin(phase*k)*math.exp(-k/cutoff)/k for k in range(1,8))
    return math.tanh(v*(2.7 if accent else 2))*min(1,t*800)*math.exp(-t*(8 if accent else 12))
def glass(t,f):
    phase=2*math.pi*f*t
    return (math.sin(phase+.6*math.sin(phase*1.5)*math.exp(-t*14))+.13*math.sin(phase*4.7)*math.exp(-t*30))*min(1,t*500)*math.exp(-t*9)
melody=[0,7,10,14,12,5,9,7]
patterns=[[0,.75,2,2.75,3.5],[0,1.25,2,3.25],[0,.5,1.75,2.5,3.75]]
for bar in range(math.ceil(length/(beat*4))):
    at=bar*beat*4;root=43+[0,0,5,3][bar%4]
    for k in patterns[bar%3]:add(at+k*beat,.31,kick,.54)
    for k in [1,3]:add(at+k*beat,.21,snap,.33)
    if bar%2:add(at+2.75*beat,.1,snap,.11,.35)
    for s in range(16):
        if s%4==3 and bar%2==0:continue
        add(at+s/4*beat,.045,lambda t:rng.uniform(-1,1)*math.exp(-t*130),.031 if s%2 else .041,.5 if s%2 else -.5)
    notes=[(0,0,True),(.5,7,False),(1.25,0,False),(1.75,10,True),(2.25,12,False),(3,7,True),(3.5,3,False)]
    for k,interval,accent in notes:
        f=hz(root+interval);add(at+k*beat,.23,lambda t,f=f,accent=accent:acid(t,f,accent),.16 if accent else .12)
    for s in [0,2,3,5,7]:
        f=hz(root+melody[(s+bar*3)%len(melody)]+24);pan=.45 if s%2 else -.45
        add(at+s/2*beat,.33,lambda t,f=f:glass(t,f),.064,pan)
        add(at+(s/2+.75)*beat,.26,lambda t,f=f:glass(t,f),.012,-pan)
peak=max(max(abs(v) for v in left),max(abs(v) for v in right));pcm=bytearray();energy=0
for i,pair in enumerate(zip(left,right)):
    fade=min(1,i/rate/.015,(length-i/rate)/.22)
    for v in pair:
        v=math.tanh(v/peak*1.22)*.86*fade;energy+=v*v;pcm.extend(struct.pack('<h',round(v*32767)))
with wave.open(a.output,'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm)
print(json.dumps({'path':a.output,'durationSeconds':length,'bpm':bpm,'style':'breakbeat','patch':'acid-bass and glass-fm lead','seed':a.seed,'rms':round(math.sqrt(energy/(rate*length*2)),4),'provenance':'Original procedural MIT synthesis, fresh melody/breakbeat patterns; no external recordings or samples'}))

