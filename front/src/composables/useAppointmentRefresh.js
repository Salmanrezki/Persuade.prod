import { onMounted, onUnmounted } from 'vue'

// Refresh on return to the tab and after a local acceptance, as well as across devices.
export function useAppointmentRefresh(refresh) {
  let timer,
    pending = false,
    disposed = false
  const run = async () => {
    if (pending || disposed || document.hidden) return
    pending = true
    try {
      await refresh()
    } finally {
      pending = false
    }
  }
  onMounted(() => {
    timer = window.setInterval(run, 15000)
    window.addEventListener('focus', run)
    window.addEventListener('appointments-updated', run)
  })
  onUnmounted(() => {
    disposed = true
    window.clearInterval(timer)
    window.removeEventListener('focus', run)
    window.removeEventListener('appointments-updated', run)
  })
}
