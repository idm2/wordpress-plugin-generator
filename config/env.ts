export const config = {
  OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  OPENAI_API_MODEL: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-3.5-turbo',
  OPENAI_VISION_MODEL: 'gpt-4o-mini',
  INSTA_WP_API_KEY: process.env.NEXT_PUBLIC_INSTA_WP_API_KEY,
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
}
