import { spawn } from 'node:child_process'
const children = [
  spawn(process.execPath, ['server/index.js'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', ...process.argv.slice(2)], { stdio: 'inherit' }),
]
function stop(code = 0) {
  children.forEach(child => child.kill())
  process.exit(code)
}
for (const child of children) child.on('exit', code => stop(code || 0))
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
