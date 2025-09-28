import OpenAI from 'openai'
import { config } from '../lib/config'

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY
})

// Intent-based processing for better memory extraction
export async function processTextWithIntent(text: string, source: string): Promise<{
  summary: string
  keyPoints: string[]
  tags: string[]
  chunks: string[]
}> {
  console.log(`[TextProcessor] Starting intent-based processing from source: ${source}`)
  console.log(`[TextProcessor] Input text (${text.length} chars): "${text.substring(0, 100)}..."`)

  // Single LLM call for intent extraction instead of separate calls
  const intentData = await extractIntent(text)
  
  // Use original text for chunking to preserve context
  const chunks = chunkText(text)
  console.log(`[TextProcessor] Created ${chunks.length} chunks from original text`)

  return {
    summary: intentData.summary,
    keyPoints: intentData.keyPoints,
    tags: intentData.tags,
    chunks,
  }
}

async function extractIntent(text: string): Promise<{summary: string, keyPoints: string[], tags: string[]}> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Extract the user's intent and key information in JSON format. Focus on what they want to achieve, not just what they said.

Return JSON with:
- "summary": A brief intent-focused summary (what user wants/needs/context)
- "keyPoints": Array of 2-4 specific facts or requirements mentioned
- "tags": Array of 3-6 relevant keywords/technologies

Example: {"summary": "User wants to implement camera permissions in iOS app", "keyPoints": ["Building iOS app", "Need camera access", "Working with permissions"], "tags": ["ios", "camera", "permissions", "mobile development"]}`
      },
      {
        role: 'user',
        content: text
      }
    ],
    max_completion_tokens: 2000,
    temperature: 0.3
  })

  const content = response.choices[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('No content returned from intent extraction')
  }

  const cleanedContent = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/`/g, '')
    .trim()

  const parsed = JSON.parse(cleanedContent)
  
  if (!parsed.summary || !Array.isArray(parsed.keyPoints) || !Array.isArray(parsed.tags)) {
    throw new Error('Invalid JSON structure returned from intent extraction')
  }
  
  return {
    summary: parsed.summary,
    keyPoints: parsed.keyPoints,
    tags: parsed.tags,
  }
}



function chunkText(text: string): string[] {
  const chunkSize = 1000  // Config from performant version
  const chunkOverlap = 200

  if (text.length <= chunkSize) {
    return [text]
  }

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + chunkSize
    
    if (end >= text.length) {
      chunks.push(text.slice(start))
      break
    }

    let splitPoint = end
    const searchStart = Math.max(start + chunkSize - chunkOverlap, start)
    
    for (let i = end; i >= searchStart; i--) {
      if (text[i] === '\n' || text[i] === '.' || text[i] === ' ') {
        splitPoint = i + 1
        break
      }
    }

    chunks.push(text.slice(start, splitPoint))
    start = splitPoint - chunkOverlap
    
    if (start < 0) start = 0
  }

  return chunks.filter(chunk => chunk.trim().length > 0)
}

export async function generateMemoryTags(memory: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
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

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content returned from tag generation')
  }
  
  // Clean the content - remove markdown code blocks and extra whitespace
  const cleanedContent = content
    .replace(/```json\n?/g, '')  // Remove ```json
    .replace(/```\n?/g, '')      // Remove closing ```
    .replace(/`/g, '')           // Remove any remaining backticks
    .trim()
  
  const tags = JSON.parse(cleanedContent)
  if (!Array.isArray(tags)) {
    throw new Error('Tags response is not an array')
  }
  
  return tags
}

export async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`🧠 Generating embedding for text: ${text.substring(0, 100)}...`)
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072  // Explicitly set dimensions for consistency
  })

  const embedding = response.data[0]?.embedding
  if (!embedding) {
    throw new Error('No embedding returned from OpenAI API')
  }
  
  console.log(`✅ Generated embedding with ${embedding.length} dimensions`)
  
  if (embedding.length !== 3072) {
    throw new Error(`Unexpected embedding dimensions: ${embedding.length} (expected 3072)`)
  }

  return embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  console.log(`🧠 Generating embeddings for ${texts.length} texts`)
  
  // Process in batches to avoid API limits
  const batchSize = 100
  const results: number[][] = []
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: batch,
      dimensions: 3072
    })

    const embeddings = response.data.map(item => {
      if (!item.embedding) {
        throw new Error('Missing embedding in batch response')
      }
      if (item.embedding.length !== 3072) {
        throw new Error(`Unexpected embedding dimensions: ${item.embedding.length} (expected 3072)`)
      }
      return item.embedding
    })
    
    results.push(...embeddings)
    
    console.log(`✅ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(texts.length/batchSize)}`)
  }

  console.log(`✅ Generated ${results.length} embeddings`)
  return results
}

export async function extractMemoryWithImages(prompt: string, images?: { base64: string; identifier: string }[]): Promise<string> {
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

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content returned from memory extraction')
  }
  
  return content
}