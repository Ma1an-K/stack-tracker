import highRollerImg from './high_roller.webp';
import donkeyImg from './donkey.webp';
import sharkImg from './shark.webp';
import atmImg from './atm.webp';
import deadMoneyImg from './dead_money.webp';
import whaleImg from './whale.webp';
import grinderImg from './grinder.webp';

const STATIC_BADGE_IMAGES: Record<string, string> = {
  high_roller: highRollerImg,
  donkey: donkeyImg,
  shark: sharkImg,
  atm: atmImg,
  dead_money: deadMoneyImg,
  whale: whaleImg,
  grinder: grinderImg,
};

export function getStaticBadgeImage(badgeId: string): string | null {
  return STATIC_BADGE_IMAGES[badgeId] ?? null;
}
