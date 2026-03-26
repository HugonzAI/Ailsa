export function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY || null;
}

export function getOpenAITranscribeModel() {
  return process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
}
