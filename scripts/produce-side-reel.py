"""Render the original Side Reel Studio tracks and their cover art."""
from pathlib import Path
import json
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import butter, sosfilt

RATE = 32000
ROOT = Path(__file__).resolve().parents[1]
RECORDS = ROOT / "public" / "side-reel" / "records"
RECORDS.mkdir(parents=True, exist_ok=True)
# Catalog, tempo, tonic, four chord roots in semitones, melodic phrase, art colors.
TRACKS = [
    ("viaduct", "Viaduct at Night", "Brazilian phonk", 137, 41, [0, -3, -5, -2], [0, 7, 3, 9, 7, 2, 3, 12], "#e7ba88", "#6e2d42"),
    ("steering", "Opposite Lock", "Drift phonk", 151, 38, [0, -2, 3, -5], [7, 8, 10, 7, 3, 5, 8, 0], "#efa1ba", "#452851"),
    ("switchback", "Switchback Signal", "Hardstyle", 155, 42, [0, -3, 4, -5], [0, 7, 10, 12, 10, 15, 7, 5], "#b8dfec", "#263a79"),
    ("rollers", "Rollers at 3 AM", "Drum and bass", 174, 36, [0, 7, 5, 3], [3, 10, 2, 7, 9, 12, 7, 3], "#a4e8bd", "#1f5455"),
    ("heliopause", "Heliopause", "Melodic house", 125, 46, [0, -5, -3, 4], [7, 9, 12, 7, 14, 12, 10, 5], "#f1d49e", "#4d4586"),
    ("pinch", "Pinch Point", "Bass house", 128, 41, [0, 0, -2, 3], [0, 12, 7, 0, 2, 5, 7, 3], "#e8d6ae", "#304b35"),
    ("lowline", "Low Line", "Trap instrumental", 145, 37, [0, -3, 4, 2], [7, 10, 14, 12, 3, 7, 5, 12], "#d3c5f2", "#453d76"),
    ("checkpoint", "Checkpoint Glass", "UK garage", 132, 44, [0, -4, 3, -2], [7, 2, 9, 10, 5, 12, 14, 9], "#d5b0eb", "#635034"),
    ("shuttle", "Shuttle Run", "Electronic edit", 142, 39, [0, 3, -2, 5], [12, 7, 0, 3, 10, 15, 17, 12], "#edc79d", "#783d39"),
    ("balcony", "Weather on the Balcony", "Atmospheric electronic", 101, 47, [0, -4, 2, -2], [7, 11, 14, 9, 7, 4, 6, 12], "#addadd", "#304557"),
    ("overpass", "Empty Overpass", "Synthwave", 107, 40, [0, -3, 2, 4], [12, 10, 7, 15, 19, 15, 17, 12], "#f58c99", "#40428d"),
    ("paper", "Paper Satellites", "Lo-fi", 86, 46, [0, 4, 1, 6], [7, 14, 10, 17, 9, 6, 11, 14], "#f1ce96", "#525c44"),
    ("zero", "The Zero Meridian", "Cinematic instrumental", 92, 43, [0, 3, -5, 5], [0, 7, 12, 15, 10, 7, 17, 14], "#d6bbab", "#49333c"),
    ("bluehour", "Blue Hour Ferry", "Chill house", 114, 42, [0, 5, 2, -3], [9, 7, 5, 12, 14, 7, 10, 17], "#afe7d5", "#325880"),
]
DRUMS = [
    ([0, 1.5, 2.5, 3.25], [1, 3], 8), ([0, 1, 2.5, 3], [1, 3], 8),
    ([0, 1, 2, 3], [1, 3], 8), ([0, 2.5], [1, 3], 8), ([0, 1, 2, 3], [1, 3], 4),
    ([0, 1, 2, 3], [1, 3], 8), ([0, 1.75, 2.5, 3.5], [2], 8), ([0, 1.75, 2.5], [1, 3.25], 8),
    ([0, 1, 2, 3], [1, 3], 8), ([0, 2], [2.5], 4), ([0, 1.5, 2, 3], [1, 3], 8),
    ([0, 1.5, 2.5], [1, 3], 4), ([0, 2], [3], 4), ([0, 1, 2, 3], [1, 3], 4),
]
BARS = 24

def filtered(data, kind, cutoff):
    return sosfilt(butter(2, cutoff, btype=kind, fs=RATE, output="sos"), data)

def setup_drums(rng, track):
    t = np.arange(int(RATE * .58)) / RATE
    kick_freq = 41 + track % 5 * 4
    kick = np.sin(2 * np.pi * (kick_freq*t + 33 * (1 - np.exp(-t * 36)) / 36)) * np.exp(-t * (9+track%3*3))
    kick += .105 * filtered(rng.normal(0, 1, len(t)), "highpass", 1600) * np.exp(-t * 140)
    noise = rng.normal(0, 1, len(t))
    snare = .66 * filtered(noise, "bandpass", [1250, 8100]) * np.exp(-t * 27)
    snare += .28 * np.sin(2*np.pi * (179*t + 18*(1-np.exp(-t*30))/30)) * np.exp(-t * 22)
    snare *= .85 + .15*np.cos(2*np.pi*63*t)
    hat = filtered(rng.normal(0, 1, len(t)), "highpass", 6100) * np.exp(-t * 65)
    fx = np.sin(2*np.pi * (325*t-238*t*t)) * np.exp(-t * 8)
    return kick, snare, hat, fx

def hz(midi):
    return 440*2**((midi-69)/12)

def voice(length, note, kind, shade):
    t = np.arange(max(4, int(length * RATE))) / RATE
    phase = 2 * np.pi * hz(note) * t + .09*np.sin(2*np.pi*(3.2+shade%4*.57)*t)
    if kind == "pad":
        sound = np.sin(phase)+.25*np.sin(phase*2.002)+.22*np.sin(phase*.997)
        envelope = np.clip(t/.19, 0, 1)*np.clip((length-t)/.23, 0, 1)
    elif kind == "bass":
        sound = np.tanh(1.6*(np.sin(phase)+.32*np.sin(phase*2+.35)))+.19*np.sin(phase*3)*np.exp(-t*7)
        envelope = np.clip(t/.022, 0, 1)*np.clip((length-t)/.09, 0, 1)*np.exp(-t*(.7+shade%6*.17))
    else:
        ratio = [1.55,1.47,1.501,1.982,2,1.996,2.49,2,3,2.13,2.004,1.996,2,3][shade]
        sound = np.sin(phase+np.exp(-t*(2.4+shade%4))*1.44*np.sin(ratio*phase))+.28*np.sin(2.001*phase)*np.exp(-t*6)
        envelope = np.clip(t/.011, 0, 1)*np.clip((length-t)/.12, 0, 1)*np.exp(-t*(1.9+shade%5*.49))
    return sound * envelope

def produce(track_index, track):
    key, title, genre, bpm, root, harmony, melody, _, _ = track
    beat = 60 / bpm
    duration = 4 * beat * BARS + 1
    mix = np.zeros((int(duration * RATE), 2))
    rng = np.random.default_rng(2600 + track_index)
    kick, snare, hat, fx = setup_drums(rng, track_index)
    kick_steps, backbeats, hat_steps = DRUMS[track_index]
    def place(wave, at, gain, pan=0):
        start = int(at * RATE)
        stop = min(len(mix), start + len(wave))
        if stop <= start:
            return
        pan = np.clip(pan, -.98, .98)
        mix[start:stop, 0] += wave[:stop-start]*gain*np.sqrt(.5-pan*.5)
        mix[start:stop, 1] += wave[:stop-start]*gain*np.sqrt(.5+pan*.5)
    def note(midi, at, length, kind, gain, pan=0):
        sample = voice(length, midi, kind, track_index)
        place(sample, at, gain, pan)
        if kind == "lead":
            place(sample, at+beat*.75, gain*.22, -.8+pan*.32)
            place(sample, at+beat*1.5, gain*.09, .66-pan*.2)
    for bar in range(BARS):
        at = 4*bar*beat
        section = "intro" if bar < 4 else "verse" if bar < 8 else "first drop" if bar < 12 else "break" if bar < 16 else "second drop" if bar < 22 else "outro"
        chord = harmony[bar % 4]
        drop = section in ("first drop", "second drop")
        quiet = section in ("intro", "break", "outro")
        intervals = [0, 3, 7, 10] if track_index in (0, 1, 2, 5, 6, 8, 10, 12) else [0, 4, 7, 11]
        for k, interval in enumerate(intervals):
            note(root + 12 + chord + interval, at, beat*4.11, "pad", (.13 if quiet else .085)*(1-k*.13), -.68+k*.42)
        if section not in ("intro", "outro") or bar in (2, 3, 22):
            pattern = [0, .75, 1.5, 2.5, 3.25] if drop else [0, 2.0]
            for idx, step in enumerate(pattern):
                if quiet and idx > 0:
                    continue
                shift = (0, 0, 12, 7, 0)[idx] if drop else 0
                note(root + chord + shift, at+step*beat, beat*(.77 if drop else 1.6), "bass", .30 if drop else .15)
        phrase=[0,.75,1.25,2.5,3.25] if drop else [0,1.5,2.75]
        if section=="break":
            phrase=[.18,2.3]
        for j, step in enumerate(phrase):
            k = (bar*3 + j + (2 if section=="second drop" else 0)) % len(melody)
            octave = 24 if track_index in (0, 1, 12) else 12
            note(root + melody[k] + octave + (12 if drop and bar%5==0 and j==3 else 0), at+step*beat, beat*(.62 if drop else 1.25), "lead", .14 if drop else .1, (.4 if j%2 else -.4))
        if not quiet or bar == 3:
            for step in kick_steps if drop else kick_steps[:2]:
                place(kick, at+step*beat, .69 if drop else .40)
            for step in backbeats:
                place(snare, at+step*beat, .27 if drop else .19, -.07)
            for step in range(hat_steps):
                stagger = .055 if step%2 else 0
                place(hat, at + (step*4/hat_steps+stagger)*beat, (.075 if step%2 else .11)*(1 if drop else .65), .32*(-1)**step)
        if bar in (7, 15, 21):
            for step in np.arange(2.5, 4, .25):
                place(snare, at+step*beat, .068+(step-2.5)*.095, float(np.sin(step*4)*.36))
            place(fx[::-1], at+4*beat-.58, .16, .3)
        if bar in (8, 16):
            place(fx, at, .21, -.2)
    # Stereo bus: high-pass, gentle saturation, dynamic gain and peak ceiling.
    mix = filtered(mix.T, "highpass", 32).T
    mix = np.tanh(mix*1.40)
    rms = np.sqrt(np.mean(mix**2)) + .0001
    level = np.clip(.18/rms, .78, 2.7)
    mix = np.tanh(mix * level)
    mix *= min(1, .94/(np.max(np.abs(mix))+.0001))
    fades = np.ones(len(mix));fade=int(.95*RATE)
    fades[:fade]=np.linspace(0,1,fade);fades[-fade:]=np.linspace(1,0,fade)
    pcm = (mix*fades[:,None]*32767).astype("<i2")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "2", "-i", "pipe:",
      "-metadata", f"title={title}", "-metadata", "artist=Side Reel Studio", "-metadata", f"genre={genre}", "-q:a", "4",
      str(RECORDS / f"{key}.mp3")], input=pcm.tobytes(), check=True)
    return round(duration, 1)

def cover(index, track):
    key, title, genre, _, _, _, _, light, dark=track
    size=420
    im=Image.new("RGB",(size,size),dark)
    draw=ImageDraw.Draw(im,"RGBA")
    rng=np.random.default_rng(index+9)
    for j in range(60):
        at=int(j*7.4)
        draw.line((0,at,size,at-44-index*3),fill=(0,0,0,8+j%9),width=2+j%5)
    for j in range(600):
        x,y=rng.integers(0,size,2)
        draw.point((x,y),fill=(245,232,216,31))
    ink=tuple(int(light[i:i+2],16) for i in (1,3,5))
    for n in range(8):
        angle=np.linspace(0,2*np.pi,100)
        d=28+n*13
        radius=d*np.sin(angle*(index%3+2)+n*.34)*.21+d
        x=210+radius*np.cos(angle)*1.28
        y=185+radius*np.sin(angle)*.78+n*1.7
        draw.line(list(zip(x,y)),fill=(*ink,128+n*11),width=2+(n%3==0))
    draw.rectangle((20,20,400,400),outline=(*ink,104),width=1)
    font="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    bold="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    draw.text((31,31), "SIDE REEL STUDIO",font=ImageFont.truetype(bold,12),fill=light)
    draw.text((384,27), f"{index+1:02d}",font=ImageFont.truetype(bold,23),fill=light,anchor="ra")
    size=29
    while draw.textlength(title,font=ImageFont.truetype(bold,size))>350:
        size-=1
    draw.text((31,325),title,font=ImageFont.truetype(bold,size),fill="#f6eddd")
    draw.text((33,368),genre.upper(),font=ImageFont.truetype(font,13),fill=light)
    im.save(RECORDS / f"{key}.webp",quality=88,method=6)

catalog=[]
for index,track in enumerate(TRACKS):
    duration=produce(index,track)
    cover(index,track)
    key,title,genre,*_=track
    catalog.append({"id":key,"title":title,"genre":genre,"artist":"Side Reel Studio","duration":duration,
        "source":f"/side-reel/records/{key}.mp3","art":f"/side-reel/records/{key}.webp","color":track[-1]})
(ROOT/"src"/"handset"/"record-catalog.json").write_text(json.dumps(catalog,indent=2)+"\n")
