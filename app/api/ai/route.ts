import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerUser, createServerClient } from '@/lib/supabase-server'

/**
 * API Route: POST /api/ai
 * 
 * Handles AI chat requests. This route:
 * 1. Verifies the user is authenticated
 * 2. Fetches the user's tasks from Supabase
 * 3. Sends the user's message + tasks to OpenAI
 * 4. Returns the AI's response
 * 
 * Security:
 * - Only runs on the server (no client code)
 * - Requires authentication via Authorization header
 * - API key is never exposed to the client
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    // 2. Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables')
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    // 3. Parse request body
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // 4. Fetch user's tasks from Supabase
    const supabase = await createServerClient()
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, description, priority, date, due_date, completed, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50) // Limit to most recent 50 tasks for context

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      // Continue without tasks if there's an error (don't fail the request)
    }

    // 5. Format tasks for the prompt
    const tasksText = tasks && tasks.length > 0
      ? tasks.map((task, idx) => {
          const status = task.completed ? '✅ Completed' : '⏳ Pending'
          const priority = task.priority ? `Priority: ${task.priority}` : ''
          const date = task.date ? `Due: ${task.date}` : task.due_date ? `Due: ${task.due_date}` : ''
          const desc = task.description ? `\n  Description: ${task.description}` : ''
          return `${idx + 1}. ${task.title} (${status})${priority ? ` - ${priority}` : ''}${date ? ` - ${date}` : ''}${desc}`
        }).join('\n')
      : 'No tasks found.'

    // 6. Create OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    // 7. Build the system prompt
    const systemPrompt = `You are a helpful AI assistant integrated into a task management application. 
The user has the following tasks:

${tasksText}

Help the user with questions about their tasks, provide suggestions for task management, 
prioritization advice, or answer general questions. Be concise, friendly, and actionable.
If the user asks about specific tasks, refer to them by their number or title.`

    // 8. Call OpenAI API
    // Note: Using gpt-4o as gpt-5 doesn't exist yet. Update when available.
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Using latest available model (gpt-5 doesn't exist yet)
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.trim() },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    // 9. Extract the AI's response
    const aiReply = completion.choices[0]?.message?.content

    if (!aiReply) {
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: 500 }
      )
    }

    // 10. Return the response
    return NextResponse.json({ reply: aiReply })
  } catch (error) {
    console.error('Error in /api/ai:', error)
    
    // Don't expose internal error details to the client
    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again.' },
      { status: 500 }
    )
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to send a message.' },
    { status: 405 }
  )
}

