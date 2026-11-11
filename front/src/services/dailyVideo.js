// Load the pinned browser SDK only when entering a video appointment.
let loading
export function loadDailyVideo() {
  if (window.DailyIframe) return Promise.resolve(window.DailyIframe)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => {
      window.clearTimeout(timeout)
      script.remove()
      loading = undefined
      reject(
        new Error(
          'Impossible de charger la vidéo. Vérifiez votre connexion puis réessayez.',
        ),
      )
    }
    const timeout = window.setTimeout(fail, 15000)
    script.src = 'https://unpkg.com/@daily-co/daily-js@0.93.0/dist/daily.js'
    script.crossOrigin = 'anonymous'
    script.async = true
    script.onerror = fail
    script.onload = () => {
      window.clearTimeout(timeout)
      if (!window.DailyIframe) return fail()
      resolve(window.DailyIframe)
    }
    document.head.appendChild(script)
  })
  return loading
}
