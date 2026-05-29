import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import presets from './routes/presets'
import simulations from './routes/simulations'
import physics from './routes/physics'

const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type']
}))

app.get('/', (c) => {
  return c.json({
    message: 'Desktop Orrery & N-Body Simulator API',
    version: '1.0.0',
    endpoints: {
      presets: '/api/presets',
      simulations: '/api/simulations',
      physics: '/api/physics'
    }
  })
})

app.route('/api/presets', presets)
app.route('/api/simulations', simulations)
app.route('/api/physics', physics)

const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
