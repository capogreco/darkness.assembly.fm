const deparameterise = (a, i) => a[(a.length != 1) * i]

class GLOProcessor extends AudioWorkletProcessor {
   constructor ({ processorOptions: { audio_data } }) {
      super ()
      this.alive = true
      this.play_head = 0
      this.audio_data = audio_data

      this.port.onmessage = e => {
         if (e.data === `get_phase`) {
            this.port.postMessage (this.play_head / this.audio_data.length)
         }
      }
   }

   static get parameterDescriptors () {
      return [ 
         { name: `rate`, defaultValue: 1 },
         { name: `freq`, defaultValue: 1320 },
         { name: `fulcrum`, defaultValue: 0 },
         { name: `open`, defaultValue: 1 },
      ]
   }

   process (_inputs, outputs, parameters) {
      const out = outputs[0][0]

      for (let frame = 0; frame < out.length; frame++) {
         const rate    = deparameterise (parameters.rate, frame)
         const freq    = deparameterise (parameters.freq, frame)
         const fulcrum = deparameterise (parameters.fulcrum, frame)
         const open    = deparameterise (parameters.open, frame) ** 12

         const period = sampleRate / freq // in frames
         const total_periods = this.audio_data.length / period
         const current_periods = Math.floor (open * (total_periods - 1)) + 1
         const current_frames = current_periods * period
         const fulc_frame = this.audio_data.length * fulcrum
         const start = fulc_frame - (current_frames * fulcrum)
         const end = fulc_frame + (current_frames * (1 - fulcrum))

         if (this.play_head < start) {
            this.play_head = Math.floor (start)
         }

         this.play_head += rate
         out[frame] = this.audio_data[Math.floor(this.play_head)]

         if (this.play_head >= end) {
            this.play_head = Math.floor (start)
         }
       }

      return this.alive
   }
}

registerProcessor (`glitch_loop_osc`, GLOProcessor)