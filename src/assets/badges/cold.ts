import c3 from './c3.webp';
import c4 from './c4.webp';
import c5 from './c5.webp';
import c6 from './c6.webp';
import c7 from './c7.webp';
import c8 from './c8.webp';
import c9 from './c9.webp';
import c10 from './c10.webp';
import c11 from './c11.webp';
import c12 from './c12.webp';

const COLD_IMAGES: Record<number, string> = {
  3: c3, 4: c4, 5: c5, 6: c6, 7: c7,
  8: c8, 9: c9, 10: c10, 11: c11, 12: c12,
};

export function getColdImage(streak: number): string | null {
  if (streak < 3) return null;
  if (streak > 12) return COLD_IMAGES[12];
  return COLD_IMAGES[streak];
}
