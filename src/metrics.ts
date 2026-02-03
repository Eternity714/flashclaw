// src/metrics.ts

/**
 * 简单的 Prometheus 指标收集器
 * 不依赖外部库，手动生成 Prometheus 格式
 */

interface CounterValue {
  value: number;
  labels: Record<string, string>;
}

interface GaugeValue {
  value: number;
  labels: Record<string, string>;
}

interface HistogramValue {
  sum: number;
  count: number;
  buckets: Map<number, number>;
  labels: Record<string, string>;
}

class Counter {
  private values: CounterValue[] = [];
  
  constructor(
    public readonly name: string,
    public readonly help: string
  ) {}
  
  inc(labels: Record<string, string> = {}, value: number = 1): void {
    const existing = this.values.find(v => 
      JSON.stringify(v.labels) === JSON.stringify(labels)
    );
    if (existing) {
      existing.value += value;
    } else {
      this.values.push({ value, labels });
    }
  }
  
  getValues(): CounterValue[] {
    return this.values;
  }
}

class Gauge {
  private values: GaugeValue[] = [];
  
  constructor(
    public readonly name: string,
    public readonly help: string
  ) {}
  
  set(value: number, labels: Record<string, string> = {}): void {
    const existing = this.values.find(v => 
      JSON.stringify(v.labels) === JSON.stringify(labels)
    );
    if (existing) {
      existing.value = value;
    } else {
      this.values.push({ value, labels });
    }
  }
  
  inc(labels: Record<string, string> = {}, value: number = 1): void {
    const existing = this.values.find(v => 
      JSON.stringify(v.labels) === JSON.stringify(labels)
    );
    if (existing) {
      existing.value += value;
    } else {
      this.values.push({ value, labels });
    }
  }
  
  getValues(): GaugeValue[] {
    return this.values;
  }
}

// 预定义指标
export const metrics = {
  messagesReceived: new Counter('flashclaw_messages_received_total', 'Total messages received'),
  messagesSent: new Counter('flashclaw_messages_sent_total', 'Total messages sent'),
  apiCalls: new Counter('flashclaw_api_calls_total', 'Total API calls'),
  apiErrors: new Counter('flashclaw_api_errors_total', 'Total API errors'),
  tasksScheduled: new Counter('flashclaw_tasks_scheduled_total', 'Total tasks scheduled'),
  tasksExecuted: new Counter('flashclaw_tasks_executed_total', 'Total tasks executed'),
  pluginsLoaded: new Gauge('flashclaw_plugins_loaded', 'Number of loaded plugins'),
  activeConnections: new Gauge('flashclaw_active_connections', 'Number of active connections'),
  uptime: new Gauge('flashclaw_uptime_seconds', 'Uptime in seconds'),
};

const startTime = Date.now();

/**
 * 生成 Prometheus 格式的指标输出
 */
export function getMetricsOutput(): string {
  const lines: string[] = [];
  
  // 更新 uptime
  metrics.uptime.set(Math.floor((Date.now() - startTime) / 1000));
  
  // Counter 指标
  for (const [key, counter] of Object.entries(metrics)) {
    if (counter instanceof Counter) {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      for (const v of counter.getValues()) {
        const labelStr = Object.entries(v.labels)
          .map(([k, val]) => `${k}="${val}"`)
          .join(',');
        lines.push(`${counter.name}${labelStr ? `{${labelStr}}` : ''} ${v.value}`);
      }
    }
  }
  
  // Gauge 指标
  for (const [key, gauge] of Object.entries(metrics)) {
    if (gauge instanceof Gauge) {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      for (const v of gauge.getValues()) {
        const labelStr = Object.entries(v.labels)
          .map(([k, val]) => `${k}="${val}"`)
          .join(',');
        lines.push(`${gauge.name}${labelStr ? `{${labelStr}}` : ''} ${v.value}`);
      }
    }
  }
  
  return lines.join('\n');
}
