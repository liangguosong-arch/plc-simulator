import { Router } from 'express'
import { InstanceRegistry } from '../core/instance-registry'
import { optionalAuth } from '../auth/middleware'
import { validateInstanceId } from '../middleware/errorHandler'
import { ApiResponse } from '../types/api'

const router = Router()

// 依赖注入
let registry: InstanceRegistry

export function initializeControl(reg: InstanceRegistry) {
  registry = reg
}

// 辅助: 获取实例
function resolveInstance(instanceId: string, res: any) {
  const inst = registry.get(instanceId)
  if (!inst) {
    res.status(404).json({
      code: 40401,
      data: null,
      message: `实例 "${instanceId}" 不存在`,
      timestamp: Date.now()
    } as ApiResponse)
    return null
  }
  return inst
}

// 使用optionalAuth允许公开访问
router.use(optionalAuth)

/**
 * POST /api/v1/devices/instances/:instanceId/variables/:address/write
 * 写入单个变量值
 */
router.post('/devices/instances/:instanceId/variables/:address/write', validateInstanceId, (req, res) => {
  const inst = resolveInstance(req.params.instanceId, res)
  if (!inst) return

  const address = req.params.address
  const { value } = req.body

  if (value === undefined || value === null) {
    return res.status(400).json({
      code: 40001,
      data: null,
      message: '缺少value参数',
      timestamp: Date.now()
    } as ApiResponse)
  }

  try {
    inst.variableManager.setVariableValueByAddress(address, value)
    res.json({
      code: 200,
      data: { success: true, writtenAt: new Date().toISOString() },
      message: '写入成功',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `写入失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * POST /api/v1/devices/instances/:instanceId/variables/batch-write
 * 批量写入变量值
 */
router.post('/devices/instances/:instanceId/variables/batch-write', validateInstanceId, (req, res) => {
  const inst = resolveInstance(req.params.instanceId, res)
  if (!inst) return

  const { writes } = req.body

  if (!writes || !Array.isArray(writes)) {
    return res.status(400).json({
      code: 40001,
      data: null,
      message: '缺少writes参数或格式错误',
      timestamp: Date.now()
    } as ApiResponse)
  }

  try {
    const results = inst.variableManager.setVariableValuesByAddresses(writes)
    const allSuccess = results.every(r => r.success)

    res.json({
      code: 200,
      data: { success: allSuccess, results, writtenAt: new Date().toISOString() },
      message: allSuccess ? '批量写入成功' : '部分写入失败',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `批量写入失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * POST /api/v1/devices/instances/:instanceId/commands/execute
 * 执行设备命令
 */
router.post('/devices/instances/:instanceId/commands/execute', validateInstanceId, async (req, res) => {
  const inst = resolveInstance(req.params.instanceId, res)
  if (!inst) return

  const { command, parameters } = req.body

  if (!command) {
    return res.status(400).json({
      code: 40001,
      data: null,
      message: '缺少command参数',
      timestamp: Date.now()
    } as ApiResponse)
  }

  try {
    const result = await inst.commandExecutor.execute(command, parameters)
    res.json({
      code: 200,
      data: result,
      message: result.success ? '命令执行成功' : '命令执行失败',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `命令执行失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * POST /api/v1/devices/instances/:instanceId/mode/switch
 * 切换运行模式
 */
router.post('/devices/instances/:instanceId/mode/switch', validateInstanceId, (req, res) => {
  const inst = resolveInstance(req.params.instanceId, res)
  if (!inst) return

  const { mode } = req.body

  if (!mode) {
    return res.status(400).json({
      code: 40001,
      data: null,
      message: '缺少mode参数',
      timestamp: Date.now()
    } as ApiResponse)
  }

  if (!['auto', 'manual', 'teach'].includes(mode)) {
    return res.status(400).json({
      code: 40002,
      data: null,
      message: '无效的mode值',
      timestamp: Date.now()
    } as ApiResponse)
  }

  try {
    inst.deviceStatus.switchMode(mode)
    res.json({
      code: 200,
      data: { success: true, mode, switchedAt: new Date().toISOString() },
      message: '模式切换成功',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `模式切换失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * POST /api/v1/devices/instances/:instanceId/restart
 * 重启设备
 */
router.post('/devices/instances/:instanceId/restart', validateInstanceId, (req, res) => {
  const inst = resolveInstance(req.params.instanceId, res)
  if (!inst) return

  const { type, confirm } = req.body

  if (!type || !confirm) {
    return res.status(400).json({
      code: 40001,
      data: null,
      message: '缺少必要参数(type和confirm)',
      timestamp: Date.now()
    } as ApiResponse)
  }

  if (!['soft', 'hard'].includes(type)) {
    return res.status(400).json({
      code: 40002,
      data: null,
      message: '无效的type值',
      timestamp: Date.now()
    } as ApiResponse)
  }

  try {
    inst.deviceStatus.reset()
    res.json({
      code: 200,
      data: { success: true, type, restartedAt: new Date().toISOString() },
      message: '设备重启成功',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `设备重启失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

export default router
