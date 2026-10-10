import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { createDisplacementMap } from '../src/optics.js';

// Golden byte digests from the released 0.9 source (bb1f647), not from the
// optimized distance calculation. Cover odd/maximum dimensions and corner cases.
const fixtures: [number, number, number, string][] = [
  [1, 1, Infinity, '79dfad351f79ef0e65a11fff0a9ed44bf628f9390ff06b92ee4ee5e2477616ea'],
  [2, 7, 0, '213d6b5ad64e4a9efbdd1b72471d2d61163ec0f497d811e9294e36f32f7a867d'],
  [37, 19, 0, '1d03ff96b7daa835153907aab833a6fc0d115b56237de611d72292ef26286b3d'],
  [37, 19, 1.5, '518aca0fd9d2c11f379f4f3149f42a1bdb2966cbbc683539108ba9572b317c15'],
  [37, 19, 200, '33abf0042d3f35fc5693ac596b1fc4f30a9bbec0f344fe51f1f51ceb22b6f515'],
  [127, 63, NaN, '7e877ffe5a7866350f968347c3cc6961ccb448f75d45f6f08e5413b2b0bc4e17'],
  [256, 160, 28, '2f42782fa7d642a6ee5e536989d739e44c81421e370d5828cf26678a9c2fcde8'],
  [512, 512, 128, '70ea53ee171b1246fa0f9fc4f9eb1ec00b965b48490d3c53a1854c441fbd6d1c'],
  [43, 87, 21.125, 'ca7a257194a7a8396cae523d57b154195125ef032771ccc64678419d236bd3b3'],
  [100, 80, 20, '2825a15fa380098e0ba72702f45b446123faa38bfa913d830b9ce757ea83e99e'],
];

it.each(fixtures)('preserves released displacement bytes for %s×%s, radius %s', (width, height, radius, digest) => {
  expect(createHash('sha256').update(createDisplacementMap(width, height, radius)).digest('hex')).toBe(digest);
});
