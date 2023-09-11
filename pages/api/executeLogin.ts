import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';
import employees, { Employee } from '@/users';

interface LoginInfo {
  username: string;
  password: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  const { username, password } = req.body as LoginInfo;
  const employee : Employee = employees.find(emp => emp.userid === username);
    
  // 检查是否找到用户且密码是否匹配

  if (employee && employee.password === password) {
    const now = Date.now();
    const cookie = serialize('perfectek_ai_auth', `${username}:${password}:${now}`, {
      maxAge: 60 * 60 * 24 * 2,
      path: '/',
      });
    res.setHeader('Set-Cookie', cookie);

    res.status(200).json({ status: 'Logged in' });
  }else{
    res.status(401).json({ status: 'Invalid username/password' });
  }
};

export default handler;