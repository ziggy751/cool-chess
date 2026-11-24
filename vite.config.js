import { defineConfig } from 'vite'
import { createReadStream, mkdirSync, copyFileSync } from 'node:fs'

const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']
const source = 'node_modules/stockfish/bin/'
export default defineConfig({
  plugins: [{
    name: 'stockfish-assets',
    configureServer(server) {
      server.middlewares.use('/engine', (req, res, next) => {
        const file = req.url.split('?')[0].slice(1)
        if (!files.includes(file)) return next()
        res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
        createReadStream(source + file).pipe(res)
      })
    },
    closeBundle() {
      mkdirSync('dist/engine', { recursive: true })
      for (const file of files) copyFileSync(source + file, 'dist/engine/' + file)
      copyFileSync('node_modules/stockfish/Copying.txt', 'dist/engine/COPYING.txt')
    },
  }],
  server: { proxy: { '/socket': { target: 'ws://localhost:8787', ws: true } } },
})
