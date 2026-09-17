import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/client.js'
import { env } from '../config/env.js'

export async function loginWithPin(pin, restaurantId = env.DEFAULT_RESTAURANT_ID) {
  const staffMembers = await prisma.staff.findMany({
    where: { restaurantId, active: true },
  })

  let matchedStaff = null
  for (const staff of staffMembers) {
    const isMatch = await bcrypt.compare(pin, staff.pinHash)
    if (isMatch) {
      matchedStaff = staff
      break
    }
  }

  if (!matchedStaff) {
    const error = new Error('Invalid PIN')
    error.statusCode = 401
    error.code = 'INVALID_CREDENTIALS'
    throw error
  }

  const token = jwt.sign(
    {
      id: matchedStaff.id,
      name: matchedStaff.name,
      role: matchedStaff.role,
      restaurantId: matchedStaff.restaurantId,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' },
  )

  return {
    token,
    staff: {
      id: matchedStaff.id,
      name: matchedStaff.name,
      role: matchedStaff.role,
      title: matchedStaff.title,
      phone: matchedStaff.phone,
    },
  }
}

export async function getStaffList(restaurantId = env.DEFAULT_RESTAURANT_ID) {
  const staff = await prisma.staff.findMany({
    where: { restaurantId },
    select: {
      id: true,
      name: true,
      role: true,
      title: true,
      phone: true,
      active: true,
      joinedDaysAgo: true,
    },
  })
  return staff
}

export async function createStaffMember(restaurantId, data) {
  const pinHash = await bcrypt.hash(data.pin, 10)
  const count = await prisma.staff.count({ where: { restaurantId } })
  const id = `s${String(count + 1).padStart(2, '0')}`

  const member = await prisma.staff.create({
    data: {
      id,
      restaurantId,
      name: data.name,
      role: data.role,
      pinHash,
      title: data.title || data.role,
      phone: data.phone || '',
      active: true,
    },
    select: {
      id: true,
      name: true,
      role: true,
      title: true,
      phone: true,
      active: true,
      joinedDaysAgo: true,
    },
  })

  return member
}

export async function updateStaffMember(restaurantId, id, patch) {
  const updateData = { ...patch }
  if (patch.pin) {
    updateData.pinHash = await bcrypt.hash(patch.pin, 10)
    delete updateData.pin
  }

  const member = await prisma.staff.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      role: true,
      title: true,
      phone: true,
      active: true,
      joinedDaysAgo: true,
    },
  })

  return member
}
