import { supabase } from './supabase'

export type Priority = 'High' | 'Medium' | 'Low'

// Test function to verify Supabase connection and permissions
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log('Testing Supabase connection...')
    
    // Test 1: Check if we can read from the table
    const { data: readData, error: readError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1)
    
    if (readError) {
      return {
        success: false,
        message: `Failed to read from tasks table: ${readError.message}`,
        details: readError
      }
    }
    console.log('✓ Read test passed')
    
    // Test 2: Try to insert a test task
    // Get current user ID for test task
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return {
        success: false,
        message: `User not authenticated: ${userError?.message || 'No user found'}`,
        details: userError
      }
    }
    
    const testTask = {
      title: 'Test Connection Task',
      description: 'This is a test task to verify database connection',
      priority: 'Low' as Priority,
      date: new Date().toISOString().split('T')[0],
      completed: false,
      user_id: user.id
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('tasks')
      .insert([testTask])
      .select()
      .single()
    
    if (insertError) {
      return {
        success: false,
        message: `Failed to insert into tasks table: ${insertError.message}`,
        details: insertError
      }
    }
    console.log('✓ Insert test passed')
    const testTaskId = insertData.id
    
    // Test 3: Try to update the test task
    const { data: updateData, error: updateError } = await supabase
      .from('tasks')
      .update({ title: 'Updated Test Task' })
      .eq('id', testTaskId)
      .select()
      .single()
    
    if (updateError) {
      // Clean up test task even if update fails
      await supabase.from('tasks').delete().eq('id', testTaskId)
      return {
        success: false,
        message: `Failed to update tasks table: ${updateError.message}`,
        details: updateError
      }
    }
    console.log('✓ Update test passed')
    
    // Test 4: Try to delete the test task
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', testTaskId)
    
    if (deleteError) {
      return {
        success: false,
        message: `Failed to delete from tasks table: ${deleteError.message}`,
        details: deleteError
      }
    }
    console.log('✓ Delete test passed')
    
    return {
      success: true,
      message: 'All database operations are working correctly!'
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    }
  }
}

export type Task = {
  id: string
  user_id: string
  title: string
  description?: string | null
  priority: Priority
  date: string
  completed: boolean
  completed_at?: string | null
  created_at?: string
  updated_at?: string
}

// Helper function to get current user ID
async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('User not authenticated')
  }
  return user.id
}

// Get all incomplete tasks (for main view)
export async function getTasks(): Promise<Task[]> {
  console.log('Fetching tasks from database...')
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('completed', false)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching tasks:', error)
    throw error
  }

  console.log(`Loaded ${data?.length || 0} incomplete tasks from database`)
  if (data && data.length > 0) {
    console.log('Task IDs:', data.map(t => t.id))
    console.log('Task titles:', data.map(t => t.title))
  }
  return data || []
}

// Get ALL tasks (including completed) - for verification
export async function getAllTasks(): Promise<Task[]> {
  console.log('Fetching ALL tasks from database (including completed)...')
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all tasks:', error)
    throw error
  }

  console.log(`Loaded ${data?.length || 0} total tasks from database`)
  if (data && data.length > 0) {
    console.log('All tasks:', data.map(t => ({ id: t.id, title: t.title, completed: t.completed, date: t.date })))
  }
  return data || []
}

// Get tasks for a specific date
export async function getTasksByDate(date: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching tasks by date:', error)
    throw error
  }

  return data || []
}

// Get completed tasks
export async function getCompletedTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('completed', true)
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Error fetching completed tasks:', error)
    throw error
  }

  return data || []
}

// Create a new task
export async function createTask(task: {
  title: string
  description?: string
  priority: Priority
  date: string
}): Promise<Task> {
  // Get current user ID - RLS will also enforce this, but we set it explicitly
  const userId = await getCurrentUserId()
  
  const insertData = {
    title: task.title,
    description: task.description || null,
    priority: task.priority,
    date: task.date,
    completed: false,
    user_id: userId
  }
  
  console.log('=== CREATE TASK START ===')
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Insert data:', JSON.stringify(insertData, null, 2))
  
  const { data, error, status, statusText } = await supabase
    .from('tasks')
    .insert([insertData])
    .select()
    .single()

  console.log('Response status:', status, statusText)
  console.log('Response data:', data)
  console.log('Response error:', error)

  if (error) {
    console.error('❌ ERROR CREATING TASK:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('Error hint:', error.hint)
    throw new Error(`Failed to create task: ${error.message} (Code: ${error.code || 'unknown'})`)
  }

  if (!data) {
    console.error('⚠️ Create succeeded but no data returned')
    console.error('Status:', status, statusText)
    throw new Error('Task creation succeeded but no data was returned')
  }

  console.log('✅ CREATE SUCCESSFUL!')
  console.log('Created task:', JSON.stringify(data, null, 2))
  console.log('Task ID:', data.id)
  console.log('=== CREATE TASK END ===')
  
  return data
}

// Update a task
export async function updateTask(
  id: string,
  updates: {
    title?: string
    description?: string
    priority?: Priority
    date?: string
    completed?: boolean
  }
): Promise<Task> {
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString()
  }

  // If marking as completed, set completed_at
  if (updates.completed === true) {
    updateData.completed_at = new Date().toISOString()
  } else if (updates.completed === false) {
    updateData.completed_at = null
  }

  console.log('Supabase update call:', { id, updateData })
  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating task:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to update task: ${error.message} (Code: ${error.code})`)
  }

  if (!data) {
    console.error('Update succeeded but no data returned')
    throw new Error('Task update succeeded but no data was returned')
  }

  console.log('Update successful, returned data:', data)
  return data
}

// Delete a task
export async function deleteTask(id: string): Promise<void> {
  console.log('Supabase delete call:', { id })
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting task:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to delete task: ${error.message} (Code: ${error.code})`)
  }

  console.log('Delete successful')
}
