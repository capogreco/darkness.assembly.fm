import { splash } from "/etc/synth_splash.js"
import { get_wake_lock } from "./etc/wake_lock.js"

document.body.style.background = `black`
document.body.style.overflow = `hidden`
document.body.style.margin = 0
document.body.appendChild (splash)

const cnv = document.createElement (`canvas`)
cnv.width = globalThis.innerWidth
cnv.height = globalThis.innerHeight

const ctx = cnv.getContext (`2d`)

const a = {
   is_init: false,
   ctx: new AudioContext (),
   samples: [],
   current_sample: 0,
   wave_form: [],
}

const audio_assets = [ 
   `music_&_language`, 
   `monotony_&_chaos`,
]

const get_audio = async file_name => {
   const response = await fetch (`/etc/${ file_name }.mp3`)
   const array_buffer = await response.arrayBuffer ()
   const audio_data = await a.ctx.decodeAudioData (array_buffer)
   return await audio_data.getChannelData (0)
}

const init_audio = async () => {
   await a.ctx.resume ()
   a.is_init = true

   for (const n of audio_assets) a.samples.push (await get_audio (n))

   for (let y = 0; y < cnv.height; y++) {
      const audio_data = a.samples [a.current_sample]
      const norm_wave = audio_data [Math.floor (audio_data.length * y / cnv.height)]
      const x = (1 + norm_wave) * (cnv.width / 2)
      a.wave_form.push (x)
   }

   const audio_data = a.samples [a.current_sample]
   await a.ctx.audioWorklet.addModule (`/etc/glitch_loop_osc.js`)
   a.glo = await new AudioWorkletNode (a.ctx, `glitch_loop_osc`, {
      processorOptions: {
         audio_data
      }
   })

   a.glo.port.onmessage = e => {
      a.phase = e.data
   }

   a.freq  = await a.glo.parameters.get (`freq`)
   a.fulcrum = await a.glo.parameters.get (`fulcrum`)
   a.open = await a.glo.parameters.get (`open`)

   a.glo.connect (a.ctx.destination)

   draw_frame ()
}

const draw_frame = ms => {
   // const t = ms * 0.001
   a.glo.port.postMessage (`get_phase`)   

   ctx.fillStyle = `indigo`
   ctx.fillRect (0, 0, cnv.width, cnv.height)

   ctx.beginPath ()
   a.wave_form.forEach ((x, y) => {
      ctx.lineTo (x, y)      
   })

   ctx.strokeStyle = `deeppink`
   ctx.stroke ()

   ctx.beginPath ()
   const y = Math.floor (a.phase * cnv.height)
   ctx.moveTo (0, y)
   ctx.lineTo (cnv.width, y)
   ctx.strokeStyle = `white`
   ctx.stroke ()

   requestAnimationFrame (draw_frame)
}

splash.onpointerdown = async e => {
   if (!a.is_init) {
      await init_audio ()
      await get_wake_lock ()
      splash.remove ()
      document.body.appendChild (cnv)
      // draw_frame ()
   }
}

const oscillate = async () => {
   const t = a.ctx.currentTime

   a.freq.setValueAtTime (660 * Math.pow (2, Math.random ()), t)

   a.fulcrum.cancelScheduledValues (t)
   a.fulcrum.setValueAtTime (a.phase, t)
   a.fulcrum.linearRampToValueAtTime (Math.random (), t + 2)

   a.open.cancelScheduledValues (t)
   a.open.setValueAtTime (a.open.value, t)
   a.open.linearRampToValueAtTime (0, t + 12)
}

const loop = async () => {
   const t = a.ctx.currentTime
   a.open.cancelScheduledValues (t)
   a.open.setValueAtTime (a.open.value, t)
   a.open.linearRampToValueAtTime (1, t + 12)
}

const es = new EventSource (`/api/listen`)
es.onmessage = e => {
   const { type } = JSON.parse (e.data)
   if (type === `update`) {
      const { msg: { mode } } = JSON.parse (e.data)
      if (mode === `osc`) oscillate ()
      if (mode === `loop`) loop ()
   }    
   // console.log (mode)

   // const { type, message } = JSON.parse (e.data)
   // if (type === `welcome`) {
   //    console.log (message)
   //    return
   // }
   // console.log (message)
}

