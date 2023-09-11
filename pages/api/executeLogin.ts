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
    res.status(200).end('');
  }else{
    res.status(500).end('username/password error!');
  }
};

export default handler;