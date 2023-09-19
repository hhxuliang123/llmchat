import { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  const cookies = cookie.parse(req.headers.cookie || '');
  const id = JSON.parse(cookies.perfectek_ai_auth).content;
  
  const fastapiURL = `http://127.0.0.1:11223/audio/${id}`;

  switch (req.method) {
    case 'GET':
      const response = await fetch(fastapiURL);

      if (!response.ok) {
          // copy the status and statusText from the original response
          res.status(response.status).send(response.statusText);
          return;
      }

      const reader = response.body.getReader();

      res.setHeader('Content-Type', 'audio/mpeg');
      for (let pair of response.headers.entries()) {
          res.setHeader(pair[0], pair[1]);
      }

      async function processChunk({ done, value }) {
          if (done) {
            res.end();
            console.log("Done");
            return;
          }

          //We only write to the res when there is some data.
          if (value) {
            try {
              res.write(Buffer.from(value));
            } catch (error) {
              console.error('Error writing to response', error);
              return;
            }
      
          }
          return reader.read().then(processChunk);
      }

      return reader.read().then(processChunk);
    case 'DELETE':
      const response_d = await fetch(fastapiURL,{ method: 'DELETE' });
      if (response_d.ok) {
        res.status(200);
      } else {
        res.status(405);
      }
      res.end();
      
      break;
    default:
      break;
  }

};

export default handler;
