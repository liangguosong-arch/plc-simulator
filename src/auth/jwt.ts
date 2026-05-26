import jwt from 'jsonwebtoken'
import { TokenPayload, UserRole } from '../types/api'

const JWT_SECRET = 'plc-simulator-2024-secret-key'
const TOKEN_EXPIRY = '24h'

/**
 * 生成JWT Token
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

/**
 * 验证JWT Token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    return null
  }
}

/**
 * 预定义用户账户（开发环境）
 */
export const defaultUsers: Array<{ id: string; password: string; role: UserRole; name: string }> = [
  {
    id: 'admin',
    password: 'admin123',
    role: 'ADMIN',
    name: 'Administrator'
  },
  {
    id: 'engineer',
    password: 'eng123',
    role: 'ENGINEER',
    name: 'Engineer'
  },
  {
    id: 'operator',
    password: 'op123',
    role: 'OPERATOR',
    name: 'Operator'
  },
  {
    id: 'guest',
    password: 'guest123',
    role: 'GUEST',
    name: 'Guest'
  }
]
