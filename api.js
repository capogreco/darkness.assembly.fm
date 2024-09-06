export const handle_api = async (req, type) => {

   const bc = new BroadcastChannel (`program`)
   const db = await Deno.openKv ()

   const start = controller => {

      const payload = {
         type: `welcome`,
         msg: `event source established`
      }

      controller.enqueue (`data: ${JSON.stringify (payload) } \n\n`)
      bc.onmessage = e => {
         const bc_handler = {
            update: async () => {
               const { value } = await db.get ([ `program` ])
               const program = JSON.stringify (value)
               controller.enqueue (`data: ${ program } \n\n`)
            },
         }
         bc_handler[e.data.type] ()
      }
   }


   const cancel = () => bc.close ()

   const es_handler = {
      listen: () => {
         const body = new ReadableStream ({ start, cancel })
         const stream = body.pipeThrough (new TextEncoderStream ())
         const headers = new Headers ({
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
         })
         return new Response (stream, { headers })
      },
      update: async () => {
         const json = await req.json ()
         await db.set ([ `program` ], json)
         const payload = {
            type: `update`
         }
         bc.postMessage (payload)
         return new Response ()
      },
   }

   return es_handler[type] () 
}