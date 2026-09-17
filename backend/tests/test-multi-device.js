import { io } from 'socket.io-client'

const SERVER_URL = 'http://localhost:4000'

async function runMultiDeviceTest() {
  console.log('--- Starting Multi-Device Broadcast CLI Test ---')

  const devices = [
    { name: 'POS Manager Terminal (Laptop)', role: 'manager' },
    { name: 'Guest Device 1 (Android Phone)', role: 'guest' },
    { name: 'Guest Device 2 (Tablet / iOS Device)', role: 'guest' },
    { name: 'Kitchen Display Screen', role: 'kitchen' },
  ]

  const sockets = []
  const receivedEvents = {}

  for (const device of devices) {
    receivedEvents[device.name] = []
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    socket.on('connect', () => {
      console.log(`[CONNECTED] ${device.name} (Socket ID: ${socket.id})`)
      socket.emit('join_restaurant', 'rest_ganesh_cafe_01')
    })

    socket.on('campaign:created', (data) => {
      console.log(`[NOTIFICATION RECEIVED] ${device.name} -> "${data.heading || data.name}": "${data.body}"`)
      receivedEvents[device.name].push(data)
    })

    sockets.push(socket)
  }

  // Wait for all sockets to connect
  await new Promise((resolve) => setTimeout(resolve, 2000))

  console.log('\n--- Triggering Campaign Broadcast via API ---')
  const response = await fetch(`${SERVER_URL}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'push',
      name: 'Weekend Feast 20% OFF',
      heading: '20% OFF Entire Bill!',
      body: 'Happy Weekend! Enjoy 20% off all orders today at Ganesh Café.',
      coupon: 'WEEKEND20',
      audience: 'all',
      audienceLabel: 'All Devices',
      audienceSize: 4,
      createdBy: 'Manager (Terminal)',
    }),
  })

  const responseData = await response.json()
  console.log('[API RESPONSE]', response.status, responseData.success ? 'Campaign Created Successfully' : responseData)

  // Wait for real-time delivery
  await new Promise((resolve) => setTimeout(resolve, 2000))

  console.log('\n--- Broadcast Verification Summary ---')
  let allSuccess = true
  for (const device of devices) {
    const count = receivedEvents[device.name].length
    console.log(`- ${device.name}: Received ${count} notification(s) ${count > 0 ? '✓ SUCCESS' : '✗ FAILED'}`)
    if (count === 0) allSuccess = false
  }

  // Clean up
  sockets.forEach((s) => s.disconnect())

  if (allSuccess) {
    console.log('\n>>> Multi-Device Realtime Notification Broadcast: 100% VERIFIED SUCCESS! <<<')
    process.exit(0)
  } else {
    console.error('\n>>> ERROR: Some devices missed the broadcast! <<<')
    process.exit(1)
  }
}

runMultiDeviceTest().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
