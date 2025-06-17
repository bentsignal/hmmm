export const getSpeechCommands = (
  voiceSetModel: (name: string, prompt: string) => void,
) => {
  return [
    /*

      Google

    */
    {
      command: "* Use gemini 2.5 flash",
      callback: (prompt: string) => voiceSetModel("gemini-2.5-flash", prompt),
    },
    {
      command: "* Use 2.5 flash",
      callback: (prompt: string) => voiceSetModel("gemini-2.5-flash", prompt),
    },
    {
      command: "* Use gemini 2.5 pro",
      callback: (prompt: string) => voiceSetModel("gemini-2.5-pro", prompt),
    },
    {
      command: "* Use 2.5 pro",
      callback: (prompt: string) => voiceSetModel("gemini-2.5-pro", prompt),
    },
    /*
    
      OpenAI

    */
    {
      command: "* Use GPT 4.1",
      callback: (prompt: string) => voiceSetModel("gpt-4.1", prompt),
    },
    {
      command: "* Use GPT 4.0",
      callback: (prompt: string) => voiceSetModel("gpt-4o", prompt),
    },
    {
      command: "* Use GPT 4o",
      callback: (prompt: string) => voiceSetModel("gpt-4o", prompt),
    },
    {
      command: "* Use GPT for oh",
      callback: (prompt: string) => voiceSetModel("gpt-4o", prompt),
    },
    {
      command: "* Use GPT for o",
      callback: (prompt: string) => voiceSetModel("gpt-4o", prompt),
    },
    {
      command: "* Use 04 mini",
      callback: (prompt: string) => voiceSetModel("o4-mini", prompt),
    },
    {
      command: "* Use 03",
      callback: (prompt: string) => voiceSetModel("o3", prompt),
    },
    /*

      Anthropic

    */
    {
      command: "* Use claude 3.5 sonnet",
      callback: (prompt: string) => voiceSetModel("claude-3.5-sonnet", prompt),
    },
    {
      command: "* Use claude 4 sonnet",
      callback: (prompt: string) => voiceSetModel("claude-4-sonnet", prompt),
    },
    {
      command: "* Use claude for sonnet",
      callback: (prompt: string) => voiceSetModel("claude-4-sonnet", prompt),
    },
    {
      command: "* Use claude four sonnet",
      callback: (prompt: string) => voiceSetModel("claude-4-sonnet", prompt),
    },
    /*

      DeepSeek

    */
    {
      command: "* Use R1",
      callback: (prompt: string) => voiceSetModel("deepseek-r1", prompt),
    },
    {
      command: "* Use V3",
      callback: (prompt: string) => voiceSetModel("deepseek-v3", prompt),
    },
    /*
    
      xAI

    */
    {
      command: "* Use Grok 3",
      callback: (prompt: string) => voiceSetModel("grok-3", prompt),
    },
    {
      command: "* Use Grok 3 mini",
      callback: (prompt: string) => voiceSetModel("grok-3-mini", prompt),
    },
    /*
    
      Meta

    */
    {
      command: "* Use Llama 4 Maverick",
      callback: (prompt: string) => voiceSetModel("llama-4-maverick", prompt),
    },
    {
      command: "* Use Maverick",
      callback: (prompt: string) => voiceSetModel("llama-4-maverick", prompt),
    },
    {
      command: "* Use Llama for Maverick",
      callback: (prompt: string) => voiceSetModel("llama-4-maverick", prompt),
    },
    {
      command: "* Use Llama 4 Scout",
      callback: (prompt: string) => voiceSetModel("llama-4-scout", prompt),
    },
    {
      command: "* Use Scout",
      callback: (prompt: string) => voiceSetModel("llama-4-scout", prompt),
    },
    {
      command: "* Use Llama for Scout",
      callback: (prompt: string) => voiceSetModel("llama-4-scout", prompt),
    },
  ];
};
