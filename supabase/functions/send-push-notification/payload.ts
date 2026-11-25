// Notification text is built from server-side data only: the homegame name comes
// from the database, and the date is accepted only in YYYY-MM-DD form.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_NAME = 60

export function buildNotification(homegameName: unknown, sessionDate: unknown) {
  const name = typeof homegameName === 'string' && homegameName.trim()
    ? homegameName.trim().slice(0, MAX_NAME)
    : 'Homegame'
  const date = typeof sessionDate === 'string' && DATE_RE.test(sessionDate) ? sessionDate : null
  return {
    title: `${name} - New Session`,
    body: `A new session has been logged${date ? ` for ${date}` : ''}. Check your results!`,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    url: '/sessions',
  }
}
