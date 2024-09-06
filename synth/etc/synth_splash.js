export const splash = document.createElement (`div`)

Object.assign (splash.style, {
   font: `italic bolder 80px sans-serif`,
   justifyContent: `center`,
   alignItems: `center`,
   userSelect: `none`,
   background: `black`,
   position: `fixed`,
   display: `flex`,
   height: `100vh`,
   width: `100vw`,
   color: `white`,
   left: 0,
   top: 0,
})

splash.innerText = `ENABLE`

