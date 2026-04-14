import h3 from './h3.webp';
import h4 from './h4.webp';
import h5 from './h5.webp';
import h6 from './h6.webp';
import h7 from './h7.webp';
import h8 from './h8.webp';
import h9 from './h9.webp';
import h10 from './h10.webp';
import h11 from './h11.webp';
import h12 from './h12.webp';

const HEATER_IMAGES: Record<number, string> = {
  3: h3, 4: h4, 5: h5, 6: h6, 7: h7,
  8: h8, 9: h9, 10: h10, 11: h11, 12: h12,
};

export function getHeaterImage(streak: number): string | null {
  if (streak < 3) return null;
  if (streak > 12) return HEATER_IMAGES[12];
  return HEATER_IMAGES[streak];
}
