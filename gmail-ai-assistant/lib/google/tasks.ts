export interface TaskParams {
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp
  status?: 'needsAction' | 'completed';
  parent?: string; // Parent task ID for subtasks
}

export interface TaskList {
  id: string;
  title: string;
  selfLink: string;
  updated: string;
}

export async function getTaskLists(accessToken: string) {
  try {
    const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tasks API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      success: true,
      taskLists: data.items || []
    };
  } catch (error: any) {
    console.error('Get task lists error:', error);
    throw error;
  }
}

export async function createTaskList(accessToken: string, title: string) {
  try {
    const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tasks API error: ${response.status} - ${error}`);
    }

    const taskList = await response.json();
    return {
      success: true,
      taskList
    };
  } catch (error: any) {
    console.error('Create task list error:', error);
    throw error;
  }
}

export async function createTask(accessToken: string, taskListId: string, params: TaskParams) {
  try {
    const taskData = {
      title: params.title,
      ...(params.notes && { notes: params.notes }),
      ...(params.due && { due: params.due }),
      ...(params.status && { status: params.status }),
      ...(params.parent && { parent: params.parent })
    };

    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tasks API error: ${response.status} - ${error}`);
    }

    const task = await response.json();
    return {
      success: true,
      task: {
        id: task.id,
        title: task.title,
        notes: task.notes,
        due: task.due,
        status: task.status,
        selfLink: task.selfLink,
        webViewLink: `https://tasks.google.com/task/${task.id}`
      }
    };
  } catch (error: any) {
    console.error('Create task error:', error);
    throw error;
  }
}

export async function getDefaultTaskList(accessToken: string): Promise<string> {
  try {
    const { taskLists } = await getTaskLists(accessToken);
    
    // Find the default list (usually named "My Tasks" or the first one)
    const defaultList = taskLists.find((list: TaskList) => 
      list.title === 'My Tasks' || list.title === 'Tasks'
    ) || taskLists[0];

    if (!defaultList) {
      // Create a default list if none exists
      const { taskList } = await createTaskList(accessToken, 'My Tasks');
      return taskList.id;
    }

    return defaultList.id;
  } catch (error: any) {
    console.error('Get default task list error:', error);
    throw error;
  }
}

export async function createEmailTask(
  accessToken: string,
  emailData: {
    subject: string;
    from: string;
    snippet: string;
    dueDate?: string;
  }
) {
  try {
    // Get or create default task list
    const taskListId = await getDefaultTaskList(accessToken);

    // Create task from email
    const taskParams: TaskParams = {
      title: `Follow up: ${emailData.subject}`,
      notes: `From: ${emailData.from}\n\n${emailData.snippet}`,
      status: 'needsAction',
      ...(emailData.dueDate && { due: new Date(emailData.dueDate).toISOString() })
    };

    return await createTask(accessToken, taskListId, taskParams);
  } catch (error: any) {
    console.error('Create email task error:', error);
    throw error;
  }
}

export async function batchCreateTasks(
  accessToken: string,
  tasks: TaskParams[]
) {
  try {
    const taskListId = await getDefaultTaskList(accessToken);
    
    const results = await Promise.allSettled(
      tasks.map(task => createTask(accessToken, taskListId, task))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: true,
      message: `Created ${successful} tasks${failed > 0 ? `, ${failed} failed` : ''}`,
      results: results.map((r, i) => ({
        taskTitle: tasks[i].title,
        status: r.status,
        ...(r.status === 'fulfilled' ? r.value : { error: (r as any).reason?.message })
      }))
    };
  } catch (error: any) {
    console.error('Batch create tasks error:', error);
    throw error;
  }
}