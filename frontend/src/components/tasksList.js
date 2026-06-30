import { taskComponent } from './task';

export const tasksListComponent = (tasks, usersMap = null) => {
  if (!tasks || tasks.length === 0) {
    return '<p class="text-[var(--text-muted)] text-center py-10">No tienes tareas creadas.</p>';
  }

  return tasks.map(task => {
    const ownerName = usersMap ? usersMap.get(String(task.userId)) : "";
    return taskComponent(task, ownerName);
  }).join('');
};
