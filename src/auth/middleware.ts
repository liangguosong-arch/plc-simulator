import { Request, Response, NextFunction } from 'express'
import { verifyToken } from './jwt'
import { UserRole } from '../types/api'

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        role: UserRole
      }
    }
  }
}

/**
 * 角色权限等级（数字越大权限越高）
 */
const ROLE_LEVELS: Record<UserRole, number> = {
  GUEST: 0,
  OPERATOR: 1,
  ENGINEER: 2,
  ADMIN: 3
}

/**
 * 认证中间件 - 验证JWT Token
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 40100,
      data: null,
      message: '未提供认证令牌',
      timestamp: Date.now()
    })
    return
  }
  
  const token = authHeader.substring(7)
  const payload = verifyToken(token)
  
  if (!payload) {
    res.status(401).json({
      code: 40101,
      data: null,
      message: '认证令牌无效或已过期',
      timestamp: Date.now()
    })
    return
  }
  
  // 将用户信息附加到请求对象
  req.user = {
    userId: payload.userId,
    role: payload.role
  }
  
  next()
}

/**
 * 权限检查中间件 - 验证用户角色等级
 */
export function requireRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        code: 40100,
        data: null,
        message: '请先登录',
        timestamp: Date.now()
      })
      return
    }
    
    const userLevel = ROLE_LEVELS[req.user.role]
    const requiredLevel = ROLE_LEVELS[minimumRole]
    
    if (userLevel < requiredLevel) {
      res.status(403).json({
        code: 40300,
        data: null,
        message: '权限不足',
        timestamp: Date.now()
      })
      return
    }
    
    next()
  }
}

/**
 * 可选认证中间件 - Token存在则验证，不存在则跳过（用于公开接口）
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (payload) {
      req.user = {
        userId: payload.userId,
        role: payload.role
      }
    }
  }
  
  next()
}
