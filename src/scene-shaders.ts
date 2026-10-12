export const vertexSource = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const wallpaper = `// Shared phases use angle-addition identities. Constant offsets are evaluated
// once at source generation, replacing repeated ribbon sin/cos per fragment.
const vec4 ribbonSinA = vec4(0.0, 0.9886517629, 0.2970413513, -0.8994054097);
const vec4 ribbonCosA = vec4(1.0000000000, 0.1502254699, -0.9548646164, -0.4371154413);
const vec4 ribbonSinB = vec4(0.0, 0.8414709848, 0.9092974268, 0.1411200081);
const vec4 ribbonCosB = vec4(1.0000000000, 0.5403023059, -0.4161468365, -0.9899924966);
const vec3 ribbonColorCos[12] = vec3[12](
  vec3(0.4257792916, -0.9822872507, -0.1873813146),
  vec3(-0.8763066800, -0.2486898872, 0.9685831611),
  vec3(-0.5358267950, 0.9510565163, 0.3090169944),
  vec3(0.8090169944, 0.3681245527, -0.9297764859),
  vec3(0.9685831611, 0.4257792916, -0.9297764859),
  vec3(-0.1873813146, -0.8763066800, -0.4257792916),
  vec3(-0.9921147013, -0.5358267950, 0.8763066800),
  vec3(0.0627905195, 0.8090169944, 0.5358267950),
  vec3(-0.9980267284, -0.4257792916, 0.3090169944),
  vec3(-0.1253332336, -0.9297764859, -0.9297764859),
  vec3(0.9822872507, 0.3090169944, -0.4257792916),
  vec3(0.2486898872, 0.9685831611, 0.8763066800)
);
const vec3 ribbonColorSin[12] = vec3[12](
  vec3(0.9048270525, 0.1873813146, -0.9822872507),
  vec3(0.4817536741, -0.9685831611, -0.2486898872),
  vec3(-0.8443279255, -0.3090169944, 0.9510565163),
  vec3(-0.5877852523, 0.9297764859, 0.3681245527),
  vec3(0.2486898872, 0.9048270525, 0.3681245527),
  vec3(0.9822872507, 0.4817536741, -0.9048270525),
  vec3(-0.1253332336, -0.8443279255, -0.4817536741),
  vec3(-0.9980267284, -0.5877852523, 0.8443279255),
  vec3(0.0627905195, 0.9048270525, 0.9510565163),
  vec3(-0.9921147013, -0.3681245527, 0.3681245527),
  vec3(-0.1873813146, -0.9510565163, -0.9048270525),
  vec3(0.9685831611, 0.2486898872, -0.4817536741)
);

vec3 palette(float phase) {
  if (uPalette == 1) return .55 + .45 * cos(6.2831853 * (phase + vec3(.04, .18, .44)));
  if (uPalette == 2) return .52 + .48 * cos(6.2831853 * (phase + vec3(.49, .32, .20)));
  return .52 + .48 * cos(6.2831853 * (phase + vec3(.18, .47, .72)));
}

// All wallpaper samples use this same global screen coordinate system.
vec3 wallpaper(vec2 point) {
  float unit = max(1.0, min(uResolution.x, uResolution.y));
  vec2 p = (point - uResolution * .5) / unit;
  float t = uTime * .15;
  vec3 col = vec3(.016, .020, .052);
  float ambient = exp(-2.8 * dot(p - vec2(.12, -.05), p - vec2(.12, -.05)));
  col += palette(.56) * ambient * .055;
  // Continuous ribbons: luminous cores and broad halos make edge bending visible.
  float a = p.x * 2.7 + t;
  float b = p.x * 5.1 - t * .74;
  float aSin = sin(a), aCos = cos(a), bSin = sin(b), bCos = cos(b);
  float hue = 6.2831853 * (p.x * .07 + t * .04);
  float hueCos = cos(hue), hueSin = sin(hue);
  int colorOffset = uPalette == 1 ? 4 : uPalette == 2 ? 8 : 0;
  vec2 colorRange = uPalette == 1 ? vec2(.55, .45) : vec2(.52, .48);
  for (int j = 0; j < 4; j++) {
    float k = float(j);
    float center = .36 * (aSin * ribbonCosA[j] + aCos * ribbonSinA[j])
                 + .13 * (bSin * ribbonCosB[j] + bCos * ribbonSinB[j]) + (k - 1.5) * .23;
    float distance = abs(p.y - center);
    float width = .026 + .013 * sin(k * 1.7 + 1.0);
    float c = distance / width;
    float s = distance / (width * 2.4);
    float h = distance / .12;
    float core = exp(-c * c);
    float shoulder = exp(-s * s);
    float halo = exp(-h * h);
    vec3 color = vec3(colorRange.x) + colorRange.y
      * (hueCos * ribbonColorCos[colorOffset + j] - hueSin * ribbonColorSin[colorOffset + j]);
    col += color * (core * .80 + shoulder * .17 + halo * .11);
    col += vec3(.77, .87, 1.0) * core * .12;
  }
  // Fine, moving contour lines are deliberately screen anchored, including under lenses.
  float gridX = abs(sin((p.x + .035 * sin(p.y * 4.0 + t)) * 38.0));
  float gridY = abs(sin((p.y + .025 * cos(p.x * 4.0 - t)) * 38.0));
  float line = 1.0 - smoothstep(.012, .055, min(gridX, gridY));
  col += vec3(.13, .16, .28) * line * .38;
  float vignette = 1.0 - smoothstep(.25, 1.25, length(p * vec2(.80, 1.0)));
  return col * (.68 + .32 * vignette);
}

`;
const roundedBox = `// Rounded-box signed distance and its analytic outward normal: no mask tap stencil.
void roundedBox(vec2 point, vec4 rect, float radius, out float distance, out vec2 normal) {
  vec2 local = point - rect.xy;
  vec2 q = abs(local) - rect.zw + vec2(radius);
  vec2 corner = max(q, vec2(0.0));
  float cornerLength = length(corner);
  distance = min(max(q.x, q.y), 0.0) + cornerLength - radius;
  vec2 direction = vec2(local.x < 0.0 ? -1.0 : 1.0, local.y < 0.0 ? -1.0 : 1.0);
  if (cornerLength > .0001) normal = corner / cornerLength * direction;
  else normal = q.x > q.y ? vec2(direction.x, 0.0) : vec2(0.0, direction.y);
}

`;
const uniforms = `precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform vec2 uDpr;
uniform float uTime;
uniform int uPalette;
uniform int uBackdrop;
uniform int uSolid;
`;

const studio = `
vec3 studio(vec2 point) {
  float unit = max(1.0, min(uResolution.x, uResolution.y));
  vec2 p = (point - uResolution * .5) / unit;
  float t = uTime * .15;
  vec3 paper = vec3(.933, .914, .875);
  vec3 cobalt = vec3(.025, .16, .88);
  vec3 vermilion = vec3(.92, .16, .065);
  vec3 ink = vec3(.022, .028, .040);
  if (uPalette == 1) { cobalt = vec3(.78, .86, .17); vermilion = vec3(.03, .035, .035); ink = vec3(.25, .18, .35); }
  if (uPalette == 2) { cobalt = vec3(.87, .42, .54); vermilion = vec3(.13, .14, .25); ink = vec3(.94, .48, .27); }
  vec3 color = paper + vec3(.035) * (1.0 - smoothstep(.05, .8, length(p)));
  float first = abs(p.x + .16 + .22 * sin(p.y * 3.4 + t * .45));
  color = mix(color, cobalt, 1.0 - smoothstep(.115, .120, first));
  float second = abs(p.y - .25 + .12 * sin(p.x * 4.1 - t * .6));
  color = mix(color, vermilion, 1.0 - smoothstep(.095, .100, second));
  float third = abs(p.x - .24 + .09 * cos(p.y * 4.8 - t * .3));
  color = mix(color, ink, 1.0 - smoothstep(.025, .029, third));
  // Screen-anchored calibration lines reveal edge displacement across every band.
  float stripe = abs(fract((point.x + point.y * .16) / 34.0) - .5) * 34.0;
  float line = 1.0 - smoothstep(.35, .85, stripe);
  color = mix(color, ink, line * .26);
  return color;
}
`;

const mineral = `
vec3 mineral(vec2 point) {
  vec2 p = point / uResolution;
  vec3 color = mix(vec3(.018,.055,.069), vec3(.075,.18,.20), p.y);
  float beam = exp(-pow((p.x + p.y * .32 - .42) * 4.0, 2.0));
  color += vec3(.08,.16,.17) * beam;
  float line = 1.0 - smoothstep(.25,.85,abs(fract(point.y / 48.0) - .5) * 48.0);
  return color + vec3(.020,.033,.033) * line;
}
`;

export const wallpaperSource = `#version 300 es
${uniforms}
uniform sampler2D uCausticMap;
uniform int uCausticActive;
${wallpaper}
${studio}
${mineral}
void main() {
  vec2 point = vec2(gl_FragCoord.x / uDpr.x, uResolution.y - gl_FragCoord.y / uDpr.y);
  vec3 color = uBackdrop == 2 ? mineral(point) : uBackdrop == 1 ? studio(point) : wallpaper(point);
  if (uCausticActive == 1) {
    vec2 uv = vec2(point.x / uResolution.x, 1.0 - point.y / uResolution.y);
    vec2 tap = 1.25 / vec2(textureSize(uCausticMap, 0));
    // A small finite footprint softens singular focal lines without another pass.
    vec3 light = texture(uCausticMap, uv).rgb * .40;
    light += (texture(uCausticMap, uv + vec2(tap.x, 0)).rgb
            + texture(uCausticMap, uv - vec2(tap.x, 0)).rgb
            + texture(uCausticMap, uv + vec2(0, tap.y)).rgb
            + texture(uCausticMap, uv - vec2(0, tap.y)).rgb) * .15;
    color += light;
  }
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

export const fragmentSource = `#version 300 es
${uniforms}
uniform sampler2D uWallpaper;
vec3 wallpaper(vec2 point) {
  return texture(uWallpaper, vec2(point.x / uResolution.x, 1.0 - point.y / uResolution.y)).rgb;
}
void main() {
  vec2 point = vec2(gl_FragCoord.x / uDpr.x, uResolution.y - gl_FragCoord.y / uDpr.y);
  vec3 color = wallpaper(point);
  float grain = fract(sin(dot(floor(point * uDpr), vec2(12.9898, 78.233))) * 43758.5453) - .5;
  outColor = vec4(clamp(color + grain / 255.0, 0.0, 1.0), 1.0);
}`;

export const lensVertexSource = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec4 uRects[8];
uniform vec2 uOptics[8];
flat out vec4 vLensRect;
flat out vec2 vLensOptics;
void main() {
  vLensRect = uRects[gl_InstanceID];
  vLensOptics = uOptics[gl_InstanceID];
  // The omitted shadow tail beyond 96 CSS pixels attenuates less than .00002.
  vec2 corners[6] = vec2[6](vec2(-1,-1), vec2(1,-1), vec2(-1,1), vec2(-1,1), vec2(1,-1), vec2(1,1));
  vec2 point = vLensRect.xy + corners[gl_VertexID] * (vLensRect.zw + 96.0);
  gl_Position = vec4(point.x / uResolution.x * 2.0 - 1.0, 1.0 - point.y / uResolution.y * 2.0, 0.0, 1.0);
}`;

export const lensFragmentSource = `#version 300 es
${uniforms}
uniform sampler2D uWallpaper;
flat in vec4 vLensRect;
flat in vec2 vLensOptics;
vec3 wallpaper(vec2 point) {
  return texture(uWallpaper, vec2(point.x / uResolution.x, 1.0 - point.y / uResolution.y)).rgb;
}
vec3 palette(float phase) {
  if (uPalette == 1) return .55 + .45 * cos(6.2831853 * (phase + vec3(.04, .18, .44)));
  if (uPalette == 2) return .52 + .48 * cos(6.2831853 * (phase + vec3(.49, .32, .20)));
  return .52 + .48 * cos(6.2831853 * (phase + vec3(.18, .47, .72)));
}

${roundedBox}
void main() {
  vec2 point = vec2(gl_FragCoord.x / uDpr.x, uResolution.y - gl_FragCoord.y / uDpr.y);
  float d; vec2 normal;
  roundedBox(point, vLensRect, vLensOptics.x, d, normal);
  float coverage = 1.0 - smoothstep(-.65, .65, d);
  float shadow = d > 0.0 ? exp(-d / 11.0) * .12 : 0.0;
  vec3 glass = vec3(0.0);
  if (coverage > 0.0) {
    if (uSolid == 1) glass = vec3(.050, .059, .105);
    else {
      float depth = max(0.0, -d);
      float edgeWidth = min(35.0, min(vLensRect.z, vLensRect.w) * .42);
      float edge = 1.0 - smoothstep(0.0, max(1.0, edgeWidth), depth);
      vec2 samplePoint = point - normal * vLensOptics.y * edge * edge;
      glass = mix(wallpaper(samplePoint), vec3(.17, .20, .30), .13);
      float incidence = max(0.0, dot(normal, vec2(-.65, -.76)));
      float reflection = incidence * incidence;
      float rim = exp(-depth / 1.45);
      float rimPosition = (depth - 3.5) / 2.7;
      float innerRim = exp(-rimPosition * rimPosition);
      glass += vec3(.67, .82, 1.0) * rim * (.17 + reflection * .63);
      glass += palette(.14) * innerRim * .075;
      glass *= 1.0 - edge * (1.0 - reflection) * .08;
    }
    float grain = fract(sin(dot(floor(point * uDpr), vec2(12.9898, 78.233))) * 43758.5453) - .5;
    glass += grain / 255.0;
  }
  // Source RGB is premultiplied by coverage. Destination weight preserves each
  // lens's shadow then glass mix, in the original surface order.
  outColor = vec4(glass * coverage, (1.0 - shadow) * (1.0 - coverage));
}`;

export const fieldVertexSource = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec4 uField;
uniform vec2 uDirection;
uniform int uMotion;
flat out vec4 vRect;
flat out vec3 vOptics;
float hash(float value) { return fract(sin(value * 12.9898 + uField.w * 78.233) * 43758.5453); }
void main() {
  float id = float(gl_InstanceID);
  float columns = max(1.0, ceil(sqrt(uField.x * uResolution.x / uResolution.y)));
  float rows = ceil(uField.x / columns);
  vec2 slot = vec2(mod(id, columns), floor(id / columns));
  vec2 p = (slot + vec2(.2 + hash(id + .7) * .6, .2 + hash(id + 7.2) * .6)) / vec2(columns, rows);
  vec2 center = p * uResolution;
  float phase = hash(id + 11.0) * 6.2831853;
  // A stopped field keeps geometry fixed while the owned wallpaper may animate.
  float fieldTime = uField.z == 0.0 ? 0.0 : uTime;
  float velocity = uField.z * (.6 + hash(id + 31.0) * .8);
  float travel = uTime * velocity;
  center += uDirection * travel;
  if (uMotion == 1) {
    center += vec2(-uDirection.y, uDirection.x) * sin(fieldTime * .8 + phase + p.x * 5.0) * min(uResolution.x, uResolution.y) * .09;
  } else if (uMotion == 2) {
    vec2 local = (p - .5) * uResolution;
    float angle = uTime * velocity / max(1.0, min(uResolution.x, uResolution.y)) * (uDirection.x + uDirection.y);
    float c = cos(angle), s = sin(angle);
    center = uResolution * .5 + mat2(c, s, -s, c) * local;
  }
  float scale = .65 + hash(id + 19.0) * .8;
  if (id < 8.0) scale *= 4.2;
  else if (mod(id, 257.0) < .5) scale *= 2.7;
  vec2 halfSize = uField.y * scale * vec2(.5, .36 + .16 * hash(id + 43.0));
  vec2 extent = uResolution + halfSize * 4.0;
  center = mod(center + halfSize * 2.0, extent) - halfSize * 2.0;
  float angle = sin(phase + fieldTime * .35) * .24;
  float c = cos(angle), s = sin(angle);
  vec2 corners[6] = vec2[6](vec2(-1,-1), vec2(1,-1), vec2(-1,1), vec2(-1,1), vec2(1,-1), vec2(1,1));
  vec2 point = center + mat2(c, s, -s, c) * (corners[gl_VertexID] * (halfSize + 1.0));
  gl_Position = vec4(point.x / uResolution.x * 2.0 - 1.0, 1.0 - point.y / uResolution.y * 2.0, 0.0, 1.0);
  vRect = vec4(center, halfSize);
  vOptics = vec3(min(halfSize.x, halfSize.y) * .65, angle, .8 + hash(id + 53.0) * .5);
}`;

export const fieldFragmentSource = `#version 300 es
${uniforms}
uniform sampler2D uWallpaper;
flat in vec4 vRect;
flat in vec3 vOptics;
${roundedBox}
void main() {
  vec2 point = vec2(gl_FragCoord.x / uDpr.x, uResolution.y - gl_FragCoord.y / uDpr.y);
  float c = cos(vOptics.y), s = sin(vOptics.y);
  mat2 rotation = mat2(c, s, -s, c);
  vec2 local = transpose(rotation) * (point - vRect.xy);
  float d; vec2 localNormal;
  roundedBox(local, vec4(0.0, 0.0, vRect.zw), vOptics.x, d, localNormal);
  float coverage = 1.0 - smoothstep(-.65, .65, d);
  if (coverage <= 0.0) discard;
  vec3 glass = vec3(.050, .059, .105);
  if (uSolid == 0) {
    vec2 normal = rotation * localNormal;
    float depth = max(0.0, -d);
    float edge = 1.0 - smoothstep(0.0, max(1.0, min(vRect.z, vRect.w) * .7), depth);
    vec2 samplePoint = point - normal * min(vRect.z, vRect.w) * .7 * vOptics.z * edge * edge;
    glass = texture(uWallpaper, vec2(samplePoint.x / uResolution.x, 1.0 - samplePoint.y / uResolution.y)).rgb;
    glass = mix(glass, vec3(.17, .20, .30), .17);
    float incidence = max(0.0, dot(normal, vec2(-.65, -.76)));
    float rim = exp(-depth / 1.15);
    glass += vec3(.67, .82, 1.0) * rim * (.17 + incidence * incidence * .63);
    glass *= 1.0 - edge * (1.0 - incidence) * .08;
  }
  outColor = vec4(clamp(glass, 0.0, 1.0), coverage);
}`;


export const fusionVertexSource = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec4 uFusionBounds;
void main() {
  vec2 corners[6] = vec2[6](vec2(-1,-1), vec2(1,-1), vec2(-1,1), vec2(-1,1), vec2(1,-1), vec2(1,1));
  vec2 point = uFusionBounds.xy + corners[gl_VertexID] * uFusionBounds.zw;
  gl_Position = vec4(point.x / uResolution.x * 2.0 - 1.0, 1.0 - point.y / uResolution.y * 2.0, 0.0, 1.0);
}`;

export const fusionFragmentSource = `#version 300 es
${uniforms}
uniform sampler2D uWallpaper;
uniform int uFusionCount;
uniform vec3 uDrops[8];
uniform vec4 uFusion;

// Circle gradients and the polynomial smooth-min derivative are analytical.
// The derivative of its blend weight cancels, leaving the weighted gradients.
void fusedDistance(vec2 point, out float distance, out vec2 normal) {
  distance = 1e10;
  vec2 gradient = vec2(0.0, -1.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uFusionCount) break;
    vec2 local = point - uDrops[i].xy;
    float lengthLocal = length(local);
    float candidate = lengthLocal - uDrops[i].z;
    vec2 candidateGradient = lengthLocal > .0001 ? local / lengthLocal : vec2(0.0, -1.0);
    if (i == 0 || uFusion.x <= .0001) {
      if (candidate < distance) { distance = candidate; gradient = candidateGradient; }
    } else {
      float h = clamp(.5 + .5 * (candidate - distance) / uFusion.x, 0.0, 1.0);
      distance = mix(candidate, distance, h) - uFusion.x * h * (1.0 - h);
      gradient = mix(candidateGradient, gradient, h);
    }
  }
  float gradientLength = length(gradient);
  normal = gradientLength > .0001 ? gradient / gradientLength : vec2(0.0, -1.0);
}
vec3 sampleWallpaper(vec2 point) {
  return texture(uWallpaper, vec2(point.x / uResolution.x, 1.0 - point.y / uResolution.y)).rgb;
}
void main() {
  vec2 point = vec2(gl_FragCoord.x / uDpr.x, uResolution.y - gl_FragCoord.y / uDpr.y);
  float d; vec2 normal;
  fusedDistance(point, d, normal);
  float coverage = 1.0 - smoothstep(-.65, .65, d);
  float shadow = d > 0.0 ? exp(-d / 12.0) * .17 : 0.0;
  vec3 glass = vec3(0.0);
  if (coverage > 0.0) {
    if (uSolid == 1) glass = vec3(.050, .059, .105);
    else {
      float depth = max(0.0, -d);
      float edge = 1.0 - smoothstep(0.0, uFusion.w, depth);
      vec2 samplePoint = point - normal * uFusion.y * edge * edge;
      glass = sampleWallpaper(samplePoint);
      if (uFusion.z > 0.0) {
        vec2 split = normal * uFusion.z * edge * edge;
        glass.r = sampleWallpaper(samplePoint - split).r;
        glass.b = sampleWallpaper(samplePoint + split).b;
      }
      glass = mix(glass, vec3(.97, .985, 1.0), .035);
      float incidence = max(0.0, dot(normal, vec2(-.6, -.8)));
      float opposite = max(0.0, dot(normal, vec2(.6, .8)));
      float rim = exp(-depth / 1.65);
      float innerPosition = (depth - 4.0) / 3.0;
      float inner = exp(-innerPosition * innerPosition);
      // A bright upper-left reflection and dark lower-right rim remain visible
      // on light paper. They are independent from refractive displacement.
      glass *= 1.0 - edge * edge * (.11 + opposite * .14);
      glass += vec3(.95, .98, 1.0) * rim * (.12 + incidence * incidence * .85);
      glass += vec3(.10, .14, .22) * inner * incidence * .18;
      glass -= vec3(.16) * rim * opposite;
    }
    float grain = fract(sin(dot(floor(point * uDpr), vec2(12.9898, 78.233))) * 43758.5453) - .5;
    glass += grain / 255.0;
  }
  outColor = vec4(glass * coverage, (1.0 - shadow) * (1.0 - coverage));
}`;

type PixelEdgeSources = Readonly<{
  lensVertex: string; lensFragment: string;
  fieldVertex: string; fieldFragment: string;
  fusionVertex: string; fusionFragment: string;
}>;
let pixelEdgeSources: PixelEdgeSources | undefined;

/**
 * Original GLSL ES 3.00 coverage math, derived from Khronos derivative behavior.
 * Legacy strings above remain unchanged; optional variants allocate only when
 * pixel quality actually needs an optics pipeline. fwidth is computed at the
 * uniform main call point AFTER distance helpers have reconverged, BEFORE any
 * coverage branch/discard. It never runs inside the helpers or vertex shaders.
 * The half-band is bounded by the actual X+Y CSS footprint of backing pixels;
 * a positive floor keeps smoothstep endpoints ordered on degenerate gradients.
 * This is a local coverage approximation, not MSAA or subpixel reconstruction.
 */
export function scenePixelEdgeSources(): PixelEdgeSources {
  if (pixelEdgeSources) return pixelEdgeSources;
  const coverage = `  // Evaluate once in uniform control flow, before coverage branches/discard.
  float edgeFootprint = fwidth(d);
  float edgePixelCap = max(.0001, 1.0 / uDpr.x + 1.0 / uDpr.y);
  float edgeHalfBand = clamp(.5 * edgeFootprint, .0001, edgePixelCap);
  float coverage = 1.0 - smoothstep(-edgeHalfBand, edgeHalfBand, d);`;
  const fragment = (source: string) => source.replace('  float coverage = 1.0 - smoothstep(-.65, .65, d);', coverage);
  // Extra extent covers the new AA band plus a conservative derivative
  // neighborhood when a small backing budget makes one pixel span many CSS px.
  const padded = (source: string, from: string, to: string) => source
    .replace('uniform vec2 uResolution;', 'uniform vec2 uResolution;\nuniform vec2 uDpr;')
    .replace(from, to);
  const pad = 'max(1.0, 2.0 * (1.0 / uDpr.x + 1.0 / uDpr.y))';
  pixelEdgeSources = Object.freeze({
    lensVertex: padded(lensVertexSource, 'vLensRect.zw + 96.0', 'vLensRect.zw + max(96.0, ' + pad + ')'),
    lensFragment: fragment(lensFragmentSource),
    fieldVertex: padded(fieldVertexSource, 'halfSize + 1.0', 'halfSize + ' + pad),
    fieldFragment: fragment(fieldFragmentSource),
    fusionVertex: padded(fusionVertexSource, 'uFusionBounds.zw;', '(uFusionBounds.zw + vec2(' + pad + '));'),
    fusionFragment: fragment(fusionFragmentSource),
  });
  return pixelEdgeSources;
}
