export interface HomegameIcon {
  id: string;
  label: string;
  src: string;
}

export const HOMEGAME_ICONS: HomegameIcon[] = [
  // Gold
  { id: 'gold-spade',   label: 'Gold Spade',   src: '/homegame-icons/gold-spade.webp' },
  { id: 'gold-heart',   label: 'Gold Heart',   src: '/homegame-icons/gold-heart.webp' },
  { id: 'gold-diamond', label: 'Gold Diamond', src: '/homegame-icons/gold-diamond.webp' },
  { id: 'gold-club',    label: 'Gold Club',    src: '/homegame-icons/gold-club.webp' },
  // Emerald
  { id: 'emerald-spade',   label: 'Emerald Spade',   src: '/homegame-icons/emerald-spade.webp' },
  { id: 'emerald-heart',   label: 'Emerald Heart',   src: '/homegame-icons/emerald-heart.webp' },
  { id: 'emerald-diamond', label: 'Emerald Diamond', src: '/homegame-icons/emerald-diamond.webp' },
  { id: 'emerald-club',    label: 'Emerald Club',    src: '/homegame-icons/emerald-club.webp' },
  // Ruby
  { id: 'ruby-spade',   label: 'Ruby Spade',   src: '/homegame-icons/ruby-spade.webp' },
  { id: 'ruby-heart',   label: 'Ruby Heart',   src: '/homegame-icons/ruby-heart.webp' },
  { id: 'ruby-diamond', label: 'Ruby Diamond', src: '/homegame-icons/ruby-diamond.webp' },
  { id: 'ruby-club',    label: 'Ruby Club',    src: '/homegame-icons/ruby-club.webp' },
  // Diamond
  { id: 'diamond-spade',   label: 'Diamond Spade',   src: '/homegame-icons/diamond-spade.webp' },
  { id: 'diamond-heart',   label: 'Diamond Heart',   src: '/homegame-icons/diamond-heart.webp' },
  { id: 'diamond-diamond', label: 'Diamond Diamond', src: '/homegame-icons/diamond-diamond.webp' },
  { id: 'diamond-club',    label: 'Diamond Club',    src: '/homegame-icons/diamond-club.webp' },
];

export const DEFAULT_ICON_SRC = '/icon-192x192.png';

export function getIconSrc(iconId: string | null | undefined): string {
  if (!iconId) return DEFAULT_ICON_SRC;
  return HOMEGAME_ICONS.find(i => i.id === iconId)?.src ?? DEFAULT_ICON_SRC;
}
