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
   `abandoning_feminism`,
   `abused_&_abandoned`,
   `cisgendered`,
   `love_our_bodies`,
]

const get_audio = async file_name => {
   const response = await fetch (`/samples/${ file_name }.mp3`)
   const array_buffer = await response.arrayBuffer ()
   const audio_data = await a.ctx.decodeAudioData (array_buffer)
   return await audio_data.getChannelData (0)
}

const rand_int = n => Math.floor (Math.random () * n)

const init_audio = async () => {
   await a.ctx.resume ()
   a.is_init = true

   for (const n of audio_assets) {
      a.samples.push (await get_audio (n))
   }

   a.current_sample = rand_int (a.samples.length)

   const audio_data = a.samples [a.current_sample]
   for (let y = 0; y < cnv.height; y++) {
      const norm_wave = audio_data [Math.floor (audio_data.length * y / cnv.height)]
      const x = (1 + norm_wave) * (cnv.width / 2)
      a.wave_form.push (x)
   }

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

   const impulse_response = await fetch (`/etc/R1NuclearReactorHall.m4a`)
   const array_buf = await impulse_response.arrayBuffer ()
   const audio_buf = await a.ctx.decodeAudioData (array_buf)

   a.rev = a.ctx.createConvolver ()
   a.rev.buffer = audio_buf

   a.wet = a.ctx.createGain ()
   a.wet.gain.value = 0

   a.dry = a.ctx.createGain ()
   a.dry.gain.value = 1

   a.glo.connect (a.dry).connect (a.ctx.destination)
   a.glo.connect (a.wet).connect (a.rev).connect (a.ctx.destination)

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

document.onpointerdown = async e => {
   if (!a.is_init) {
      await init_audio ()
      await get_wake_lock ()
      splash.remove ()
      document.body.appendChild (cnv)
      // draw_frame ()
      a.is_init = true
   }
   else {
      a.current_sample += 1
      a.current_sample %= a.samples.length

      a.glo.disconnect ()
      a.glo = await new AudioWorkletNode (a.ctx, `glitch_loop_osc`, {
         processorOptions: {
            audio_data: a.samples [a.current_sample]
         }
      })

      a.glo.port.onmessage = e => {
         a.phase = e.data
      }
   
      a.freq  = await a.glo.parameters.get (`freq`)
      a.fulcrum = await a.glo.parameters.get (`fulcrum`)
      a.open = await a.glo.parameters.get (`open`)
   
      a.glo.connect (a.ctx.destination)

      a.wave_form = []
      const audio_data = a.samples [a.current_sample]
      for (let y = 0; y < cnv.height; y++) {
         const norm_wave = audio_data [Math.floor (audio_data.length * y / cnv.height)]
         const x = (1 + norm_wave) * (cnv.width / 2)
         a.wave_form.push (x)
      }
   }
}

const midi_to_freq = n => 440 * Math.pow (2, (n - 69) / 12)
const rand_element = a => a[Math.floor (Math.random () * a.length)]


const oscillate = active_notes => {
   const t = a.ctx.currentTime
   const n = rand_element (active_notes)
   const f = midi_to_freq (n) * Math.pow (2, rand_int (3))
   const d = 12 * Math.pow (2, Math.random () * 2) 

   a.freq.cancelScheduledValues (t)
   a.freq.setValueAtTime (a.freq.value, t)
   a.freq.exponentialRampToValueAtTime (f, t + d)

   a.fulcrum.cancelScheduledValues (t)
   a.fulcrum.setValueAtTime (a.phase, t)
   a.fulcrum.linearRampToValueAtTime (Math.random (), t + (d * 1))

   a.open.cancelScheduledValues (t)
   a.open.setValueAtTime (a.open.value, t)
   a.open.linearRampToValueAtTime (0, t + d)

   a.wet.gain.cancelScheduledValues (t)
   a.wet.gain.setValueAtTime (a.wet.gain.value, t)
   a.wet.gain.linearRampToValueAtTime (0.8, t + d)

   a.dry.gain.cancelScheduledValues (t)
   a.dry.gain.setValueAtTime (a.dry.gain.value, t)
   a.dry.gain.linearRampToValueAtTime (0.5, t + d)
}

const loop = () => {
   const t = a.ctx.currentTime
   const d = 12 * Math.pow (2, Math.random () * 2) 

   a.open.cancelScheduledValues (t)
   a.open.setValueAtTime (a.open.value, t)
   a.open.linearRampToValueAtTime (1, t + d)

   a.wet.gain.cancelScheduledValues (t)
   a.wet.gain.setValueAtTime (a.wet.gain.value, t)
   a.wet.gain.linearRampToValueAtTime (0, t + d)

   a.dry.gain.cancelScheduledValues (t)
   a.dry.gain.setValueAtTime (a.dry.gain.value, t)
   a.dry.gain.linearRampToValueAtTime (1, t + d)
}

const es = new EventSource (`/api/listen`)
es.onmessage = e => {
   const { type, msg } = JSON.parse (e.data)
   if (type === `update`) {
      // const { msg: { mode } } = JSON.parse (e.data)
      // const { mode } = msg
      // if (mode === `osc`) oscillate ()
      // if (mode === `loop`) loop ()
      const { active_notes } = msg
      if (active_notes.length) oscillate (active_notes)
      else loop ()
   }    

   if (type === `welcome`) {
      console.log (msg)
   }
}

