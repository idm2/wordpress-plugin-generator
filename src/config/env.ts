export const config = {
  OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  OPENAI_API_MODEL: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4',
  OPENAI_VISION_MODEL: 'gpt-4-vision-preview',
  DEEPSEEK_API_KEY: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
  QWEN_API_KEY: process.env.NEXT_PUBLIC_QWEN_API_KEY,
  INSTA_WP_API_KEY: process.env.NEXT_PUBLIC_INSTA_WP_API_KEY,
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  ANTHROPIC_API_KEY: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || ''
} 