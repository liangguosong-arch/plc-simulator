<script setup lang="ts">
// Device Status 面板组件 - 功能开发中
</script>

<template>
  <div class="device-status-panel">
    <div class="panel-content">
      <div class="placeholder-content">
        <div class="icon">📊</div>
        <h2>Device Status</h2>
        <p>功能开发中...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-status-panel {
  padding: 20px;
  min-height: 400px;
}

.panel-content {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.icon {
  font-size: 64px;
  margin-bottom: 10px;
}

h2 {
  color: #333;
  font-size: 24px;
  margin: 0;
}

p {
  color: #666;
  font-size: 16px;
  margin: 0;
}
</style>
