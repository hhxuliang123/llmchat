import { NextApiRequest, NextApiResponse } from 'next';


interface AudioMsg {
  content: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  try {
    const { content } = req.body as AudioMsg;
    
    let url = `http://127.0.0.1:11223/aliaudio`;
    let headers = {'Content-Type': 'application/json'};
    let response = await fetch(url, {method: 'POST', headers: headers, body: req.body});
    let responseData = await response.json();
    console.log(responseData);
    if (response.ok){
      res.status(200).end(JSON.stringify({'filename':responseData.filename}));
    }
    else { 
      res.status(500).end(`Failed to execute the command.${responseData}`);
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).end(`Failed to execute the command.${error}`);
  }
};

export default handler;