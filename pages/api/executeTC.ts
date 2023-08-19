import { NextApiRequest, NextApiResponse } from 'next';


interface ExeCode {
  IP: string;
  content: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  try {
    const { IP, content } = req.body as ExeCode;
    let ip = IP;
    let tcjson = {};
    
    let url = `http://172.16.1.197:8887/genTCByMD/`;
    let headers = {'Content-Type': 'application/json'};
    let data = JSON.stringify({"hawkeye_ip": ip, content: content});;
    let response = await fetch(url, {method: 'POST', headers: headers, body: data});
    let responseData = await response.json();
    if (responseData['result'] === 'success'){
      tcjson = responseData['tc'];
    }
    
    if (tcjson !== ''){
      url = `http://${ip}/sec/login`;
      headers = {'Content-Type': 'application/x-www-form-urlencoded'};
      data = "username=root&password=63a9f0ea7bb98050796b649e85481845";
      response = await fetch(url, {method: 'POST', headers: headers, body: data});
      responseData = await response.json();
      let cookie = responseData['result']['ck'];

      url = `http://${ip}/cmn/testcase/updateByName`;
      headers = {'Content-Type': 'application/json', 'Cookie': `ck=${cookie}`};
      
      let c = JSON.stringify({"testcase": tcjson});
      response = await fetch(url, {method: 'POST', headers: headers, body: c});
      responseData = await response.json();
      console.log(c);
      let res_str = '';
      if (responseData['status'] == 0) {
        let  tcname = tcjson['name'];
        res_str = `Create the Testcase(${tcname}) successfully, it is at: \n http://${ip}/cmn/page/testcase/list`;
      } else {
        res_str = "Error: " + responseData['errorData']['info']['msg'] ;
      }
      res.status(200).end(res_str);
    } else {
      res.status(500).end("Failed to get Testcase json.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).end("Failed to execute the command.${error}");
  }
};

export default handler;