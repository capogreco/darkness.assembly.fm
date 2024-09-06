export const get_wake_lock = async () => {
   if (!(`wakeLock` in navigator)) return
   const wake_lock = await navigator.wakeLock.request (`screen`)
   wake_lock.onrelease = () => location.reload ()
}
