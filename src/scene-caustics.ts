/** Original single-interface planar caustic approximation; see docs/CAUSTICS.md. */
export const causticVertexSource = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec4 uCausticRects[8];
uniform float uCausticRadii[8];
uniform vec4 uCaustics;
uniform vec3 uCausticLight;
layout(location=0) in vec2 aCausticUV;
out vec2 vSource;
out vec2 vReceiver;
flat out vec4 vRect;
flat out float vRadius;
void main() {
  vec2 uv = aCausticUV;
  vRect = uCausticRects[gl_InstanceID];
  vRadius = uCausticRadii[gl_InstanceID];
  vSource = vRect.xy + (uv * 2.0 - 1.0) * vRect.zw;
  vec2 local = vSource - vRect.xy;
  vec2 q = abs(local) - vRect.zw + vRadius;
  vec2 corner = max(q, vec2(0.0));
  float d = min(max(q.x, q.y), 0.0) + length(corner) - vRadius;
  vec2 direction = sign(local);
  vec2 outward = length(corner) > .0001 ? normalize(corner) * direction
    : (q.x > q.y ? vec2(direction.x, 0.0) : vec2(0.0, direction.y));
  float edge = exp(min(0.0, d) / 18.0);
  float t = uTime * uCausticLight.z;
  // Analytic wave slopes: no height texture, finite differences, or CPU mesh upload.
  vec2 p = vSource * .032;
  vec2 slope = vec2(cos(p.x + p.y * .38 + t), cos(p.y - p.x * .43 - t * .77));
  slope += .52 * cos(dot(p, vec2(.73, .91)) + t * .58) * vec2(.73, .91);
  vec3 normal = normalize(vec3(outward * edge * .65 + slope * uCaustics.w * .85, 1.0));
  vec3 incident = normalize(vec3(uCausticLight.xy, -1.0));
  vec3 ray = refract(incident, normal, 1.0 / uCaustics.y);
  vReceiver = vSource + ray.xy * (uCaustics.z / max(.15, -ray.z));
  gl_Position = vec4(vReceiver.x / uResolution.x * 2.0 - 1.0, 1.0 - vReceiver.y / uResolution.y * 2.0, 0.0, 1.0);
}`;

export const causticFragmentSource = `#version 300 es
precision highp float;
uniform vec4 uCaustics;
uniform int uPalette;
in vec2 vSource;
in vec2 vReceiver;
flat in vec4 vRect;
flat in float vRadius;
out vec4 outColor;
float areaCross(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
void main() {
  // Evaluate derivatives before divergent masking. Determinants retain shear,
  // unlike multiplying derivative lengths; folds accumulate with additive blending.
  float sourceArea = abs(areaCross(dFdx(vSource), dFdy(vSource)));
  float receiverArea = abs(areaCross(dFdx(vReceiver), dFdy(vReceiver)));
  vec2 q = abs(vSource - vRect.xy) - vRect.zw + vRadius;
  float d = min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - vRadius;
  float mask = 1.0 - smoothstep(-1.0, 0.0, d);
  float concentration = clamp(sourceArea / max(receiverArea, .00001) - .85, 0.0, 5.0);
  vec3 color = uPalette == 1 ? vec3(1.0, .60, .22) : uPalette == 2 ? vec3(.72, .56, 1.0) : vec3(.38, .90, 1.0);
  outColor = vec4(color * concentration * mask * uCaustics.x, 0.0);
}`;
