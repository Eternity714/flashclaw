/**
 * 任务管理服务
 */

// 使用全局数据库实例
function getDb() {
  const db = (global as any).__flashclaw_db;
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db;
}

interface ScheduledTask {
  id: string;
  group_folder: string;
  chat_jid: string;
  prompt: string;
  schedule_type: string;
  schedule_value: string;
  next_run: string | null;
  last_run: string | null;
  last_result: string | null;
  status: string;
  created_at: string;
}

interface TaskRunLog {
  task_id: string;
  run_at: string;
  duration_ms: number;
  status: string;
  result: string | null;
  error: string | null;
}

function getAllTasksFromDb(): ScheduledTask[] {
  return getDb().prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC').all() as ScheduledTask[];
}

function getTaskById(id: string): ScheduledTask | undefined {
  return getDb().prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as ScheduledTask | undefined;
}

function updateTaskInDb(id: string, updates: { status?: string }): void {
  if (updates.status !== undefined) {
    getDb().prepare('UPDATE scheduled_tasks SET status = ? WHERE id = ?').run(updates.status, id);
  }
}

function deleteTaskFromDb(id: string): void {
  getDb().prepare('DELETE FROM task_run_logs WHERE task_id = ?').run(id);
  getDb().prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);
}

function getTaskRunLogsFromDb(taskId: string, limit = 10): TaskRunLog[] {
  return getDb().prepare(`
    SELECT task_id, run_at, duration_ms, status, result, error
    FROM task_run_logs
    WHERE task_id = ?
    ORDER BY run_at DESC
    LIMIT ?
  `).all(taskId, limit) as TaskRunLog[];
}

export interface TaskInfo {
  id: string;
  groupFolder: string;
  chatJid: string;
  prompt: string;
  scheduleType: string;
  scheduleValue: string;
  nextRun: string | null;
  lastRun: string | null;
  lastResult: string | null;
  status: string;
  createdAt: string;
}

/**
 * 获取所有任务
 */
export function getTasks(): TaskInfo[] {
  const tasks = getAllTasksFromDb();
  return tasks.map(formatTask);
}

/**
 * 获取单个任务
 */
export function getTask(id: string): TaskInfo | null {
  const task = getTaskById(id);
  return task ? formatTask(task) : null;
}

/**
 * 暂停任务
 */
export function pauseTask(id: string): boolean {
  const task = getTaskById(id);
  if (!task) return false;
  
  updateTaskInDb(id, { status: 'paused' });
  return true;
}

/**
 * 恢复任务
 */
export function resumeTask(id: string): boolean {
  const task = getTaskById(id);
  if (!task) return false;
  
  updateTaskInDb(id, { status: 'active' });
  return true;
}

/**
 * 删除任务
 */
export function deleteTask(id: string): boolean {
  const task = getTaskById(id);
  if (!task) return false;
  
  deleteTaskFromDb(id);
  return true;
}

/**
 * 获取任务执行日志
 */
export function getTaskLogs(taskId: string, limit = 10): TaskRunLog[] {
  return getTaskRunLogsFromDb(taskId, limit);
}

/**
 * 格式化任务数据
 */
function formatTask(task: ScheduledTask): TaskInfo {
  return {
    id: task.id,
    groupFolder: task.group_folder,
    chatJid: task.chat_jid,
    prompt: task.prompt,
    scheduleType: task.schedule_type,
    scheduleValue: task.schedule_value,
    nextRun: task.next_run,
    lastRun: task.last_run || null,
    lastResult: task.last_result || null,
    status: task.status,
    createdAt: task.created_at,
  };
}
