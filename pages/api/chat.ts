import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream, Chatgml6Stream, googleStream, ZhipuAIStream, google_tool, check_issue, testcase, receive_mail,SparkStream, ChatAIStream, StableDiffusion } from '@/utils/server';
import endent from 'endent';
import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import { PluginID } from '@/types/plugin';
import cookie from 'cookie';
import crypto from 'crypto';
export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key, prompt, temperature, knowledge, audioid } = (await req.json()) as ChatBody;
    let userid = '';
    try{
      const cookies = cookie.parse(req.headers.get('cookie') || '');
      userid = cookies.perfectek_ai_name;
    }catch (error) {
    }
    await init((imports) => WebAssembly.instantiate(wasm, imports));
    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const prompt_tokens = encoding.encode(promptToSend);

    let tokenCount = prompt_tokens.length;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = encoding.encode(message.content);

      if (tokenCount + tokens.length + 1000 > model.tokenLimit) {
        break;
      }
      tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }
    encoding.free();
    let stream = null;
    let msg = messagesToSend[messagesToSend.length-1].content.trim();
    const log = `==>phoneNO:${userid}, receive_message, model:${model['id']}, plugin:${knowledge.id}, msg_len:${msg.length}, audio:${audioid == '' ? 'off' : 'on'}.`
    fetch('http://127.0.0.1:11223/logfile', {method: 'POST', body: JSON.stringify({content: log, msg: msg})});
    console.log(`${new Date()} ${log}`);
    console.log(msg);
    if(model['id'] !== 'google'){
      if(knowledge.id === PluginID.CHECK_LIST){        
          const context_msg = await check_issue('sys_check',msg);
          messagesToSend[messagesToSend.length-1].content = context_msg;
          //console.log('CCCCCCCCCCCCCCCCCCCCC')
          //console.log(messagesToSend)
        
      }
      if(knowledge.id === PluginID.TC){        
        let form = ''
        //const regex = /## INNER_HAWKEYE_TESTCASE_ACTION_START([\s\S]*)## INNER_HAWKEYE_TESTCASE_ACTION_END/g;
        const regex = /(## INNER_HAWKEYE_TESTCASE_ACTION_START[\s\S]*## INNER_HAWKEYE_TESTCASE_ACTION_END)/g;

        for (let i = messagesToSend.length - 1; i >= 0; i--) {
          // 提取匹配结果
          const match = regex.exec(messagesToSend[i].content);
          if (match != null) {
              form = match[1];
              break;
          } 
        }
        const context_msg = await testcase(msg, form);
        promptToSend = endent`
你现在扮演一名Hawkeye系统的测试例表单信息填写工程师。根据用户的需求完成表单信息的填写。Hawkeye系统工业生产测试系统，该系统能够实现多个DUT（被测试设备）同时生产测试。
测试表单信息主要完成被测试DUT基本信息、所用测试仪器信息、DUT和测试仪器之间的连接关系等测试关键数据。请认真准确填写，如果有不清晰的请保持其值为空。请用markdown格式回答。`;
        messagesToSend[messagesToSend.length-1].content = context_msg;
        console.log('CCCCCCCCCCCCCCCCCCCCC')
        //console.log(messagesToSend)
      }
      if(knowledge.id === PluginID.FILE){        
        const context_msg = await check_issue(knowledge.requiredKeys[0].value,msg);
        messagesToSend[messagesToSend.length-1].content = context_msg;
        console.log('FFFFFFFFFFFFFFFFFFFFFFFFFF')
        //console.log(messagesToSend)
      
      }
      if(knowledge.id === PluginID.GOOGLE_SEARCH){
          const google_msg = await google_tool(msg);
          messagesToSend = [{ role: 'user', content: google_msg }];
          console.log('GGGGGGGGGGGGGGGGGGGGGGGGGGG')
          //console.log(messagesToSend)        
      }
      if(knowledge.id === PluginID.MAIL){
        promptToSend = endent`你现在是一名邮件整理人员，请根据我的要求整理邮件。如果需要生成回复邮件，请按照后面的邮件模板生成。模板中的## INNER_MAIL_ACTION_START和## INNER_MAIL_ACTION_END是标记，务必完成输出。
邮件模板如下：
## INNER_MAIL_ACTION_START

#### 主题：

#### 收件人：

#### 抄送：

#### 邮件内容：

## INNER_MAIL_ACTION_END
`
        const mail_msg = await receive_mail(msg);
        messagesToSend = [{ role: 'user', content: mail_msg }];
        console.log('MMMMMMMMMMMMMMMMMMMMMMMMM')
        //console.log(messagesToSend)        
      }
    }

    if (model['id'].startsWith('gpt')) {
        stream = await OpenAIStream(audioid, model, promptToSend, temperatureToUse, key, messagesToSend);
    }
    if (model['id'] == 'chatglm6') {
        stream = await Chatgml6Stream(audioid, messagesToSend, 0.7, temperatureToUse, 32000);
    }
    if (model['id'] == 'spark') {
      stream = await SparkStream(audioid, messagesToSend, 0.7, temperatureToUse, 14000);
    }
    if (model['id'] == 'zhipu') {
        stream = await ZhipuAIStream(audioid, messagesToSend, 0.7, temperatureToUse, 32000);
    }
    if (model['id'] == 'qwen-turbo' || model['id'] == 'qwen-plus') {
      stream = await ChatAIStream(audioid, model['id'],messagesToSend, 0.7, temperatureToUse, 32000);
    }
    if (model['id'] == 'sd') {
      stream = await StableDiffusion(messagesToSend);
    }
    if (model['id'] == 'google') {
        stream = await googleStream(messages[messages.length-1].content);
    }
    
    return new Response(stream);
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;
