import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { AZURE_DEPLOYMENT_ID, OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '../app/const';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

export const OpenAIStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature : number,
  key: string,
  messages: Message[],
) => {
  let url = `${OPENAI_API_HOST}/v1/chat/completions`;
  if (OPENAI_API_TYPE === 'azure') {
    url = `${OPENAI_API_HOST}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
  }
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(OPENAI_API_TYPE === 'openai' && {
        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`
      }),
      ...(OPENAI_API_TYPE === 'azure' && {
        'api-key': `${key ? key : process.env.OPENAI_API_KEY}`
      }),
      ...((OPENAI_API_TYPE === 'openai' && OPENAI_ORGANIZATION) && {
        'OpenAI-Organization': OPENAI_ORGANIZATION,
      }),
    },
    method: 'POST',
    body: JSON.stringify({
      ...(OPENAI_API_TYPE === 'openai' && {model: model.id}),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: temperature,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code,
      );
    } else {
      throw new Error(
        `OpenAI API returned an error: ${
          decoder.decode(result?.value) || result.statusText
        }`,
      );
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          try {
            const json = JSON.parse(data);
            if (json.choices[0].finish_reason != null) {
              controller.close();
              return;
            }
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};


const url = "http://172.16.6.11:8000";

export const Chatgml6Stream = async (
  messages: Message[],
  top_p: number,
  temperature: number,
  max_length: number,
) => {
  // streamed response
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      prompt: messages[messages.length-1].content,
      top_p: top_p,
      temperature: temperature,
      max_length: max_length,
      history:[],
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  //@ts-ignore
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const convertToReadableStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let json = '';
          const decoder = new TextDecoder(); 
          const encoder = new TextEncoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              //console.log(json)
              let ret = JSON.parse(json)['response'];
              const queue = encoder.encode(ret);
              controller.enqueue(queue);
              controller.close();
              return;
            }
            const stringValue = decoder.decode(value); 
            json += stringValue;
          }
        } finally {
          reader.releaseLock();
        }
      },
    });

    return stream;
  };

  return await convertToReadableStream(reader);
};