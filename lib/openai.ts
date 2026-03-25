export function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY || null;
}
