import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../types/api'

/**
 * 404错误处理
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    code: 40400,
    data: null,
    message: `路由不存在: ${req.method} ${req.path}`,
    timestamp: Date.now()
  } as ApiResponse)
}

/**
 * 全局错误处理
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error]', err)

  // 默认500错误
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500
  const errorCode = statusCode === 500 ? 50000 : statusCode * 100

  res.status(statusCode).json({
    code: errorCode,
    data: null,
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message,
    timestamp: Date.now(),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  } as ApiResponse)
}

/**
 * 设备实例ID校验中间件
 * 验证instanceId是否为有效值（sim-device-001或0）
 */
export function validateInstanceId(req: Request, res: Response, next: NextFunction): void {
  const instanceId = req.params.instanceId
  
  if (instanceId !== 'sim-device-001' && instanceId !== '0') {
    res.status(404).json({
      code: 40401,
      data: null,
      message: '设备不存在',
      timestamp: Date.now()
    } as ApiResponse)
    return
  }
  
  next()
}
