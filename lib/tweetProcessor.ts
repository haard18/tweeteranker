import axios from 'axios'
import { OpenAI } from 'openai'
import { CSVRow } from './csvParser'

interface Tweet {
  id: string
  text: string
  inReplyToStatusId?: string
  inReplyToId?: string
}

interface RatingResult {
  replyId: string
  tweetId: string
  originalTweetText: string
  replyText: string
  rating: number | null
  error?: string
}

const twitterApiKey = process.env.TWITTER_API_KEY
const twitterApiUrl = process.env.TWITTER_API_URL
const openaiApiKey = process.env.OPENAI_API_KEY

// Validate that API keys are configured
if (!twitterApiKey) {
  console.warn('⚠️  WARNING: TWITTER_API_KEY is not configured')
}
if (!twitterApiUrl) {
  console.warn('⚠️  WARNING: TWITTER_API_URL is not configured')
}
if (!openaiApiKey) {
  console.warn('⚠️  WARNING: OPENAI_API_KEY is not configured')
}

const twitterAxios = axios.create({
  headers: {
    'X-API-Key': twitterApiKey || '',
  },
  timeout: 10000,
})

const openai = new OpenAI({ apiKey: openaiApiKey })

// Cache to avoid redundant API calls
const tweetCache = new Map<string, Tweet>()

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function processTweets(rows: CSVRow[]): Promise<RatingResult[]> {
  const results: RatingResult[] = []

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i]
      const replyId = row.replyId
      const tweetId = row.tweetId

      // Only replyId and tweetId are strictly required
      if (!replyId || !tweetId) {
        results.push({
          replyId: replyId || 'unknown',
          tweetId: tweetId || 'unknown',
          originalTweetText: '',
          replyText: '',
          rating: null,
          error: 'Missing required fields (replyId and tweetId)',
        })
        continue
      }

      console.log(`\n📊 Processing tweet ${i + 1}/${rows.length}: ${tweetId}`)

      // Fetch reply tweet to get both text and inReplyToId
      const replyTweet = await fetchTweet(tweetId)
      if (!replyTweet) {
        results.push({
          replyId,
          tweetId,
          originalTweetText: '',
          replyText: '',
          rating: null,
          error: 'Could not fetch reply tweet from Twitter API',
        })
        await delay(500)
        continue
      }

      // Use tweet text from API or fallback to CSV
      let replyText = row.replyText || replyTweet.text || ''

      // Get the inReplyToStatusId or inReplyToId to find the original tweet
      const originalTweetId = replyTweet.inReplyToStatusId || replyTweet.inReplyToId

      let originalTweetText = row.originalTweetText || ''

      // Fetch original tweet if we have the ID
      if (originalTweetId) {
        console.log(`  → Fetching original tweet: ${originalTweetId}`)
        const originalTweet = await fetchTweet(originalTweetId)
        if (originalTweet) {
          originalTweetText = originalTweet.text
          console.log(`  ✓ Original tweet fetched`)
        } else {
          console.warn(`  ⚠ Could not fetch original tweet`)
        }
      } else {
        console.warn(`  ⚠ No inReplyToId found - cannot fetch original tweet`)
      }

      // Only rate if we have both texts
      let rating: number | null = null
      if (originalTweetText && replyText) {
        rating = await getRatingFromGPT(originalTweetText, replyText)
        console.log(`  ✓ Rating: ${rating}`)
      } else {
        console.warn(`  ⚠ Cannot rate - missing text (original: ${!!originalTweetText}, reply: ${!!replyText})`)
      }

      results.push({
        replyId,
        tweetId,
        originalTweetText,
        replyText,
        rating,
        error: !rating ? 'Could not complete rating' : undefined,
      })

    } catch (error) {
      console.error(`✗ Error processing tweet ${rows[i].tweetId}:`, error)
      results.push({
        replyId: rows[i].replyId || 'unknown',
        tweetId: rows[i].tweetId || 'unknown',
        originalTweetText: rows[i].originalTweetText || '',
        replyText: rows[i].replyText || '',
        rating: null,
        error: (error as Error).message,
      })
    }

    // Add delay to respect rate limits
    await delay(500)
  }

  console.log(`\n✅ Processing complete. ${results.filter(r => r.rating).length}/${rows.length} tweets rated.`)
  return results
}

export async function processTweetsWithLogs(
  rows: CSVRow[],
  onLog: (message: string) => void
): Promise<RatingResult[]> {
  const results: RatingResult[] = []

  // Override console.log temporarily
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn

  console.log = (message?: any, ...args: any[]) => {
    const fullMessage = args.length > 0 ? `${message} ${args.join(' ')}` : String(message)
    onLog(fullMessage)
    originalLog(message, ...args)
  }

  console.error = (message?: any, ...args: any[]) => {
    const fullMessage = args.length > 0 ? `${message} ${args.join(' ')}` : String(message)
    onLog(`[ERROR] ${fullMessage}`)
    originalError(message, ...args)
  }

  console.warn = (message?: any, ...args: any[]) => {
    const fullMessage = args.length > 0 ? `${message} ${args.join(' ')}` : String(message)
    onLog(`[WARN] ${fullMessage}`)
    originalWarn(message, ...args)
  }

  try {
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i]
        const replyId = row.replyId
        const tweetId = row.tweetId

        // Only replyId and tweetId are strictly required
        if (!replyId || !tweetId) {
          results.push({
            replyId: replyId || 'unknown',
            tweetId: tweetId || 'unknown',
            originalTweetText: '',
            replyText: '',
            rating: null,
            error: 'Missing required fields (replyId and tweetId)',
          })
          continue
        }

        console.log(`\n📊 Processing tweet ${i + 1}/${rows.length}: ${tweetId}`)

        // Fetch reply tweet to get both text and inReplyToId
        const replyTweet = await fetchTweet(tweetId)
        if (!replyTweet) {
          results.push({
            replyId,
            tweetId,
            originalTweetText: '',
            replyText: '',
            rating: null,
            error: 'Could not fetch reply tweet from Twitter API',
          })
          await delay(500)
          continue
        }

        // Use tweet text from API or fallback to CSV
        let replyText = row.replyText || replyTweet.text || ''

        // Get the inReplyToStatusId or inReplyToId to find the original tweet
        const originalTweetId = replyTweet.inReplyToStatusId || replyTweet.inReplyToId

        let originalTweetText = row.originalTweetText || ''

        // Fetch original tweet if we have the ID
        if (originalTweetId) {
          console.log(`  → Fetching original tweet: ${originalTweetId}`)
          const originalTweet = await fetchTweet(originalTweetId)
          if (originalTweet) {
            originalTweetText = originalTweet.text
            console.log(`  ✓ Original tweet fetched`)
          } else {
            console.warn(`  ⚠ Could not fetch original tweet`)
          }
        } else {
          console.warn(`  ⚠ No inReplyToId found - cannot fetch original tweet`)
        }

        // Only rate if we have both texts
        let rating: number | null = null
        if (originalTweetText && replyText) {
          rating = await getRatingFromGPT(originalTweetText, replyText)
          console.log(`  ✓ Rating: ${rating}`)
        } else {
          console.warn(`  ⚠ Cannot rate - missing text (original: ${!!originalTweetText}, reply: ${!!replyText})`)
        }

        results.push({
          replyId,
          tweetId,
          originalTweetText,
          replyText,
          rating,
          error: !rating ? 'Could not complete rating' : undefined,
        })

      } catch (error) {
        console.error(`✗ Error processing tweet ${rows[i].tweetId}:`, error)
        results.push({
          replyId: rows[i].replyId || 'unknown',
          tweetId: rows[i].tweetId || 'unknown',
          originalTweetText: rows[i].originalTweetText || '',
          replyText: rows[i].replyText || '',
          rating: null,
          error: (error as Error).message,
        })
      }

      // Add delay to respect rate limits
      await delay(500)
    }

    console.log(`\n✅ Processing complete. ${results.filter(r => r.rating).length}/${rows.length} tweets rated.`)
    return results
  } finally {
    // Restore original console methods
    console.log = originalLog
    console.error = originalError
    console.warn = originalWarn
  }
}

async function fetchTweet(tweetId: string): Promise<Tweet | null> {
  try {
    // Check cache first
    if (tweetCache.has(tweetId)) {
      console.log(`✓ Using cached tweet: ${tweetId}`)
      return tweetCache.get(tweetId)!
    }

    console.log(`→ Fetching tweet: ${tweetId}`)

    // Validate configuration
    if (!twitterApiUrl) {
      throw new Error('TWITTER_API_URL is not configured')
    }
    if (!twitterApiKey) {
      throw new Error('TWITTER_API_KEY is not configured')
    }

    const url = `${twitterApiUrl}?tweet_ids=${tweetId}`
    console.log(`  URL: ${url}`)
    console.log(`  Header: X-API-Key: ${twitterApiKey.substring(0, 10)}...`)

    const response = await twitterAxios.get(url)

    console.log(`← Tweet response status: ${response.status}`)

    // Handle the TwitterAPI.io response format
    const tweets = response.data?.tweets || response.data?.data || []
    const tweet = Array.isArray(tweets) ? tweets[0] : tweets

    if (tweet) {
      const mappedTweet: Tweet = {
        id: tweet.id || tweetId,
        text: tweet.text || '',
        inReplyToStatusId: tweet.inReplyToStatusId || tweet.in_reply_to_status_id,
        inReplyToId: tweet.inReplyToId || tweet.in_reply_to_id,
      }
      tweetCache.set(tweetId, mappedTweet)
      console.log(`✓ Fetched tweet ${tweetId}: "${mappedTweet.text.substring(0, 50)}..."`)
      return mappedTweet
    }

    console.warn(`⚠ No tweet data found for ID: ${tweetId}`)
    console.warn(`  Response: ${JSON.stringify(response.data)}`)
    return null
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    // Provide more detailed error messages
    if (error instanceof axios.AxiosError) {
      console.error(`✗ Twitter API Error fetching tweet ${tweetId}:`)
      console.error(`  Status: ${error.response?.status}`)
      console.error(`  Message: ${errorMsg}`)
      console.error(`  Response: ${JSON.stringify(error.response?.data)}`)
      
      if (error.response?.status === 401) {
        console.error(`  ❌ Authentication failed - check your TWITTER_API_KEY`)
      } else if (error.response?.status === 404) {
        console.error(`  ⚠ Tweet not found - ID may be invalid or deleted`)
      } else if (error.response?.status === 429) {
        console.error(`  ⚠ Rate limit exceeded - waiting before retry`)
      }
    } else {
      console.error(`✗ Error fetching tweet ${tweetId}: ${errorMsg}`)
    }
    return null
  }
}

async function getRatingFromGPT(
  originalText: string,
  replyText: string
): Promise<number | null> {
  try {
    if (!originalText || !replyText) {
      console.warn('⚠ Missing text for rating: original or reply text is empty')
      return null // Return null instead of default rating
    }

    const prompt = `You are rating Twitter replies based on how good they are relative to the original tweet.

Original Tweet: "${originalText}"
Reply: "${replyText}"

Output only a single number between 1 and 10 representing the quality of the reply.

Consider factors like:
- Relevance to the original tweet
- Quality of the response
- Constructiveness
- Engagement value

Respond with just the number.`

    console.log('  → Sending request to OpenAI...')
    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = message.choices[0]?.message?.content
    if (content) {
      // Extract just the number from the response
      const numberMatch = content.match(/\d+/)
      if (numberMatch) {
        const rating = parseInt(numberMatch[0], 10)
        const validRating = Math.min(Math.max(rating, 1), 10) // Ensure rating is between 1-10
        console.log(`  ← Rating: ${validRating}`)
        return validRating
      }
    }

    console.warn(`⚠ Could not parse rating from response: "${content}"`)
    return null // Return null if parsing fails
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`✗ Error getting rating from GPT: ${errorMsg}`)
    return null // Return null on error
  }
}
