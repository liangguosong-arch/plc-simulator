import { Router } from 'express'
import { generateToken, defaultUsers } from '../auth/jwt'
import { ApiResponse } from '../types/api'

const router = Router()

/**
 * POST /api/v1/auth/login
 * 用户登录
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({
      code: 40001,
      data: null,
      message: '缺少用户名或密码',
      timestamp: Date.now()
    } as ApiResponse)
  }

  // 查找用户
  const user = defaultUsers.find(u => u.id === username && u.password === password)

  if (!user) {
    return res.status(401).json({
      code: 40101,
      data: null,
      message: '用户名或密码错误',
      timestamp: Date.now()
    } as ApiResponse)
  }

  // 生成Token
  const token = generateToken({
    userId: user.id,
    role: user.role
  })

  res.json({
    code: 200,
    data: {
      token,
      userId: user.id,
      role: user.role,
      name: user.name
    },
    message: 'success',
    timestamp: Date.now()
  } as ApiResponse)
})

/**
 * POST /api/v1/auth/refresh
 * 刷新Token（简化版，实际应该验证Refresh Token）
 */
router.post('/refresh', (req, res) => {
  const { userId, role } = req.body

  if (!userId || !role) {
    return res.status(400).json({
      code: 40001,
      data: null,
      message: '缺少必要参数',
      timestamp: Date.now()
    } as ApiResponse)
  }

  const token = generateToken({
    userId,
    role
  })

  res.json({
    code: 200,
    data: { token },
    message: 'success',
    timestamp: Date.now()
  } as ApiResponse)
})

export default router
