export const PROVIDER_ENV_MAP: Record<string, string> = {
  openrouter: "OPENROUTER_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  ollama: "OLLAMA_API_KEY",
  agentrouter: "AGENTROUTER_API_KEY",
  mistral: "MISTRAL_API_KEY",
  dashscope: "DASHSCOPE_API_KEY",
  cloudflare_ai: "CLOUDFLARE_API_TOKEN",
  nanobanana: "NANOBANANA_API_KEY",
};

export const ENDPOINT_ENV_MAP: Record<string, string> = {
  ollama: "OLLAMA_HOST",
  agentrouter: "AGENTROUTER_HOST",
};
