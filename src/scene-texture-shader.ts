/** Original owned-media receiver; default scene shader strings are untouched. */
export const ownedTextureFragmentSource = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform vec2 uDpr;
uniform sampler2D uOwnedSource;
uniform vec4 uSourceMapping;
uniform vec3 uSourceMatte;
uniform sampler2D uCausticMap;
uniform int uCausticActive;
void main() {
  vec2 point = vec2(gl_FragCoord.x / uDpr.x, uResolution.y - gl_FragCoord.y / uDpr.y);
  vec2 uv = (point - uSourceMapping.xy) / uSourceMapping.zw;
  vec3 color = uSourceMatte;
  if (all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0)))) {
    vec4 source = texture(uOwnedSource, uv);
    color = mix(uSourceMatte, source.rgb, source.a);
  }
  if (uCausticActive == 1) {
    vec2 receiverUV = vec2(point.x / uResolution.x, 1.0 - point.y / uResolution.y);
    vec2 tap = 1.25 / vec2(textureSize(uCausticMap, 0));
    vec3 light = texture(uCausticMap, receiverUV).rgb * .40;
    light += (texture(uCausticMap, receiverUV + vec2(tap.x, 0)).rgb
            + texture(uCausticMap, receiverUV - vec2(tap.x, 0)).rgb
            + texture(uCausticMap, receiverUV + vec2(0, tap.y)).rgb
            + texture(uCausticMap, receiverUV - vec2(0, tap.y)).rgb) * .15;
    color += light;
  }
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;
