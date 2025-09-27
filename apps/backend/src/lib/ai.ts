import OpenAI from 'openai'
import { config } from '../lib/config'

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY
})

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
    
    // Clean the content - remove markdown code blocks and extra whitespace
    const cleanedContent = content
      .replace(/```json\n?/g, '')  // Remove ```json
      .replace(/```\n?/g, '')      // Remove closing ```
      .replace(/`/g, '')           // Remove any remaining backticks
      .trim()
    
    return JSON.parse(cleanedContent)
  } catch (error) {
    console.error('Tag generation failed:', error)
    return ['general', 'memory']
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    console.log(`🧠 Generating embedding for text: ${text.substring(0, 100)}...`)
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text
    })

    const embedding = response.data[0]?.embedding || []
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`)
    
    if (embedding.length !== 3072) {
      console.warn(`⚠️  Unexpected embedding dimensions: ${embedding.length} (expected 3072)`)
    }

    return embedding
  } catch (error) {
    console.error('Embedding generation failed:', error)
    throw error
  }
}

export async function extractMemoryWithImages(prompt: string, images?: { base64: string; identifier: string }[]): Promise<string> {
  try {
    const messages: any[] = [
      {
        role: 'system',
        content: `Extract key memorable insights from user prompts and any associated images. Consider the relationship between text and visual content to create a cohesive memory. Focus on preferences, technical context, goals, personal context, and visual elements. Return 2-3 sentences that capture both textual and visual insights.`
      }
    ]

    // Build the user message with text and images
    const userContent: any[] = [
      {
        type: 'text',
        text: prompt
      }
    ]

    // Add images if provided
    if (images && images.length > 0) {
      images.forEach(image => {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${image.base64}`
          }
        })
      })
    }

    messages.push({
      role: 'user',
      content: userContent
    })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',  // Use gpt-4o for vision capabilities
      messages,
      max_tokens: 200,  // Slightly more tokens for richer context
      temperature: 0.3
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('AI memory extraction with images failed:', error)
    return ''
  }
}