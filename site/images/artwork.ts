// Original fixtures. Reproduce with create-artwork.py; no runtime dependency.
export const artwork = {
  hero: [
    { src: new URL('./artwork/hero-480.webp?no-inline', import.meta.url).href, width: 480, height: 320, bytes: 3258 },
    { src: new URL('./artwork/hero-960.webp?no-inline', import.meta.url).href, width: 960, height: 640, bytes: 7316 },
    { src: new URL('./artwork/hero-1440.webp?no-inline', import.meta.url).href, width: 1440, height: 960, bytes: 13682 },
  ],
  portrait: [
    { src: new URL('./artwork/portrait-480.webp?no-inline', import.meta.url).href, width: 480, height: 600, bytes: 3818 },
    { src: new URL('./artwork/portrait-960.webp?no-inline', import.meta.url).href, width: 960, height: 1200, bytes: 10986 },
  ],
  paper: [
    { src: new URL('./artwork/paper-480.webp?no-inline', import.meta.url).href, width: 480, height: 320, bytes: 5548 },
    { src: new URL('./artwork/paper-960.webp?no-inline', import.meta.url).href, width: 960, height: 640, bytes: 12782 },
  ],
  orbit: [
    { src: new URL('./artwork/orbit-480.webp?no-inline', import.meta.url).href, width: 480, height: 320, bytes: 3598 },
    { src: new URL('./artwork/orbit-960.webp?no-inline', import.meta.url).href, width: 960, height: 640, bytes: 8130 },
  ],
} as const;
