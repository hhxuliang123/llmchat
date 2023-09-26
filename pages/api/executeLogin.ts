import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';
import employees, { Employee } from '@/users';
const crypto = require('crypto');


interface LoginInfo {
  username: string;
  password: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  const { username, password } = req.body as LoginInfo;
  const employee : Employee = employees.find(emp => emp.userid === username);
  
  function encrypt(text) {
    const algorithm = 'aes-256-cbc'; 
    const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3';
    const iv = crypto.randomBytes(16);
  
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  
    return {
      iv: iv.toString('hex'),
      content: encrypted.toString('hex')
    };
  }
  
  const now = Date.now();
  const authData = `${username}:${password}:${now}`;
  console.log(authData);
  const encryptedData = encrypt(authData);
  const cookieValue = JSON.stringify(encryptedData); 
  
  // 检查是否找到用户且密码是否匹配
  if (employee && employee.password === password) {
    const now = Date.now();
    const cookie = serialize('perfectek_ai_auth', cookieValue, {
      maxAge: 60 * 60 * 24 * 2,
      path: '/',
      });
    const cookie_name = serialize('perfectek_ai_name',username, {
      maxAge: 60 * 60 * 24 * 2,
      path: '/',
      });
    res.setHeader('Set-Cookie', [cookie, cookie_name]);

    res.status(200).json({ status: 'Logged in' });
  }else{
    res.status(401).json({ status: 'Invalid username/password' });
  }
};

export default handler;