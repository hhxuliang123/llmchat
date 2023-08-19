import { NextApiRequest, NextApiResponse } from 'next';
const iconv = require('iconv-lite');


interface ExeCode {
  language: string;
  content: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  try {
    const  {  spawn  }  =  require('child_process');
    console.log(process.env.MAIL_PASSWORD)
    let code  = `
import smtplib
import imaplib
import base64
from email.mime.text import MIMEText
from email.header import Header
from email import policy
from email.parser import BytesParser


# 邮箱设置
smtp_server = 'smtp.mxhichina.com'
imap_server = 'imap.mxhichina.com'
smtp_port = 465
imap_port = 993
username = 'liang.xu@perfectek.com'
password = '${process.env.MAIL_PASSWORD}'

# 发送邮件
def send_email(to, subject, body):
    message = MIMEText(body, 'plain', 'utf-8')
    message['From'] = Header(username)
    message['To'] = Header(to)
    message['Subject'] = Header(subject)

    server = smtplib.SMTP_SSL(smtp_server, smtp_port)
    server.login(username, password)
    server.sendmail(username, [to], message.as_string())
    server.quit()

# 接收邮件
def receive_email(ind):
    mail = imaplib.IMAP4_SSL(imap_server)
    mail.login(username, password)
    mail.select('inbox')
    result, data = mail.uid('search', None, "ALL")  # 搜索所有邮件
    latest_email_uid = data[0].split()[ind]
    result, email_data = mail.uid('fetch', latest_email_uid, '(BODY.PEEK[])')
    raw_email = email_data[0][1]
    mail.logout()

    # 解析邮件内容
    msg = BytesParser(policy=policy.default).parsebytes(raw_email)
    # 解析邮件内容
    email_info = {
        'subject': msg['subject'],
        'from': msg['from'],
        'to': msg['to'],
        'date': msg['date'],
        'body': msg.get_body(preferencelist=('plain')).get_content()
    }

    return email_info




# 发送邮件测试
send_email('hhxuliang@126.com', 'Hello', 'This is a test email.')

# 接收邮件测试
print(receive_email(-1))
print(receive_email(-2))
print(receive_email(-3))
print(receive_email(-4))
print(receive_email(-5))
`;
    console.log(code);
    const  process_py  =  spawn('python', ['-u', '-c', code],  { encoding: 'utf-8' });

    let result_str = '';

    process_py.stdout.on('data',  (data)  =>  {   
      let gbkString = data.toString('binary'); // 将Buffer转换为二进制字符串
      let utf8String = iconv.decode(Buffer.from(gbkString, 'binary'), 'GBK'); // 使用iconv-lite进行解码
      console.log(`Decoded string: ${utf8String}`);
      result_str = result_str + utf8String;
          
    });

    process_py.stderr.on('data',  (data)  =>  {   
          console.error(`Python  stderr:  ${data}`);
          result_str =  result_str + data; 
    });

    process_py.on('close',  (code)  =>  {
          console.log(`子进程退出，退出码   ${code}`);  
          res.status(200).end(result_str);
    });

    process_py.on('error', (err) => {
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