"""Reproduce our original geometric still-life fixtures. Pillow is dev-only.
No photographs, fonts, gallery assets or third-party artwork are used.
"""
from pathlib import Path
import random
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
OUT = HERE / "artwork"
OUT.mkdir(exist_ok=True)
SCALE = 4 / 3
SIZE = (1920, 1280)

def coords(values):
    return tuple(round(v * SCALE) for v in values)

def draw_shape(draw, kind, values, **kwargs):
    getattr(draw, kind)(coords(values), **kwargs)

def shadow(image, bounds):
    layer = Image.new("RGBA", SIZE)
    draw_shape(ImageDraw.Draw(layer), "ellipse", bounds, fill=(49, 35, 23, 70))
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(28 * SCALE)))

def texture(image, seed):
    rng = random.Random(seed)
    noise = Image.frombytes("L", SIZE, bytes(max(0, min(255, round(rng.gauss(128, 34)))) for _ in range(SIZE[0] * SIZE[1])))
    tint = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(image.convert("RGB"), tint, 0.055)

def still_life():
    image = Image.new("RGBA", SIZE, "#b6c6ce")
    draw = ImageDraw.Draw(image)
    draw_shape(draw, "rectangle", (0, 657, 1440, 960), fill="#ded9c9")
    shadow(image, (237, 740, 1310, 960))
    draw = ImageDraw.Draw(image)
    # A freestanding terracotta arch: lit face, side thickness, interior cutout.
    draw_shape(draw, "rounded_rectangle", (713, 148, 1172, 840), radius=round(229 * SCALE), fill="#a84c31")
    draw_shape(draw, "rectangle", (713, 388, 1172, 843), fill="#a84c31")
    draw_shape(draw, "rounded_rectangle", (666, 138, 1125, 817), radius=round(229 * SCALE), fill="#d27348")
    draw_shape(draw, "rectangle", (666, 388, 1125, 817), fill="#d27348")
    draw_shape(draw, "rounded_rectangle", (800, 344, 1018, 829), radius=round(109 * SCALE), fill="#99afb9")
    draw_shape(draw, "rectangle", (800, 453, 1018, 831), fill="#99afb9")
    draw_shape(draw, "rectangle", (800, 657, 1018, 831), fill="#c5bfae")
    # Ivory plinth and glazed blue sphere, distinct from the arch's silhouette.
    draw_shape(draw, "rectangle", (208, 486, 612, 797), fill="#cec6b4")
    draw_shape(draw, "ellipse", (208, 392, 612, 590), fill="#ece6d6")
    draw_shape(draw, "ellipse", (208, 688, 612, 883), fill="#cec6b4")
    sphere = Image.new("RGBA", SIZE)
    sd = ImageDraw.Draw(sphere)
    for radius in range(124, 0, -1):
        t = radius / 124
        color = (round(70 + (1-t)*61), round(112 + (1-t)*62), round(143 + (1-t)*47), 255)
        center_x, center_y = 414 - (1-t)*37, 710 - (1-t)*40
        draw_shape(sd, "ellipse", (center_x-radius, center_y-radius, center_x+radius, center_y+radius), fill=color)
    image.alpha_composite(sphere)
    draw = ImageDraw.Draw(image)
    for offset in range(6):
        draw_shape(draw, "line", (680+offset, 380, 680+offset, 800), fill="#dc855d", width=1)
    return texture(image, 1101)

def paper_study():
    image = Image.new("RGBA", SIZE, "#5a78a9")
    shadow(image, (210, 640, 1190, 901))
    draw = ImageDraw.Draw(image)
    for index in range(8):
        offset = index * 11
        points = [(260+offset, 695-offset), (877+offset, 328-offset), (1189+offset, 508-offset), (570+offset, 878-offset)]
        draw.polygon([(round(x*SCALE), round(y*SCALE)) for x,y in points], fill="#d5cbb7" if index%2 else "#eee4cf")
    draw.polygon([(round(x*SCALE), round(y*SCALE)) for x,y in [(248,603),(853,234),(1180,418),(560,785)]], fill="#dd714b")
    draw_shape(draw, "ellipse", (641, 305, 955, 559), fill="#294d81")
    draw_shape(draw, "ellipse", (684, 333, 917, 518), fill="#e19860")
    return texture(image, 1102)

def orbit_study():
    image = Image.new("RGBA", SIZE, "#333b42")
    shadow(image, (148, 682, 1280, 936))
    draw = ImageDraw.Draw(image)
    for index in range(14):
        offset = index*5
        points = [(180, 665+offset),(430, 235+offset),(782, 447+offset),(1125,245+offset),(1260,552+offset),(915,791+offset),(596,594+offset),(310,902+offset)]
        draw.polygon([(round(x*SCALE), round(y*SCALE)) for x,y in points], fill="#aeb4af" if index<13 else "#d3d3be")
    for radius in range(132, 0, -1):
        t=radius/132
        draw_shape(draw,"ellipse",(941-radius-(1-t)*39,530-radius-(1-t)*35,941+radius-(1-t)*39,530+radius-(1-t)*35),fill=(round(164+(1-t)*68),round(132+(1-t)*60),round(46+(1-t)*68),255))
    return texture(image, 1103)

landscape = still_life()
portrait = landscape.crop(coords((576, 0, 1344, 960)))
groups = {"hero": (landscape,[480,960,1440]), "portrait": (portrait,[480,960]), "paper": (paper_study(),[480,960]), "orbit": (orbit_study(),[480,960])}
lines = ["// Original fixtures. Reproduce with create-artwork.py; no runtime dependency.", "export const artwork = {"]
total=0
for name,(image,widths) in groups.items():
    lines.append("  "+name+": [")
    for width in widths:
        height=round(width*image.height/image.width)
        path=OUT/(name+"-"+str(width)+".webp")
        image.resize((width,height),Image.Resampling.LANCZOS).save(path,"WEBP",quality=83,method=6)
        size=path.stat().st_size
        total+=size
        # Vite's explicit no-inline query retains external requests even for a
        # tiny fixture; consistent quality keeps size comparisons meaningful.
        lines.append("    { src: new URL('./artwork/"+path.name+"?no-inline', import.meta.url).href, width: "+str(width)+", height: "+str(height)+", bytes: "+str(size)+" },")
    lines.append("  ],")
lines.append("} as const;")
(HERE/"artwork.ts").write_text("\n".join(lines)+"\n")
print("Original WebP fixtures:",sum(len(widths) for _,widths in groups.values()),"resources,",total,"bytes")
