export default function summarizeChatBody(body, lastN = 2) {
  if (!body?.message || !Array.isArray(body.message)) return body;

  const total = body.message.length;

  return {
    ...body,
    message: [
      `... ${total - lastN} messages omitted ...`,
      ...body.message.slice(-lastN),
    ],
  };
}