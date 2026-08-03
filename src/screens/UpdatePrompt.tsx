import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often an open tab looks for a newer deploy. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * When a new build is available, the service worker fetches it but waits (see
 * registerType: 'prompt'). This surfaces a small banner so the user chooses
 * when to reload — an open, pinned session is never swapped out mid-edit.
 *
 * The browser only checks for a new service worker on navigation, so a
 * long-lived tab would otherwise never learn about a deploy: we also check on
 * an hourly timer and whenever the tab regains visibility.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      const check = async () => {
        if (registration.installing || !navigator.onLine) return
        try {
          // Probe the SW file first (cache-bypassed) so update() isn't called
          // while offline or when the server is unreachable.
          const resp = await fetch(swUrl, { cache: 'no-store' })
          if (resp.ok) await registration.update()
        } catch {
          /* offline or transient network failure — try again next cycle */
        }
      }
      setInterval(check, CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void check()
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div className="update-toast" role="status" aria-live="polite">
      <span>A new version of Peerfect Match is available.</span>
      <div className="update-toast__actions">
        <button className="btn btn--sm" onClick={() => updateServiceWorker(true)}>
          Refresh
        </button>
        <button
          className="update-toast__dismiss"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss"
        >
          Later
        </button>
      </div>
    </div>
  )
}
