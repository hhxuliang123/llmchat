import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  try {
    // 从URL参数中获取文件名
    const txt = req.query.txt as string;
    // streamed response
    const url = "http://127.0.0.1:11223/stablediffusion";
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        prompt: txt,
        action: 'generate',
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const fileName = await response.json();
    // 确定文件路径，这里假设图片文件在/public/images目录下
    const filePath = path.join(process.cwd(), 'python/files/', fileName);

    if (fs.existsSync(filePath)) {   // 检查文件是否存在
      res.setHeader('Content-Type', 'image/jpeg');  // 设置正确的Content-Type
      const fileStream = fs.createReadStream(filePath);    // 创建可读流
      fileStream.pipe(res);   // 将文件流导向res对象
    } else {
      res.status(404).json({ error: 'File not found' });  // 文件不存在，返回404状态
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to read the file.' });  // 读取文件过程中出现错误，返回500状态
  }
};

export default handler;
