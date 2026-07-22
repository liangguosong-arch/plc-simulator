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
 * P6: 支持任意合法实例ID（格式校验，实际存在性由路由层通过Registry验证）
 * 合法格式: 字母数字、连字符、下划线，长度 1-64
 */
export function validateInstanceId(req: Request, res: Response, next: NextFunction): void {
  const instanceId = req.params.instanceId
  
  // 向后兼容: 接受 '0' 和 'sim-device-001'
  // 同时接受任意字母数字组合
  if (!instanceId || instanceId.length > 64 || !/^[a-zA-Z0-9\-_]+$/.test(instanceId)) {
    res.status(400).json({
      code: 40002,
      data: null,
      message: '无效的实例ID格式',
      timestamp: Date.now()
    } as ApiResponse)
    return
  }
  
  next()
}
