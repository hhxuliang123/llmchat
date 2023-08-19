import { NextApiRequest, NextApiResponse } from 'next';
const iconv = require('iconv-lite');

interface ExeCode {
  language: string;
  content: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  try {
    const { language, content } = req.body as ExeCode;
    
    const  {  spawn  }  =  require('child_process');

    let cmd = content;
    let args : string[] = [];

    if (language === 'javascript') {
      cmd = 'node';
      args = ['-e', content];
    }else if (language === 'python') {
      cmd = 'python';
      args = ['-u', '-c', content];
    }else if (language === 'shell') {
      const os = require('os');
      const platform = os.platform();

      if (platform === 'win32') {
        cmd = 'cmd.exe';
        args = ['/c', content];
      }
      
    }else if (language === 'bash') {
      
    }else{
      res.status(200).json({ result : `${language} can not be executed.`}); 
    }
    
    const  process  =  spawn(cmd,  args);

    let result_str = '';

    process.stdout.on('data',  (data)  =>  {
      let gbkString = data.toString('binary'); // 将Buffer转换为二进制字符串
      let utf8String = iconv.decode(Buffer.from(gbkString, 'binary'), 'GBK'); // 使用iconv-lite进行解码
         
      console.log(`Python  stdout:    ${utf8String}`);   
      res.write(utf8String); // 使用res.write发送数据
      res.flush();     // 确保数据被发送到客户端
    });

    process.stderr.on('data',  (data)  =>  {   
          console.error(`Python  stderr:  ${data}`);
          res.write(data); // 使用res.write发送数据
          res.flush();     // 确保数据被发送到客户端  
    });

    process.on('close',  (code)  =>  {
          console.log(`子进程退出，退出码   ${code}`);  
          res.end(); // 告知流结束
    });

    process.on('error', (err) => {
      console.error("Error spawning the child process:", err);
      // Handle the error as you see fit here.
      res.status(500).end("Failed to execute the command.");
    });
  
  } catch (error) {
    console.error(error);
    res.status(500).end("Failed to execute the command.${error}");
  }
};

export default handler;