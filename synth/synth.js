document.body.style.background = `black`
document.body.style.overflow = `hidden`
document.body.style.margin = 0

const es = new EventSource (`/api/listen`)
es.onmessage = e => {
   const { type, message } = JSON.parse (e.data)
   if (type === `welcome`) {
      console.log (message)
      return
   }
   console.log (message)
}