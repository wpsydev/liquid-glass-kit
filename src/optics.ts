/** A bounded rounded-rectangle lens, with an undistorted center.
 * R/G encode surface normals; 128 is the neutral displacement value.
 * This is a stylized height-field lens, not a physical simulation of Apple's renderer.
 */
export function createDisplacementMap(width: number, height: number, radius: number): Uint8ClampedArray {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 512 || height > 512)
    throw new RangeError('Map dimensions must be integers between 1 and 512');
  const r = Math.min(Math.max(Number.isFinite(radius) ? radius : 0, 0), Math.min(width, height) / 2);
  const band = Math.max(2, Math.min(24, Math.min(width, height) / 4));
  const distance = (x: number, y: number) => {
    const qx = Math.abs(x - width / 2) - (width / 2 - r);
    const qy = Math.abs(y - height / 2) - (height / 2 - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const d = distance(x + .5, y + .5);
    const edge = Math.max(0, 1 - Math.abs(d) / band);
    const nx = (distance(x + 1, y + .5) - distance(x, y + .5));
    const ny = (distance(x + .5, y + 1) - distance(x + .5, y));
    const i = (y * width + x) * 4;
    pixels[i] = 128 + 120 * nx * edge * edge;
    pixels[i + 1] = 128 + 120 * ny * edge * edge;
    pixels[i + 2] = 128; pixels[i + 3] = 255;
  }
  return pixels;
}
