import WebSocket from 'ws'
import { VariableManager } from '../variables/variable-manager'
import { InstanceRegistry } from '../core/instance-registry'
import { SubscribeRequest } from '../types/device'
import http from 'http'

interface ClientInfo {
  id: string
  ws: WebSocket
  instanceId: string
  addresses: string[]
  samplingRate: number
  lastSent: number
}

/**
 * WebSocket订阅管理器 — 支持多实例路由
 * 
 * P4: 通过解析连接URL中的 instanceId，将客户端路由到正确的实例引擎
 * URL 格式: /ws/devices/instances/:instanceId/subscribe
 */
export class SubscriptionManager {
  private clients: Map<string, ClientInfo> = new Map()
  private wss: WebSocket.Server | null = null
  private broadcastTimer: NodeJS.Timeout | null = null
  private registry: InstanceRegistry

  constructor(registry: InstanceRegistry) {
    this.registry = registry
  }

  /**
   * 初始化WebSocket服务器
   * P4: 使用 HTTP upgrade 事件手动处理，支持按 instanceId 路由
   */
  initialize(server: http.Server): void {
    this.wss = new WebSocket.Server({ noServer: true })

    // 手动处理 upgrade 事件以支持动态路径
    server.on('upgrade', (request, socket, head) => {
      const url = request.url || ''
      const match = url.match(/^\/ws\/devices\/instances\/([^/]+)\/subscribe/)

      if (!match) {
        socket.destroy()
        return
      }

      const instanceId = match[1]

      // 验证实例是否存在
      if (!this.registry.has(instanceId)) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
        socket.destroy()
        return
      }

      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        this.handleConnection(ws, instanceId)
      })
    })

    console.log('[SubscriptionManager] Multi-instance WebSocket server initialized')
  }

  /**
   * 处理客户端连接
   */
  private async handleConnection(ws: WebSocket, instanceId: string): Promise<void> {
    const { v4: uuidv4 } = await import('uuid')
    const clientId = uuidv4()
    console.log(`[SubscriptionManager] Client connected: ${clientId} → instance: ${instanceId}`)

    const clientInfo: ClientInfo = {
      id: clientId,
      ws,
      instanceId,
      addresses: [],
      samplingRate: 1000,
      lastSent: 0
    }

    this.clients.set(clientId, clientInfo)

    // 处理消息
    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleMessage(clientId, message)
      } catch (error) {
        console.error('[SubscriptionManager] Failed to parse message:', error)
        this.sendError(ws, 'Invalid message format')
      }
    })

    // 处理断开连接
    ws.on('close', () => {
      console.log(`[SubscriptionManager] Client disconnected: ${clientId}`)
      this.cleanup(clientId)
    })

    // 处理错误
    ws.on('error', (error: Error) => {
      console.error(`[SubscriptionManager] WebSocket error for client ${clientId}:`, error)
      this.cleanup(clientId)
    })

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        clientId,
        instanceId,
        message: `Connected to PLC Simulator instance: ${instanceId}`
      },
      timestamp: Date.now()
    }))
  }

  /**
   * 获取客户端所属实例的 VariableManager
   */
  private getVariableManager(clientId: string): VariableManager | null {
    const client = this.clients.get(clientId)
    if (!client) return null

    const inst = this.registry.get(client.instanceId)
    return inst?.variableManager ?? null
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId)
    if (!client) return

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message.data)
        break
      
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.data)
        break
      
      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        break
      
      default:
        this.sendError(client.ws, `Unknown message type: ${message.type}`)
    }
  }

  /**
   * 处理订阅请求（使用地址）
   */
  private handleSubscribe(clientId: string, data: SubscribeRequest): void {
    const client = this.clients.get(clientId)
    if (!client) return

    const vm = this.getVariableManager(clientId)
    if (!vm) {
      this.sendError(client.ws, `Instance "${client.instanceId}" not available`)
      return
    }

    // Support both old format (variableIds) and new format (addresses)
    const addresses = data.addresses || data.variableIds || []
    
    if (addresses && Array.isArray(addresses) && addresses.length > 0) {
      client.addresses = addresses
      client.samplingRate = data.samplingRate || 1000

      // 注册订阅到对应实例的 VariableManager
      addresses.forEach(address => {
        vm.subscribeByAddress(clientId, address)
      })

      console.log(`[SubscriptionManager] Client ${clientId} on instance ${client.instanceId} subscribed to ${addresses.length} variables`)

      // 立即发送当前值
      this.sendCurrentValues(client)
    } else {
      this.sendError(client.ws, 'Invalid subscription data')
    }
  }

  /**
   * 处理取消订阅
   */
  private handleUnsubscribe(clientId: string, data: { addresses?: string[], variableIds?: string[] }): void {
    const client = this.clients.get(clientId)
    if (!client) return

    const vm = this.getVariableManager(clientId)
    if (!vm) return

    // Support both formats
    const addresses = data.addresses || data.variableIds || client.addresses
    
    addresses.forEach(address => {
      vm.unsubscribeByAddress(clientId, address)
    })

    if (!data.addresses && !data.variableIds) {
      client.addresses = []
    } else {
      client.addresses = client.addresses.filter(addr => !addresses.includes(addr))
    }

    console.log(`[SubscriptionManager] Client ${clientId} unsubscribed from ${addresses.length} variables`)
  }

  /**
   * 发送当前值
   */
  private sendCurrentValues(client: ClientInfo): void {
    const vm = this.getVariableManager(client.id)
    if (!vm) return

    const values = vm.getVariableValuesByAddresses(client.addresses)
    
    values.forEach(item => {
      this.sendMessage(client.ws, {
        type: 'variable_update',
        data: {
          variableId: item.variableId,
          address: item.address,
          value: item.value,
          quality: item.quality,
          timestamp: item.timestamp
        }
      })
    })
  }

  /**
   * 启动广播循环
   */
  startBroadcast(): void {
    if (this.broadcastTimer) return

    console.log('[SubscriptionManager] Starting broadcast loop...')
    this.broadcastTimer = setInterval(() => {
      this.broadcastUpdates()
    }, 100) // 每100ms检查一次
  }

  /**
   * 广播更新（按实例隔离）
   */
  private broadcastUpdates(): void {
    const now = Date.now()

    this.clients.forEach((client, clientId) => {
      if (now - client.lastSent < client.samplingRate) return
      if (client.ws.readyState !== WebSocket.OPEN) return
      if (client.addresses.length === 0) return

      const vm = this.getVariableManager(clientId)
      if (!vm) return

      // 获取变量最新值
      const values = vm.getVariableValuesByAddresses(client.addresses)
      
      values.forEach(item => {
        this.sendMessage(client.ws, {
          type: 'variable_update',
          data: {
            variableId: item.variableId,
            address: item.address,
            value: item.value,
            quality: item.quality,
            timestamp: item.timestamp
          }
        })
      })

      client.lastSent = now
    })
  }

  /**
   * 发送消息
   */
  private sendMessage(ws: WebSocket, message: any): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      }
    } catch (error) {
      console.error('[SubscriptionManager] Failed to send message:', error)
    }
  }

  /**
   * 发送错误消息
   */
  private sendError(ws: WebSocket, errorMessage: string): void {
    this.sendMessage(ws, {
      type: 'error',
      data: {
        message: errorMessage
      },
      timestamp: Date.now()
    })
  }

  /**
   * 清理客户端资源
   */
  cleanup(clientId: string): void {
    const client = this.clients.get(clientId)
    if (client) {
      const vm = this.getVariableManager(clientId)
      if (vm) {
        // 取消所有订阅
        client.addresses.forEach(address => {
          vm.unsubscribeByAddress(clientId, address)
        })
      }
      
      // 关闭WebSocket连接
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close()
      }
      
      this.clients.delete(clientId)
    }
  }

  /**
   * 停止服务
   */
  stop(): void {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer)
      this.broadcastTimer = null
    }

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close()
      }
    })

    this.clients.clear()

    if (this.wss) {
      this.wss.close()
      this.wss = null
    }

    console.log('[SubscriptionManager] Stopped')
  }

  /**
   * Get the WebSocket server instance
   */
  getWSS(): WebSocket.Server | null {
    return this.wss
  }

  /**
   * 获取连接的客户端数量
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * 按实例统计客户端数
   */
  getClientCountByInstance(): Record<string, number> {
    const counts: Record<string, number> = {}
    this.clients.forEach(client => {
      counts[client.instanceId] = (counts[client.instanceId] || 0) + 1
    })
    return counts
  }
}
