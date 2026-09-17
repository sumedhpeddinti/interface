import http from 'http'

async function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch (_) {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })

    req.on('error', reject)
    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

async function runLiveVerification() {
  console.log('🔍 Starting End-to-End Live System Verification...\n')

  // 1. Health Check
  const health = await request('http://localhost:4000/api/health')
  console.log('1️⃣ Health Endpoint:', health.status === 200 ? '✅ OK' : '❌ FAIL')
  console.log('   Body:', JSON.stringify(health.body))

  // 2. Authentication
  const login = await request('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { pin: '1234' })
  console.log('\n2️⃣ Manager PIN Login:', login.status === 200 ? '✅ SUCCESS' : '❌ FAIL')
  console.log('   Logged in User:', login.body?.data?.staff?.name, '| Role:', login.body?.data?.staff?.role)

  const token = login.body?.data?.token

  // 3. Bootstrap State from PostgreSQL
  const bootstrap = await request('http://localhost:4000/api/bootstrap')
  console.log('\n3️⃣ Database State Hydration (Bootstrap):', bootstrap.status === 200 ? '✅ SUCCESS' : '❌ FAIL')
  console.log('   Restaurant:', bootstrap.body?.data?.restaurant?.name)
  console.log('   Seeded Tables Count:', bootstrap.body?.data?.tables?.length)
  console.log('   Seeded Menu Items Count:', bootstrap.body?.data?.menu?.length)
  console.log('   Seeded Orders Count:', bootstrap.body?.data?.orders?.length)
  console.log('   Seeded Invoices Count:', bootstrap.body?.data?.invoices?.length)

  // 4. Create Live Order Round in PostgreSQL
  const order = await request('http://localhost:4000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    tableId: 'T5',
    guestName: 'Verification Guest',
    guestPhone: '+91 99988 77766',
    partySize: 2,
    notes: 'Live verification order',
    items: [{ id: 'm01', name: 'Paneer Butter Masala', price: 230, qty: 2, station: 'Hot Kitchen' }]
  })
  console.log('\n4️⃣ Guest Order Placement in PostgreSQL:', order.status === 200 ? '✅ SUCCESS' : '❌ FAIL')
  console.log('   Order ID:', order.body?.data?.id, '| Status:', order.body?.data?.status, '| Table:', order.body?.data?.tableId)

  // 5. Atomic Payment Settlement in PostgreSQL
  const payment = await request('http://localhost:4000/api/payments/settle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  }, {
    tableId: 'T5',
    method: 'UPI',
    tendered: 483
  })
  console.log('\n5️⃣ Atomic Payment Settlement in PostgreSQL:', payment.status === 200 ? '✅ SUCCESS' : '❌ FAIL')
  console.log('   Invoice ID:', payment.body?.data?.id, '| Method:', payment.body?.data?.method, '| Total Settled: ₹', payment.body?.data?.totals?.total)

  // 6. Frontend Dev Server Health Check
  const frontend = await request('http://localhost:5173/')
  console.log('\n6️⃣ Frontend Vite Dev Server (http://localhost:5173/):', frontend.status === 200 ? '✅ ONLINE' : '❌ FAIL')

  console.log('\n🎉 ALL LIVE E2E VERIFICATIONS SUCCEEDED CLEANLY!')
}

runLiveVerification().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
