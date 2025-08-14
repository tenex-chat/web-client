import { FileText } from 'lucide-react'
import { TaskCard } from './TaskCard'
import { VirtualList } from '@/components/ui/virtual-list'
import type { NDKTask } from '@/lib/ndk-events/NDKTask'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'

interface TasksTabContentProps {
  tasks: NDKTask[]
  taskUnreadMap: Map<string, number>
  project: NDKProject
  onTaskSelect: (project: NDKProject, taskId: string) => void
  markTaskStatusUpdatesSeen: (taskId: string) => void
}

export function TasksTabContent({
  tasks,
  taskUnreadMap,
  project,
  onTaskSelect,
  markTaskStatusUpdatesSeen,
}: TasksTabContentProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 sm:py-32 px-4 sm:px-6 text-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-muted/50 to-muted rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-sm">
          <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">
          No tasks yet
        </h3>
        <p className="text-muted-foreground max-w-sm leading-relaxed text-sm sm:text-base">
          Tasks will appear here once they are created.
        </p>
      </div>
    )
  }

  const USE_VIRTUAL_LIST_THRESHOLD = 20; // Use virtual list for more than 20 tasks

  const renderTask = (task: NDKTask) => {
    const handleTaskClick = () => {
      markTaskStatusUpdatesSeen(task.id)
      onTaskSelect(project, task.id)
    }

    const unreadCount = taskUnreadMap.get(task.id) || 0

    return (
      <div className="px-4 py-1">
        <TaskCard
          key={task.id}
          task={task}
          onClick={handleTaskClick}
          showUnread={true}
          unreadCount={unreadCount}
        />
      </div>
    )
  }

  if (tasks.length > USE_VIRTUAL_LIST_THRESHOLD) {
    // Use VirtualList for large task lists
    return (
      <VirtualList
        items={tasks}
        renderItem={renderTask}
        estimateSize={80} // Estimated average task card height
        overscan={3}
        containerClassName="h-full"
        className="py-2"
      />
    )
  }

  // Use regular rendering for small task lists
  return (
    <div className="space-y-2 p-4">
      {tasks.map((task) => {
        const handleTaskClick = () => {
          markTaskStatusUpdatesSeen(task.id)
          onTaskSelect(project, task.id)
        }

        const unreadCount = taskUnreadMap.get(task.id) || 0

        return (
          <TaskCard
            key={task.id}
            task={task}
            onClick={handleTaskClick}
            showUnread={true}
            unreadCount={unreadCount}
          />
        )
      })}
    </div>
  )
}