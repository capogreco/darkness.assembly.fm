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
   wave_forms: [],
   phase: 0,
   slow_mode: true,
}

const audio_assets = [ 
   `aydin_sari`,
   `brian_rodrigo_llagas`,
   `christian_aditya`,
   `hamid_taheri`,
   `joel_humphries`,
   `minnie_park`,
   `mohamad_shahazrin_airiel_bin_mat_azli`,
   `nadia_egalita`,
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


   for (let i = 0; i < a.samples.length; i++) {
      const audio_data = a.samples [i]
      a.wave_forms.push ([])
      for (let y = 0; y < cnv.height; y++) {
         const norm_wave = audio_data [Math.floor (audio_data.length * y / cnv.height)]
         const x = (1 + norm_wave) * (cnv.width / 2)
         a.wave_forms[i].push (x)
      }
      console.log (a.wave_forms[i].length)
   }

   await a.ctx.audioWorklet.addModule (`/etc/glitch_loop_osc.js`)
   a.glo = await new AudioWorkletNode (a.ctx, `glitch_loop_osc`, {
      processorOptions: {
         audio_array: a.samples,
         audio_index: a.current_sample,
      }
   })

   a.glo.port.onmessage = e => {
      if (e.data.type === `phase`) {
         a.phase = e.data.value
         a.current_sample = e.data.index
      }
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

   a.vib = a.ctx.createOscillator ()
   a.vib.frequency.value = 0.001
   a.vib.start ()

   a.vib_wid = a.ctx.createGain ()
   a.vib_wid.gain.value = 0

   a.vib.connect (a.vib_wid).connect (a.fulcrum)

   draw_frame ()
}

const draw_frame = ms => {
   // const t = ms * 0.001
   a.glo.port.postMessage (`get_phase`)

   ctx.fillStyle = `indigo`
   ctx.fillRect (0, 0, cnv.width, cnv.height)

   ctx.beginPath ()
   a.wave_forms[a.current_sample].forEach ((x, y) => {
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

   if (a.is_init) requestAnimationFrame (draw_frame)
}

const new_sample = async () => {
   // a.current_sample += 1
   // a.current_sample %= a.samples.length
   a.current_sample = rand_int (a.samples.length)

   a.glo.disconnect ()
   a.glo = await new AudioWorkletNode (a.ctx, `glitch_loop_osc`, {
      processorOptions: {
         audio_data: a.samples [a.current_sample]
      }
   })

   // a.glo.port.onmessage = e => {
   //    if (e.data.type === `phase`) {
   //       a.phase = e.data.value
   //    }
   //    if (e.data.type === `swap_sample`) {
   //       console.log (`swapping sample`)
   //       new_sample ()
   //    }
   // }

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

document.onpointerdown = async e => {
   if (!a.is_init) {
      await init_audio ()
      await get_wake_lock ()
      splash.remove ()
      document.body.appendChild (cnv)
      // draw_frame ()
      a.is_init = true
   }
   // else {
   //    a.current_sample += 1
   //    a.current_sample %= a.samples.length

   //    a.glo.disconnect ()
   //    a.glo = await new AudioWorkletNode (a.ctx, `glitch_loop_osc`, {
   //       processorOptions: {
   //          audio_data: a.samples [a.current_sample]
   //       }
   //    })

   //    a.glo.port.onmessage = e => {
   //       if (e.data.type === `phase`) {
   //          a.phase = e.data.value
   //       }
   //    }
   
   //    a.freq  = await a.glo.parameters.get (`freq`)
   //    a.fulcrum = await a.glo.parameters.get (`fulcrum`)
   //    a.open = await a.glo.parameters.get (`open`)
   
   //    a.glo.connect (a.ctx.destination)

   //    a.wave_form = []
   //    const audio_data = a.samples [a.current_sample]
   //    for (let y = 0; y < cnv.height; y++) {
   //       const norm_wave = audio_data [Math.floor (audio_data.length * y / cnv.height)]
   //       const x = (1 + norm_wave) * (cnv.width / 2)
   //       a.wave_form.push (x)
   //    }
   // }
}

const midi_to_freq = n => 440 * Math.pow (2, (n - 69) / 12)
const rand_element = a => a[Math.floor (Math.random () * a.length)]

const oscillate = active_notes => {
   const t = a.ctx.currentTime
   const n = rand_element (active_notes)
   const f = midi_to_freq (n) * Math.pow (2, rand_int (3))
   const d = a.slow_mode
      ? 12 * Math.pow (2, Math.random () * 2) 
      : 0.2

   const v_freq = 0.666 * Math.pow (0.666, Math.random () * 3) + 0.001
   a.vib.frequency.cancelScheduledValues (t)
   a.vib.frequency.setValueAtTime (a.vib.frequency.value, t)
   a.vib.frequency.exponentialRampToValueAtTime (v_freq, t + d)

   const v_wid = Math.random () * 0.01 + 0.001
   a.vib_wid.gain.cancelScheduledValues (t)
   a.vib_wid.gain.setValueAtTime (a.vib_wid.gain.value, t)
   a.vib_wid.gain.linearRampToValueAtTime (v_wid, t + d)

   a.freq.cancelScheduledValues (t)
   a.freq.setValueAtTime (a.freq.value, t)
   a.freq.exponentialRampToValueAtTime (f, t + d)

   if (a.slow_mode) {
      a.fulcrum.cancelScheduledValues (t)
      a.fulcrum.setValueAtTime (a.phase, t)
      a.fulcrum.linearRampToValueAtTime (Math.random (), t + (d * 1))
   }

   a.open.cancelScheduledValues (t)
   a.open.setValueAtTime (a.open.value, t)
   a.open.linearRampToValueAtTime (0, t + d)

   a.wet.gain.cancelScheduledValues (t)
   a.wet.gain.setValueAtTime (a.wet.gain.value, t)
   a.wet.gain.linearRampToValueAtTime (0.8, t + d)

   a.dry.gain.cancelScheduledValues (t)
   a.dry.gain.setValueAtTime (a.dry.gain.value, t)
   a.dry.gain.linearRampToValueAtTime (0.5, t + d)

   a.slomo_timer && clearTimeout (a.slomo_timer)
   if (a.slow_mode) {
      a.slomo_timer = setTimeout (() => { a.slow_mode = false }, d * 1000)
   }
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

   a.slomo_timer && clearTimeout (a.slomo_timer)
   a.slow_mode = true
}

const es = new EventSource (`/api/listen`)
es.onmessage = async e => {
   const { type, msg } = JSON.parse (e.data)
   if (type === `update`) {
      
      if (Object.prototype.hasOwnProperty.call (msg, `active_notes`)) {
         const { active_notes } = msg
         if (active_notes.length) oscillate (active_notes)
         else loop ()
      }

      if (Object.prototype.hasOwnProperty.call (msg, `is_playing`)) {
         const { is_playing } = msg
         if (is_playing) {
            console.log (`playing`)
            await init_audio ()
         }
         else {
            console.log (`stopped`)
            a.ctx.close ()
            a.ctx = new AudioContext ()
            a.is_init = false
            a.samples = []
            a.current_sample = 0
            a.wave_form = []
            a.phase = 0
            a.slow_mode = true
         }
      }
   }    

   if (type === `welcome`) {
      console.log (msg)
   }
}

globalThis.onresize = () => { 
   cnv.width = globalThis.innerWidth
   cnv.height = globalThis.innerHeight
   const audio_data = a.samples [a.current_sample]
   a.wave_form = []
   for (let y = 0; y < cnv.height; y++) {
      const norm_wave = audio_data [Math.floor (audio_data.length * y / cnv.height)]
      const x = (1 + norm_wave) * (cnv.width / 2)      
      a.wave_form.push (x)
   }
}

