import { CommandExecutionResponse } from '../types/device'
import { DeviceStatusSimulator } from '../simulator/device-status'

/**
 * 命令执行器
 */
export class CommandExecutor {
  constructor(private deviceStatus: DeviceStatusSimulator) {}

  /**
   * 执行命令
   */
  async execute(command: string, parameters?: any): Promise<CommandExecutionResponse> {
    console.log(`[CommandExecutor] Executing command: ${command}`, parameters)

    try {
      switch (command) {
        case 'start':
          return this.start(parameters)
        
        case 'stop':
          return this.stop()
        
        case 'reset':
          return this.reset()
        
        case 'pause':
          return this.pause()
        
        case 'resume':
          return this.resume()
        
        default:
          return {
            success: false,
            message: `Unknown command: ${command}`,
            executedAt: new Date().toISOString()
          }
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Command execution failed: ${error.message}`,
        executedAt: new Date().toISOString()
      }
    }
  }

  /**
   * 启动设备
   */
  private start(parameters?: any): CommandExecutionResponse {
    this.deviceStatus.setStatus('running')
    
    return {
      success: true,
      message: 'Device started successfully',
      executedAt: new Date().toISOString(),
      result: {
        mode: parameters?.mode || 'auto'
      }
    }
  }

  /**
   * 停止设备
   */
  private stop(): CommandExecutionResponse {
    this.deviceStatus.setStatus('stopped')
    
    return {
      success: true,
      message: 'Device stopped',
      executedAt: new Date().toISOString()
    }
  }

  /**
   * 重置设备
   */
  private reset(): CommandExecutionResponse {
    this.deviceStatus.reset()
    
    return {
      success: true,
      message: 'Device reset completed',
      executedAt: new Date().toISOString()
    }
  }

  /**
   * 暂停
   */
  private pause(): CommandExecutionResponse {
    // 暂停模拟（保持状态但停止更新）
    return {
      success: true,
      message: 'Device paused',
      executedAt: new Date().toISOString()
    }
  }

  /**
   * 恢复
   */
  private resume(): CommandExecutionResponse {
    return {
      success: true,
      message: 'Device resumed',
      executedAt: new Date().toISOString()
    }
  }
}
