import { describe, it, expect, beforeEach } from 'vitest';
import { TaskService, ConcurrencyConflictError } from '../src/services/taskService';
import { TaskRepository } from '../src/repositories/taskRepository';
import { Task } from '../src/types';

class MockTaskRepository extends TaskRepository {
  private tasks = new Map<number, Task>();

  seed(tasks: Task[]) {
    tasks.forEach(t => this.tasks.set(t.id, t));
  }

  private commentsList: any[] = [];

  async createComment(taskId: number, userId: number, content: string): Promise<any> {
    const com = {
      id: this.commentsList.length + 1,
      taskId,
      userId,
      content,
      authorName: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.commentsList.push(com);
    return com;
  }

  async findCommentsByTaskId(taskId: number): Promise<any[]> {
    return this.commentsList.filter(c => c.taskId === taskId);
  }

  async findCommentById(id: number): Promise<any | null> {
    return this.commentsList.find(c => c.id === id) || null;
  }

  async deleteComment(id: number): Promise<boolean> {
    const idx = this.commentsList.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.commentsList.splice(idx, 1);
      return true;
    }
    return false;
  }

  async findById(id: number): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async findByBoardId(boardId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(t => t.boardId === boardId);
  }

  async create(data: any): Promise<Task> {
    const newTask: Task = {
      ...data,
      id: this.tasks.size + 1,
      version: 1,
      comments: [],
      commentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  async updateWithVersion(
    id: number,
    columnId: number,
    orderIndex: number,
    expectedVersion: number
  ): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;

    // Concurrency version check
    if (task.version !== expectedVersion) {
      return false;
    }

    task.columnId = columnId;
    task.orderIndex = orderIndex;
    task.version += 1;
    task.updatedAt = new Date();
    return true;
  }

  async findPaginated(options: any): Promise<any> {
    const all = Array.from(this.tasks.values()).filter(t => {
      if (options.priority && t.priority !== options.priority) return false;
      if (options.search && !t.title.toLowerCase().includes(options.search.toLowerCase())) return false;
      return true;
    });
    const page = options.page || 1;
    const limit = options.limit || 10;
    const items = all.slice((page - 1) * limit, page * limit);
    return {
      items,
      pagination: {
        page,
        limit,
        total: all.length,
        totalPages: Math.ceil(all.length / limit) || 1,
        hasNextPage: page * limit < all.length,
        hasPrevPage: page > 1
      }
    };
  }
}

describe('TaskService Unit Tests', () => {
  let taskService: TaskService;
  let mockRepo: MockTaskRepository;

  beforeEach(() => {
    mockRepo = new MockTaskRepository();
    taskService = new TaskService(mockRepo);

    mockRepo.seed([
      {
        id: 1,
        taskKey: 'DP-101',
        boardId: 1,
        columnId: 1, // To Do
        title: 'Implement Unit Tests',
        priority: 'HIGH',
        status: 'TODO',
        orderIndex: 1000,
        reporterId: 1,
        version: 1,
        comments: [],
        commentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });

  it('successfully moves task and increments OCC version', async () => {
    const updated = await taskService.moveTask(1, 2, 1500, 1);

    expect(updated.columnId).toBe(2);
    expect(updated.orderIndex).toBe(1500);
    expect(updated.version).toBe(2);
  });

  it('rejects stale write with ConcurrencyConflictError when expectedVersion mismatches', async () => {
    // Current version in db is 1. If client sends expectedVersion: 0 (stale), it should throw
    await expect(
      taskService.moveTask(1, 2, 1500, 0)
    ).rejects.toThrow(ConcurrencyConflictError);
  });

  it('creates new task with initial version = 1', async () => {
    const created = await taskService.createTask({
      boardId: 1,
      columnId: 1,
      title: 'New Feature Task',
      priority: 'MEDIUM',
      reporterId: 1
    });

    expect(created.id).toBeDefined();
    expect(created.version).toBe(1);
    expect(created.title).toBe('New Feature Task');
  });

  it('retrieves server-side paginated tasks with metadata', async () => {
    // Add additional mock tasks
    for (let i = 2; i <= 15; i++) {
      await taskService.createTask({
        boardId: 1,
        columnId: 1,
        title: `Task #${i}`,
        priority: i % 2 === 0 ? 'HIGH' : 'LOW',
        reporterId: 1
      });
    }

    const res = await taskService.getPaginatedTasks({ page: 1, limit: 5 });
    expect(res.items.length).toBe(5);
    expect(res.pagination.total).toBe(15);
    expect(res.pagination.totalPages).toBe(3);
    expect(res.pagination.hasNextPage).toBe(true);
    expect(res.pagination.hasPrevPage).toBe(false);

    // Test priority filtering
    const highPriorityRes = await taskService.getPaginatedTasks({ page: 1, limit: 20, priority: 'HIGH' });
    expect(highPriorityRes.items.every(t => t.priority === 'HIGH')).toBe(true);
  });

  it('adds a comment to a task', async () => {
    const comment = await taskService.addComment(1, 1, 'First review note on this task.');
    expect(comment).toBeDefined();
    expect(comment.id).toBeDefined();
    expect(comment.content).toBe('First review note on this task.');

    const comments = await taskService.getComments(1);
    expect(comments.length).toBe(1);
    expect(comments[0].content).toBe('First review note on this task.');
  });

  it('deletes a comment when authorized', async () => {
    const comment = await taskService.addComment(1, 1, 'To be removed');
    const commentsBefore = await taskService.getComments(1);
    expect(commentsBefore.length).toBe(1);

    const deleted = await taskService.deleteComment(comment.id, 1, 'MEMBER');
    expect(deleted).toBe(true);

    const commentsAfter = await taskService.getComments(1);
    expect(commentsAfter.length).toBe(0);
  });
});
