import { BoardRepository } from '../repositories/boardRepository.js';
import { TaskRepository } from '../repositories/taskRepository.js';
import type { Board, Task } from '../types/index.js';
import { NotFoundError } from '../errors/AppError.js';

export interface BoardDetails {
  board: Board;
  tasks: Task[];
}

export class BoardService {
  constructor(
    private readonly boardRepo: BoardRepository = new BoardRepository(),
    private readonly taskRepo: TaskRepository = new TaskRepository()
  ) {}

  // Fetch a board by its slug along with its associated tasks, applying optional filters
  async getBoardWithTasks(
    slug: string = 'engineering-sprint',
    filters?: { search?: string; priority?: string; category?: string }
  ): Promise<BoardDetails> {
    const board = await this.boardRepo.findBySlug(slug);
    if (!board) {
      throw new NotFoundError(`Board with slug '${slug}' not found`);
    }

    const tasks = await this.taskRepo.findByBoardId(board.id, filters);
    return { board, tasks };
  }
}
