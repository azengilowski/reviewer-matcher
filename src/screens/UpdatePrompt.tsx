import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * When a new build is available, the service worker fetches it but waits (see
 * registerType: 'prompt'). This surfaces a small banner so the user chooses
 * when to reload — an open, pinned session is never swapped out mid-edit.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

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
