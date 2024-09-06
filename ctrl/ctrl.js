document.body.style.background = `black`
document.body.style.overflow = `hidden`
document.body.style.margin = 0

let mode = `loop`

globalThis.onkeydown = e => {
   if (e.key === `a` && mode === `loop`) {
      mode = `osc`
      update_synth ({ mode })
      console.log (`osc mode`)
   }
}

globalThis.onkeyup = e => {
   if (e.key === `a` && mode === `osc`) { 
      mode = `loop`
      update_synth ({ mode })
      console.log (`loop mode`)
   }
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


