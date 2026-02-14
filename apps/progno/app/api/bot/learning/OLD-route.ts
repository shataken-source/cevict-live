/**
 * Bot Learning API
 * Helps a learning bot understand and fix the Kaggle system
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  KAGGLE_TRAINING_CURRICULUM,
  generateLearningReport,
  getCurrentTask,
  getHints,
  initializeBotProgress
} from '../../../bot-learning-system';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'curriculum') {
      return NextResponse.json({
        success: true,
        curriculum: KAGGLE_TRAINING_CURRICULUM,
        totalTasks: KAGGLE_TRAINING_CURRICULUM.length
      });
    }

    if (action === 'current-task') {
      const progress = initializeBotProgress();
      const currentTask = getCurrentTask(progress);
      return NextResponse.json({
        success: true,
        currentTask,
        hints: currentTask ? getHints(currentTask.id) : []
      });
    }

    if (action === 'hints') {
      const taskId = searchParams.get('taskId');
      if (!taskId) {
        return NextResponse.json(
          { error: 'taskId required' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        hints: getHints(taskId)
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Bot Learning API',
      actions: ['curriculum', 'current-task', 'hints'],
      usage: '?action=curriculum | ?action=current-task | ?action=hints&taskId=xxx'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, taskId, stepId, error, solution } = body;

    if (action === 'complete-task') {
      if (!taskId) {
        return NextResponse.json(
          { error: 'taskId required' },
          { status: 400 }
        );
      }

      const progress = initializeBotProgress();
      // In real implementation, would load from storage
      const updatedProgress = {
        ...progress,
        tasksCompleted: progress.tasksCompleted + 1,
        currentTask: taskId,
        knowledgeGained: [...progress.knowledgeGained, `Completed task: ${taskId}`]
      };

      return NextResponse.json({
        success: true,
        message: `Task ${taskId} marked as complete`,
        progress: updatedProgress
      });
    }

    if (action === 'report-error') {
      const progress = initializeBotProgress();
      progress.errorsEncountered.push(error || 'Unknown error');

      return NextResponse.json({
        success: true,
        message: 'Error recorded',
        hint: 'Check the error and try to understand what went wrong'
      });
    }

    if (action === 'report-solution') {
      const progress = initializeBotProgress();
      progress.solutionsFound.push(solution || 'Solution found');

      return NextResponse.json({
        success: true,
        message: 'Solution recorded',
        progress
      });
    }

    if (action === 'get-report') {
      const progress = initializeBotProgress();
      const report = generateLearningReport(progress);

      return NextResponse.json({
        success: true,
        report
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

