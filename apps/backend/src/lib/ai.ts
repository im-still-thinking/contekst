import OpenAI from 'openai'
import { config } from '../lib/config'

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY
})

export async function extractMemoryFromPrompt(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract key memorable insights from user prompts. Focus on preferences, technical context, goals, and personal context. Return 2-3 sentences.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('AI memory extraction failed:', error)
    return ''
  }
}

export async function generateMemoryTags(memory: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Generate 3-5 relevant tags as JSON array. Tags: lowercase, short phrases, useful for retrieval. Return only JSON array.`
        },
        {
          role: 'user',
          content: memory
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content || '[]'
    return JSON.parse(content)
  } catch (error) {
    console.error('Tag generation failed:', error)
    return ['general', 'memory']
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    })

    return response.data[0]?.embedding || []
  } catch (error) {
    console.error('Embedding generation failed:', error)
    throw error
  }
}