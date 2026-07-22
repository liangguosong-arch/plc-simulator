import { Alarm, AlarmSeverity, AlarmStatus } from '../types/device'

/**
 * 报警生成器
 */
export class AlarmGenerator {
  private alarms: Alarm[] = []
  private instanceId: string

  constructor(instanceId: string) {
    this.instanceId = instanceId
  }

  /**
   * 生成随机报警（用于模拟）
   */
  async generateRandomAlarm(): Promise<Alarm | null> {
    // 1%概率生成报警
    if (Math.random() > 0.01) return null

    const severities: AlarmSeverity[] = ['info', 'warning', 'error', 'critical']
    const severity = severities[Math.floor(Math.random() * severities.length)]
    
    const alarmTemplates = {
      info: [
        { code: 'INFO001', message: '系统信息：例行检查完成' },
        { code: 'INFO002', message: '设备状态正常' }
      ],
      warning: [
        { code: 'WARN001', message: '温度接近上限' },
        { code: 'WARN002', message: 'CPU使用率偏高' }
      ],
      error: [
        { code: 'ERR001', message: '通信超时' },
        { code: 'ERR002', message: '变量读取失败' }
      ],
      critical: [
        { code: 'CRIT001', message: '紧急停止触发' },
        { code: 'CRIT002', message: '安全回路断开' }
      ]
    }

    const templates = alarmTemplates[severity]
    const template = templates[Math.floor(Math.random() * templates.length)]
    const { v4: uuidv4 } = await import('uuid')
    const alarm: Alarm = {
      id: uuidv4(),
      instanceId: this.instanceId,
      alarmCode: template.code,
      message: template.message,
      severity,
      status: 'active',
      triggeredAt: new Date().toISOString()
    }

    this.alarms.push(alarm)
    return alarm
  }

  /**
   * 获取报警列表
   */
  getAlarms(status?: AlarmStatus, severity?: AlarmSeverity): Alarm[] {
    let filtered = [...this.alarms]

    if (status) {
      filtered = filtered.filter(a => a.status === status)
    }

    if (severity) {
      filtered = filtered.filter(a => a.severity === severity)
    }

    // 按时间倒序排列
    return filtered.sort((a, b) => 
      new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    )
  }

  /**
   * 确认报警
   */
  acknowledgeAlarm(alarmId: string, userId?: string): boolean {
    const alarm = this.alarms.find(a => a.id === alarmId)
    if (!alarm || alarm.status !== 'active') return false

    alarm.status = 'acknowledged'
    alarm.acknowledgedAt = new Date().toISOString()
    alarm.acknowledgedBy = userId
    return true
  }

  /**
   * 清除报警
   */
  clearAlarm(alarmId: string): boolean {
    const alarm = this.alarms.find(a => a.id === alarmId)
    if (!alarm) return false

    alarm.status = 'cleared'
    alarm.clearedAt = new Date().toISOString()
    return true
  }

  /**
   * 获取活跃报警数量
   */
  getActiveAlarmCount(): number {
    return this.alarms.filter(a => a.status === 'active').length
  }

  /**
   * 清理已清除的报警（保留最近100条）
   */
  cleanupClearedAlarms(): void {
    const cleared = this.alarms.filter(a => a.status === 'cleared')
    if (cleared.length > 50) {
      this.alarms = this.alarms.filter(a => a.status !== 'cleared')
    }
  }
}
