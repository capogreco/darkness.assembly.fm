const deparameterise = (a, i) => a[(a.length != 1) * i]

const rand_int = n => Math.floor (Math.random () * n)

class GLOProcessor extends AudioWorkletProcessor {
   constructor ({ processorOptions: { audio_array, audio_index, audio_group } }) {
      super ()
      this.alive = true
      this.play_head = 0
      this.audio_array = audio_array
      this.i = audio_index
      this.g = audio_group
      this.swap_group = false
      this.new_group = 0
      this.is_playing = 1
      this.stop_playing = false


      this.port.onmessage = e => {
         if (e.data.type === `get_phase`) {
            this.port.postMessage ({
               type: `phase`,
               value: this.play_head / this.audio_array[this.g][this.i[this.g]].length,
               index: this.i,
               group: this.g,
            })
         }
         if (e.data.type === `swap_group`) {
            this.swap_group = true
            this.new_group = e.data.group
         }
         if (e.data.type === `is_playing`) {
            if (e.data.is_playing) {
               this.is_playing = 1
               this.stop_playing = false
            }
            else {
               this.stop_playing = true
            }
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
         const length = this.audio_array[this.g][this.i[this.g]].length
         const total_periods = length / period
         const current_periods = Math.floor (open * (total_periods - 1)) + 1
         const current_frames = current_periods * period
         const fulc_frame = length * fulcrum
         const start = fulc_frame - (current_frames * fulcrum)
         const end = fulc_frame + (current_frames * (1 - fulcrum))

         if (this.play_head < start) {
            this.play_head = Math.floor (start)
         }

         this.play_head += rate * this.is_playing
         const data = this.audio_array[this.g][this.i[this.g]]
         out[frame] = data[Math.floor(this.play_head)]

         if (this.play_head >= end) {
            this.play_head = Math.floor (start)
            if (open === 1) {

               if (this.stop_playing) {
                  this.is_playing = 0
               }

               if (this.swap_group) {
                  this.g = this.g === 0 ? 1 : 0
                  this.swap_group = false
               }
               const new_index = rand_int (this.audio_array[this.g].length)
               this.i[this.g] = new_index
            }
            // this.port.postMessage ({
            //    type: `swap_sample`,
            // })   
         }
       }

      return this.alive
   }
}

registerProcessor (`glitch_loop_osc`, GLOProcessor)