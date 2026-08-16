/**
 * 生成唯一实例ID（纯函数，与任何持久化存储解耦）
 */
export function generateInstanceId(): string {
  const now = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 6)
  return `inst-${now}-${rand}`
}
