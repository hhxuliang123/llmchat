#python -m uvicorn main:app --host 172.16.1.68 --port 12345
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from fastapi.responses import FileResponse
import json
import QianWen
import requests,os,time

app = FastAPI()



@app.post("/spark/stream")
async def sparkStreamChat(request: Request):
    json_post_raw = await request.json()
    json_post = json.dumps(json_post_raw)
    json_post_list = json.loads(json_post)
    prompt = json_post_list.get('prompt')
    history = json_post_list.get('history')
    max_length = json_post_list.get('max_length')
    top_p = json_post_list.get('top_p')
    temperature = json_post_list.get('temperature')
    
    def chat_generator(prompt, history=None, max_length=8192, top_p=0.8, temperature=0.95):
        try:
            import SparkApi
            for response in SparkApi.chat_question(prompt):
                yield response
                
        except Exception as e:
            print(f"Error: {e}")  # For logging purposes
            # Yield an error message and then raise an exception
            yield "An internal error occurred."
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred in the model.")    
    generator = chat_generator(prompt, history, max_length, top_p, temperature)
    return StreamingResponse(generator, media_type="text/plain")


@app.post("/qianwen/stream")
async def qianwenStreamChat(request: Request):
    json_post_raw = await request.json()
    json_post = json.dumps(json_post_raw)
    json_post_list = json.loads(json_post)
    prompt = json_post_list.get('prompt')
    history = json_post_list.get('history')
    max_length = json_post_list.get('max_length')
    top_p = json_post_list.get('top_p')
    temperature = json_post_list.get('temperature')
    llm_type = json_post_list.get('llm_type')

    def chat_generator(prompt,llm_type, history=None, max_length=8192, top_p=0.8, temperature=0.95):
        try:
            for response in QianWen.chat_question(llm_type,prompt):
                yield response
                
        except Exception as e:
            print(f"Error: {e}")  # For logging purposes
            # Yield an error message and then raise an exception
            yield "An internal error occurred."
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred in the model.")    
    generator = chat_generator(prompt, llm_type, history, max_length, top_p, temperature)
    return StreamingResponse(generator, media_type="text/plain")

@app.post("/stablediffusion")
async def stablediffusion(request: Request):
    try:
        json_post_raw = await request.json()
        prompt = json_post_raw.get('prompt')
        print(prompt)
        result = QianWen.sample_async_call(prompt)
        image_url = result['result']['results'][0]['url']

        def download_image(url, file_path):
            response = requests.get(url, stream=True)
            if response.status_code == 200:
                with open(file_path, 'wb') as file:
                    for chunk in response.iter_content(chunk_size=1024):
                        if chunk:
                            file.write(chunk)
            else:
                print(f"Unable to download image. Server responded with status code {response.status_code}")
        file_name = f"image{time.time()}.jpg"
        file_path = os.path.join(os.getcwd()+'/files/', file_name)  #图片将被下载到当前工作目录

        download_image(image_url, file_path)

        return f"![this is the picture](api/showfile?fileName={file_name})"
        
    except Exception as e:
        print(f"Error: {e}")  # For logging purposes
        return {"Error": str(e)}
    
import asyncio
@app.post("/aliaudio")
async def txtaudio(request: Request):
    try:
        json_post_raw = await request.json()
        prompt = json_post_raw.get('content')
        import hashlib
        hash_object = hashlib.md5(prompt.encode())
        md5_hash = hash_object.hexdigest()
        file_name = f"{md5_hash}.wav"
        if not os.path.exists(f"files/{file_name}"):
            print("call AI")
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, QianWen.audio_by_txt, prompt, file_name)
        return {"filename":file_name}
        
    except Exception as e:
        print(f"Error: {e}")  # For logging purposes
        return {"Error": str(e)}


@app.get("/files/{file_path:path}")
async def read_file(file_path: str):
    return FileResponse(f"files/{file_path}")