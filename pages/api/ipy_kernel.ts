import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIError, exe_code } from '@/utils/server';
import WebSocket from 'ws';

interface ExeCode {
  language: string;
  content: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  try {    
    const { language, content } = req.body as ExeCode;
    let kid = '';
    const base = 'http://172.16.1.180:8000';
    const headers = {
        'Authorization': 'Token 7bdb9238aa72119896d3a72b77a742191dcc599d2ac90ac8',
        'Content-Type': 'application/json'
    };

    if(language === 'html'){
      res.status(200).send(content);
      return;
    }

    async function createKernel() {
        const response = await fetch(base + '/api/kernels', {
            method: 'POST',
            headers: headers
        });
        const kernel = await response.json();
        return kernel;
    }

    async function delKernel() {
      const response = await fetch(base + '/api/kernels/' + kid, {
          method: 'DELETE',
          headers: headers
      });
      const kernel = await response.json();
      return kernel;
  }

    function sendExecuteRequest(code: string) {
        let code_exe = code;
        console.log(language);
        if (language === 'bash' || language === 'shell'){
          code_exe = "%%bash\n" + code;
        } else {
          if (language !== 'python'){
            code_exe = "%%"+ language+ "\n" + code;
          }
        }
        const msg_type = 'execute_request';
        const content = { 'code': code_exe, 'silent': false };
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
    kid = kernel["id"];
    const ws = new WebSocket("ws://172.16.1.180:8000/api/kernels/" + kid + "/channels", {headers: headers});


    ws.onopen = () => {
        ws.send(JSON.stringify(sendExecuteRequest(content)));
    };
    
    function waitForMessage() {
      return new Promise((resolve, reject) => {
        let res = '';
        ws.onmessage = (event: { data: string; }) => {
          const rsp = JSON.parse(event.data);
          const msg_type = rsp["msg_type"];
          console.log(rsp);
          if (msg_type === "stream") {
            console.log(rsp["content"]["text"]);
            res = res + rsp["content"]["text"];            
            
          }
          if(msg_type === "execute_reply"){
              resolve(res);
              ws.close();
              delKernel();            
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
      console.log('Received message:', result_str);
      res.status(200).json({ result : result_str});
    }).catch(error => {
      console.error('Error:', error);
      res.status(400).json({ result : ''});
    });
    
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
