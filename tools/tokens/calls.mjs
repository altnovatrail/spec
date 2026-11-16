// A call of the model as a transcript of Claude Code records it: an assistant record's message,
// with its id and usage, which the transcript repeats in a record for each block of its content.
// tokens-report and the orchestrator's pricing of a session (tools/orchestrator/transcript.mjs)
// read it alike. It takes no package, as the orchestrator takes none.

// The message of a record when it is a call of the model, or null: a record of another type, or a
// message with no id or usage, or one Claude Code made itself, "<synthetic>", is none.
export function callOf(record) {
  const message = record?.message;
  if (record?.type !== "assistant" || !message?.id || !message.usage || message.model === "<synthetic>") return null;
  return message;
}

// The tokens of a call by its usage, as costOf weighs them: uncached input, cache reads, cache
// writes in all and for 1 hour and 5 minutes — all of them 5 minutes when the usage does not split
// them —, output, and the speed.
export function tokensOf(usage) {
  const write = usage.cache_creation_input_tokens ?? 0;
  return {
    speed: usage.speed,
    input: usage.input_tokens ?? 0,
    read: usage.cache_read_input_tokens ?? 0,
    write,
    write1h: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    write5m: usage.cache_creation ? (usage.cache_creation.ephemeral_5m_input_tokens ?? 0) : write,
    output: usage.output_tokens ?? 0,
  };
}
