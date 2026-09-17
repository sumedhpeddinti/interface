import { Server } from 'socket.io'

let io = null

export function initRealtime(server, corsOrigin) {
  io = new Server(server, {
    cors: {
      origin: corsOrigin || '*',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`)

    socket.on('join_restaurant', (restaurantId) => {
      const room = `restaurant:${restaurantId || 'rest_ganesh_cafe_01'}`
      socket.join(room)
      console.log(`Socket ${socket.id} joined room ${room}`)
    })

    socket.on('join_table', ({ restaurantId, tableId }) => {
      const room = `table:${restaurantId || 'rest_ganesh_cafe_01'}:${tableId}`
      socket.join(room)
      console.log(`Socket ${socket.id} joined room ${room}`)
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}

export function getIO() {
  return io
}

export function broadcastEvent(room, event, data) {
  if (io) {
    io.to(room).emit(event, data)
  }
}

export function broadcastRestaurantEvent(restaurantId, event, data) {
  const room = `restaurant:${restaurantId || 'rest_ganesh_cafe_01'}`
  broadcastEvent(room, event, data)
}

export function broadcastTableEvent(restaurantId, tableId, event, data) {
  const room = `table:${restaurantId || 'rest_ganesh_cafe_01'}:${tableId}`
  broadcastEvent(room, event, data)
}
