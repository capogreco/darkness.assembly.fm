document.body.style.background = `black`
document.body.style.overflow = `hidden`
document.body.style.margin = 0

const div = document.createElement (`div`)
div.innerText = `stopped`
div.style.color = `white`
div.style.position = `absolute`
div.style.top = `50%`
div.style.left = `50%`
div.style.transform = `translate(-50%, -50%)`
document.body.appendChild (div)

const active_notes = []
let is_playing = false

const key_to_note = k => {
   const key_map = {
      d: 62,
      r: 63,
      f: 64,
      g: 65,
      y: 66,
      h: 67,
      u: 68,
      j: 69,
      i: 70,
      k: 71,
      l: 72,
      p: 73,
   }

   let is_safe = false
   for (const key in key_map) {
      if (k === key) {
         is_safe = true
         break
      }
   }

   if (!is_safe) return false

   return key_map[k]
}

globalThis.onkeydown = e => {

   if (e.key === `Enter`) {
      is_playing = !is_playing
      div.innerText = is_playing ? `playing` : `stopped`
      update_synth ({ is_playing })
      return
   }

   const note = key_to_note (e.key)
   if (!note) return
   if (active_notes.includes (note)) return

   active_notes.push (note)

   update_synth ({ active_notes })

   if (active_notes.length) {
      document.body.style.background = `crimson`
   }

   // if (e.key === `a` && mode === `loop`) {
   //    mode = `osc`
   //    update_synth ({ mode })
   //    document.body.style.background = `crimson`
   //    console.log (`osc mode`)
   // }
}

globalThis.onkeyup = e => {
   const note = key_to_note (e.key)
   if (!note) return
   if (!active_notes.includes (note)) return

   active_notes.splice (active_notes.indexOf (note), 1)

   if (!active_notes.length) {
      document.body.style.background = `black`
   }

   update_synth ({ active_notes })

   // if (e.key === `a` && mode === `osc`) { 
   //    mode = `loop`
   //    update_synth ({ mode })
   //    document.body.style.background = `black`
   //    console.log (`loop mode`)
   // }
}

const update_synth = msg => {
   const payload = { msg, type: `update` }
   const json = JSON.stringify (payload)
   
   fetch (`/api/update`, {
      method: `POST`,
      headers: {
         "Content-Type": `application/json`
      },
      body: json
   })
}


