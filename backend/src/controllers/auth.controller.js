import * as authService from '../services/auth.service.js'

export async function login(req, res, next) {
  try {
    const { pin } = req.body
    const restaurantId = req.headers['x-restaurant-id'] || 'rest_ganesh_cafe_01'
    const result = await authService.loginWithPin(pin, restaurantId)

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function logout(req, res, next) {
  try {
    res.clearCookie('token')
    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    })
  } catch (err) {
    next(err)
  }
}

export async function getStaff(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const staff = await authService.getStaffList(restaurantId)
    res.json({ success: true, data: staff })
  } catch (err) {
    next(err)
  }
}

export async function createStaff(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const member = await authService.createStaffMember(restaurantId, req.body)
    res.json({ success: true, data: member })
  } catch (err) {
    next(err)
  }
}

export async function updateStaff(req, res, next) {
  try {
    const restaurantId = req.user?.restaurantId || 'rest_ganesh_cafe_01'
    const member = await authService.updateStaffMember(restaurantId, req.params.id, req.body)
    res.json({ success: true, data: member })
  } catch (err) {
    next(err)
  }
}
