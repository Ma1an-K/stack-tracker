export interface HomegameIcon {
  id: string;
  label: string;
  src: string;
}

export const HOMEGAME_ICONS: HomegameIcon[] = [
  { id: 'gold-spade', label: 'Gold Spade', src: '/homegame-icons/gold-spade.webp' },
  { id: 'gold-club', label: 'Gold Club', src: '/homegame-icons/gold-club.webp' },
];

export const DEFAULT_ICON_SRC = '/icon-192x192.png';

export function getIconSrc(iconId: string | null | undefined): string {
  if (!iconId) return DEFAULT_ICON_SRC;
  return HOMEGAME_ICONS.find(i => i.id === iconId)?.src ?? DEFAULT_ICON_SRC;
}
