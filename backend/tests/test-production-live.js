import { io } from 'socket.io-client'

const PROD_URL = 'https://ganesh-cafe-pos.onrender.com'

async function runProductionLiveTest() {
  console.log('--- Testing Live Render Production Server ---')
  console.log('Target URL:', PROD_URL)

  const devices = [
    { name: 'POS Manager Terminal', role: 'manager' },
    { name: 'Guest 1 (Android Device)', role: 'guest' },
    { name: 'Guest 2 (Mobile PWA)', role: 'guest' },
    { name: 'Kitchen Screen', role: 'kitchen' },
  ]

  const sockets = []
  const receivedEvents = {}

  for (const device of devices) {
    receivedEvents[device.name] = []
    const socket = io(PROD_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      secure: true,
    })

    socket.on('connect', () => {
      console.log(`[CONNECTED TO RENDER] ${device.name} (Socket ID: ${socket.id})`)
      socket.emit('join_restaurant', 'rest_ganesh_cafe_01')
    })

    socket.on('campaign:created', (data) => {
      console.log(`[LIVE NOTIFICATION RECEIVED] ${device.name} -> "${data.heading || data.name}": "${data.body}"`)
      receivedEvents[device.name].push(data)
    })

    sockets.push(socket)
  }

  // Wait for all sockets to connect to Render
  await new Promise((resolve) => setTimeout(resolve, 3000))

  console.log('\n--- Sending Live Broadcast to Production Server ---')
  const response = await fetch(`${PROD_URL}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'push',
      name: 'Production Live Test Promo',
      heading: 'Live 20% Discount Activated!',
      body: 'Verified from Production: enjoy 20% off all orders now.',
      coupon: 'LIVE20',
      audience: 'all',
      audienceLabel: 'All Live Devices',
      audienceSize: 4,
      createdBy: 'Production Manager',
    }),
  })

  const responseData = await response.json()
  console.log('[LIVE API RESPONSE]', response.status, responseData.success ? 'Campaign Successfully Broadcasted' : responseData)

  // Wait for real-time delivery across public internet
  await new Promise((resolve) => setTimeout(resolve, 3000))

  console.log('\n--- Live Production Broadcast Summary ---')
  let allSuccess = true
  for (const device of devices) {
    const count = receivedEvents[device.name].length
    console.log(`- ${device.name}: Received ${count} notification(s) ${count > 0 ? '✓ SUCCESS' : '✗ FAILED'}`)
    if (count === 0) allSuccess = false
  }

  sockets.forEach((s) => s.disconnect())

  if (allSuccess) {
    console.log('\n>>> LIVE PRODUCTION SERVER BROADCAST: 100% OPERATIONAL & VERIFIED! <<<')
    process.exit(0)
  } else {
    console.error('\n>>> ERROR: Broadcast did not reach all live production clients! <<<')
    process.exit(1)
  }
}

runProductionLiveTest().catch((err) => {
  console.error('Live production test failed:', err)
  process.exit(1)
})
