import { GoogleSource } from '@/types/google';
import endent from 'endent';
import jsdom, { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { cleanSourceText } from '@/utils/server/google';

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
    this.name = 'ServerError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

export const OpenAIStream = async (
  cookie_id: string,
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
  let ret_str = '';
  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          try {
            const json = JSON.parse(data);
            if (json.choices[0].finish_reason != null) {
              if (cookie_id !== ''){
                ret_str = processValue(cookie_id,'', ret_str, true);
              }
              controller.close();
              return;
            }
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            if (cookie_id !== ''){
              const tstr = text;
              ret_str += tstr;
              ret_str = processValue(cookie_id,tstr, ret_str, false);
            }
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

export const StableDiffusion = async (
  messages: Message[],
) => {
  //translate to english
  console.log(messages[messages.length-1].content);
  let url = "http://172.16.6.11:8000";
  let response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      prompt: `将下面的内容翻译成英文：\n    ${messages[messages.length-1].content}`,
      top_p: 0.3,
      temperature: 0.3,
      max_length: 8000,
      history: [],
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  //@ts-ignore
  const en_str = await response.json();
  const cmd = en_str.response;
  console.log(cmd);
  
  // streamed response
  url = "http://127.0.0.1:11223/stablediffusion";
  response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      prompt: cmd,
      action: 'regenerate',
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  //@ts-ignore
  const filename = await response.json();
  return `![this is the picture](api/showfile?fileName=${filename})`
};

export const ChatAIStream = async (
  cookie_id: string,
  llm_type: string,
  messages: Message[],
  top_p: number,
  temperature: number,
  max_length: number,
) => {
  // streamed response
  const url = "http://127.0.0.1:11223/qianwen/stream";
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      prompt: messages,
      top_p: top_p,
      temperature: temperature,
      max_length: max_length,
      llm_type: llm_type,
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  //@ts-ignore
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let ret_str = '';
  
  const convertToReadableStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if(value){
              controller.enqueue(value);
              if (cookie_id !== ''){
                const tstr = decoder.decode(value);
                ret_str += tstr;
                ret_str = processValue(cookie_id,tstr, ret_str, false);
                
              }
            }
            if (done) {
              if (cookie_id !== ''){
                ret_str = processValue(cookie_id,'', ret_str, true);
              }
              controller.close();
              return;
            }
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

export const SparkStream = async (
  cookie_id: string,
  messages: Message[],
  top_p: number,
  temperature: number,
  max_length: number,
) => {
  // streamed response
  const url = "http://127.0.0.1:11223/spark/stream";
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      prompt: messages,
      top_p: top_p,
      temperature: temperature,
      max_length: max_length,
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  //@ts-ignore
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let ret_str = '';
  const convertToReadableStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if(value){
              if (cookie_id !== ''){
                const tstr = decoder.decode(value);
                ret_str += tstr;
                ret_str = processValue(cookie_id,tstr, ret_str, false);
              }
              controller.enqueue(value);
            }
            if (done) {
              if (cookie_id !== ''){
                ret_str = processValue(cookie_id,'', ret_str, true);
              }
              controller.close();
              return;
            }
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

function processValue(cookie_id: string ,tstr: string, ret_str: string, all_mesg: boolean): string {
  let au_s = '';
  if (all_mesg){
    au_s = ret_str;
  } else {
    for (let char of '。.！!？?：:') {
      if (tstr.includes(char)) {
        au_s = ret_str.slice(0, 1 + ret_str.lastIndexOf(char));
        ret_str = ret_str.slice(1 + ret_str.lastIndexOf(char));
        break;
      } 
    }
  }

  if(au_s !== '') {
      fetch("http://127.0.0.1:11223/audio_txt", {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({content: au_s, action: 'text', id: cookie_id})
      });
  }

  if(all_mesg) {
    fetch("http://127.0.0.1:11223/audio_txt", {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({content: au_s, action: 'end', id: cookie_id})
    });
  }
  return ret_str;
}

export const Chatgml6Stream = async (
  cookie_id: string,
  messages: Message[],
  top_p: number,
  temperature: number,
  max_length: number,
) => {
  // clear messages
  const result = [];
  
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
      result.push([messages[i].content, messages[i + 1].content]);
      i++; // 跳过已经处理过的 'assistant' 消息
    }
  }
  //console.log(result);
  // streamed response
  const url = "http://172.16.6.11:8000/streamchat";
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      prompt: messages[messages.length-1].content,
      top_p: top_p,
      temperature: temperature,
      max_length: max_length,
      history: result,
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  //@ts-ignore
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let ret_str = '';
  
  const convertToReadableStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if(value){
              controller.enqueue(value);
              if (cookie_id !== ''){
                const tstr = decoder.decode(value);
                ret_str += tstr;
                ret_str = processValue(cookie_id,tstr, ret_str, false);
              }
            }
            if (done) {
              if (cookie_id !== ''){
                ret_str = processValue(cookie_id,'', ret_str, true);
              }
              controller.close();
              return;
            }
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


export const googleStream = async (
  message: string,
) => {
  const query = encodeURIComponent(message.trim());

  const googleRes = await fetch(
    `https://customsearch.googleapis.com/customsearch/v1?key=${
      process.env.GOOGLE_API_KEY
    }&cx=${
      process.env.GOOGLE_CSE_ID
    }&q=${query}&num=10`,
  );

  const googleData = await googleRes.json();

  const sources: GoogleSource[] = googleData.items.map((item: any) => ({
    title: item.title,
    link: item.link,
    displayLink: item.displayLink,
    snippet: item.snippet,
    image: item.pagemap?.cse_image?.[0]?.src,
    text: '',
  }));

  const answerPrompt = endent`${sources.map((source, index) => {
    return endent`
    * ${index + 1}. [${source.title}](${source.link}) ${source.snippet}
    `;
  }).join('\n')}`;
  
  return answerPrompt;
};

export const ZhipuAIStream = async (
  cookie_id: string,
  messages: Message[],
  top_p: number,
  temperature: number,
  max_length: number,
) => {
  
  //10000 hours
  const token = process.env.ZHIPU_API_KEY;
  
  //console.log(result);
  // streamed response
  const url = "https://open.bigmodel.cn/api/paas/v3/model-api/chatglm_pro/sse-invoke";
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      prompt: messages,
      top_p: top_p,
      temperature: temperature,
      request_id: 'unique-id',
      incremental: true
    }),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: token
    }
  });
  //@ts-ignore
  const reader = response.body.getReader();
  let ret_str = '';
  const convertToReadableStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (cookie_id !== ''){
                ret_str = processValue(cookie_id,'', ret_str, true);
              }
              controller.close();
              return;
            }
            if(value){
              let vv = decoder.decode(value);
              let events = vv.split('\n\n');
              for(let j = 0; j<events.length; j++){
               let v= events[j];
               if(v.includes("data:") && v.includes("event:add")){
                  let datas = v.split('data:');
                  for (let i = 1; i < datas.length; i++) {
                    const value = encoder.encode(datas[i])
                    controller.enqueue(value);
                    if (cookie_id !== ''){
                      const tstr = decoder.decode(value);
                      ret_str += tstr;
                      ret_str = processValue(cookie_id,tstr, ret_str, false);
                    }
                  }
                }
              }
            }            
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



export const receive_mail = async (
  message: string, 
) => {
  const url = "http://127.0.0.1:3000/api/executeMail";
  const response = await fetch(url, {
    method: 'GET',
  });
  const responses = await Promise.all([response]);
  if (response.ok) {
    const Data = await response.text() + "\n以上是邮件信息，请根据我后面的指令回答，我的指令是：\n" + message;

    return Data;  
  }
  return "Error when receive mails!"
};

export const google_tool = async (
  message: string,
) => {
  const query = encodeURIComponent(message);

  const googleRes = await fetch(
    `https://customsearch.googleapis.com/customsearch/v1?key=${
      process.env.GOOGLE_API_KEY
    }&cx=${
      process.env.GOOGLE_CSE_ID
    }&q=${query}&num=5`,
  );

  const googleData = await googleRes.json();

  const sources: GoogleSource[] = googleData.items.map((item: any) => ({
    title: item.title,
    link: item.link,
    displayLink: item.displayLink,
    snippet: item.snippet,
    image: item.pagemap?.cse_image?.[0]?.src,
    text: '',
  }));

  const sourcesWithText: any = await Promise.all(
    sources.map(async (source) => {
      try {
        return {
          ...source,
          // TODO: switch to tokens
          text: '',
        } as GoogleSource;
        
      } catch (error) {
        console.error(error);
        return null;
      }
    }),
  );
  
  const filteredSources: GoogleSource[] = sourcesWithText.filter(Boolean);

  const answerPrompt = endent`
  Provide me with the information I requested. Use the sources to provide an accurate response. Respond in markdown format. Cite the sources you used as a markdown link as you use them at the end of each sentence by number of the source (ex: [[1]](link.com)). Provide an accurate response and then stop. Today's date is ${new Date().toLocaleDateString()}.

  Example Input:
  What's the weather in San Francisco today?

  Example Sources:
  [Weather in San Francisco](https://www.google.com/search?q=weather+san+francisco)

  Example Response:
  It's 70 degrees and sunny in San Francisco today. [[1]](https://www.google.com/search?q=weather+san+francisco)

  Input:
  ${message}

  Sources:
  ${filteredSources.map((source) => {
    return endent`
    ${source.title} (${source.link}):
    ${source.snippet}
    `;
  })}

  Response:
  `;
  return answerPrompt;
};



export const testcase = async (
  message: string,
  form: string,
) => {
  const default_form = endent`
## INNER_HAWKEYE_TESTCASE_ACTION_START

### 测试例基本信息
测试例的基本信息配置如下：
- 测试例名称：
- 测试例描述：
- 统计索引：
- 测试例中DUT总数：
- 每行显示DUT个数：
- 是否显示测试流程序号：
- 是否自动填充SN：
- 测试完成后是否生成PDF日志文件：
- 当SN是AUTO时是否保存日志：

### 测试仪表基本信息
测试过程需要使用普太公司的三台测试仪器，其配置如下表所示：

|测试仪设备名称|测试仪设备型号|测试仪设备IP地址|1槽位插卡型号|2槽位插卡型号|3槽位插卡型号|4槽位插卡型号|
|-|-|-|-|-|-|-|


### 待测试设备（DUT）基本信息
DUT的基本配置信息如下：
- DUT型号：
- IP地址：
- telnet用户名：
- telnet密码：
- HDMI端口：
- ETH网口：
- WIFI天线：


### 待测试设备（DUT）和测试仪表的端口连接关系
连接关系如下表所示：

**DUT#1端口连接关系如下**

|DUT端口|测试仪端口|
|-|-|

**DUT#2端口连接关系如下**

|DUT端口|测试仪端口|
|-|-|


### 测试例初始表数据

|变量名称|DUT#1|DUT#2|DUT#3|
|-|-|-|-|

### 测试例自定义变量初始化

|变量名称|值|自定义命名|是否显示|
|-|-|-|-|

## INNER_HAWKEYE_TESTCASE_ACTION_END
  `;

  if(form === ''){
    form = default_form;
  }
  const answerPrompt = endent`
下面测试例表单中的属性和表格是我需要的关键信息，请根据后面的需求信息填写测试例表单。如果测试例表单中的内容有修改，请务必输出填写好的完整表单，并且保持表单的格式结构不变。如果已知信息中没有关键信息，请给出一些填写建议。

测试例表单信息如下:
${form}

需求:
${message}
`;
  return answerPrompt;
};


export const check_issue = async (
  knowledge: string,
  message: string,
) => {
  const url = "http://172.16.6.11:8000/find_context";
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({dataname: knowledge, content: message}),
    headers: {'Content-Type': 'application/json'}
  });

  console.log('----------------------------------***')
  const data = await response.json();
  //console.log(data)
  const contextData = data?.context;

  const answerPrompt = endent`
  下面是一些已知参考信息， 请尽量根据这些已知信息来回答后面的问题。

  用户问题:
  ${message}

  已知信息:
  ${contextData}

  回答:
  `;
  return answerPrompt;
};

import WebSocket from 'ws';

export const exe_code = async (
  message: string,
) => {
  const base = 'http://172.16.1.180:8000';
  const headers = {
      'Authorization': 'Token 7bdb9238aa72119896d3a72b77a742191dcc599d2ac90ac8',
      'Content-Type': 'application/json'
  };

  async function createKernel() {
      const response = await fetch(base + '/api/kernels', {
          method: 'POST',
          headers: headers
      });
      const kernel = await response.json();
      return kernel;
  }

  function sendExecuteRequest(code: string) {
      const msg_type = 'execute_request';
      const content = { 'code': code, 'silent': false };
      const hdr = {
          'msg_id': generateUUID(),
          'username': 'test',
          'session': generateUUID(),
          'data': new Date().toISOString(),
          'msg_type': msg_type,
          'version': '5.0'
      };
      const msg = { 'header': hdr, 'parent_header': hdr, 'metadata': {}, 'content': content };
      return msg;
  }

  function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
      });
  }

  const kernel = await createKernel();

  const ws = new WebSocket("ws://172.16.1.180:8000/api/kernels/" + kernel["id"] + "/channels", {headers: headers});


  ws.onopen = () => {
      ws.send(JSON.stringify(sendExecuteRequest('ls')));
  };
  let result_str = '';
  function waitForMessage() {
    return new Promise((resolve, reject) => {
      ws.onmessage = (event: { data: string; }) => {
        const rsp = JSON.parse(event.data);
        const msg_type = rsp["msg_type"];
        if (msg_type === "stream") {
          //console.log(rsp["content"]["text"]);
          resolve(rsp["content"]["text"]);
          ws.close();
        }
      };
  
      ws.onerror = (error: any) => {
        reject(error);
      };
  
      ws.onclose = (event: any) => {
        if (!event.wasClean) {
          reject(new Error('WebSocket closed with error'));
        }
      };
    });
  }
  
  // 使用这个函数的方式：
  waitForMessage().then(result_str => {
    //console.log('Received message:', result_str);
    
  }).catch(error => {
    //console.error('Error:', error);
  });
  
  
};