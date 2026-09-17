import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { prisma } from '../src/db/client.js'

describe('Backend REST API Integration Tests', () => {
  let authToken = ''

  afterAll(async () => {
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
  })

  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.database).toBe('healthy')
  })

  it('POST /api/auth/login with valid Manager PIN should return JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ pin: '1234' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.staff.name).toBe('Vinit Sharma')

    authToken = res.body.data.token
  })

  it('POST /api/auth/login with invalid PIN should return 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ pin: '0000' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('GET /api/bootstrap should return complete store state', async () => {
    const res = await request(app).get('/api/bootstrap')
    if (res.status !== 200) {
      console.error('GET /api/bootstrap failed:', res.body)
    }
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.restaurant.name).toBe('Ganesh Café')
    expect(res.body.data.menu).toBeDefined()
    expect(res.body.data.tables.length).toBeGreaterThan(0)
    expect(res.body.data.orders).toBeDefined()
  })

  it('POST /api/orders should create a new order round in database', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        tableId: 'T1',
        guestName: 'Integration Test Guest',
        guestPhone: '+91 99999 88888',
        partySize: 2,
        notes: 'Extra crispy',
        items: [
          { id: 'm01', name: 'Paneer Butter Masala', price: 230, qty: 1, station: 'Hot Kitchen' }
        ]
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toBeDefined()
    expect(res.body.data.tableId).toBe('T1')
    expect(res.body.data.status).toBe('sent')
  })

  it('PATCH /api/orders/:id/status should execute legal order state transition', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        tableId: 'T4',
        guestName: 'KDS Guest',
        items: [{ id: 'm03', name: 'Butter Chicken', price: 320, qty: 1, station: 'Hot Kitchen' }]
      })

    const orderId = createRes.body.data.id

    const updateRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'accepted' })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.status).toBe('accepted')
  })

  it('PATCH /api/orders/:id/status should reject illegal state transitions', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        tableId: 'T4',
        items: [{ id: 'm03', name: 'Butter Chicken', price: 320, qty: 1, station: 'Hot Kitchen' }]
      })

    const orderId = createRes.body.data.id

    // Illegal: sent -> served without passing through cooking/ready
    const updateRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'served' })

    expect(updateRes.status).toBe(400)
    expect(updateRes.body.success).toBe(false)
  })
})
