#python -m uvicorn main:app --host 172.16.1.68 --port 12345
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

import json, os, time, requests, asyncio, re
from queue import Queue, Empty
import QianWen, AWSAudio
import enum

app = FastAPI()

app.add_middleware(
 CORSMiddleware,
 # 允许跨域的源列表，例如 ["http://www.example.org"] 等等，["*"] 表示允许任何源
 allow_origins=["*"],
 # 跨域请求是否支持 cookie，默认是 False，如果为 True，allow_origins 必须为具体的源，不可以是 ["*"]
 allow_credentials=False,
 # 允许跨域请求的 HTTP 方法列表，默认是 ["GET"]
 allow_methods=["*"],
 # 允许跨域请求的 HTTP 请求头列表，默认是 []，可以使用 ["*"] 表示允许所有的请求头
 # 当然 Accept、Accept-Language、Content-Language 以及 Content-Type 总之被允许的
 allow_headers=["*"],
 # 可以被浏览器访问的响应头, 默认是 []，一般很少指定
 # expose_headers=["*"]
 # 设定浏览器缓存 CORS 响应的最长时间，单位是秒。默认为 600，一般也很少指定
 # max_age=1000
)


def is_english(s):
    return bool(re.match('^[\x00-\x7F]*$', s[:100]))

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
    

@app.post("/aliaudio")
async def txtaudio(request: Request):
    try:
        json_post_raw = await request.json()
        prompt = json_post_raw.get('content')
        import hashlib
        hash_object = hashlib.md5(prompt.encode())
        md5_hash = hash_object.hexdigest()
        file_name = f"{md5_hash}.mp3"
        if not os.path.exists(f"files/{file_name}"):
            print("call AI")
            loop = asyncio.get_running_loop()
            if is_english(prompt):
                await loop.run_in_executor(None, AWSAudio.audio_by_txt, prompt, file_name)
            else:
                await loop.run_in_executor(None, QianWen.audio_by_txt, prompt, file_name)
        return {"filename":file_name}
        
    except Exception as e:
        print(f"Error: {e}")  # For logging purposes
        return {"Error": str(e)}


@app.get("/files/{file_path:path}")
async def read_file(file_path: str):
    return FileResponse(f"files/{file_path}")



## Audio generate 
class AUDIOSTA(enum.Enum): 
    INIT = 1
    AUDIOPLAY = 2
    AUDIOSTOP = 3
    
class AudioGenerator:
    def __init__(self, text = ''):
        self.audioQueue = Queue()
        self.text = text
        self.status = AUDIOSTA.INIT

    def append(self, t):
        self.text += t
    
    def popText(self):
        t = self.text
        self.text = ''
        return t

    def stop(self):
        while not self.audioQueue.empty():
            self.audioQueue.get() # clear the Queue.
        self.text = ''
        self.status = AUDIOSTA.AUDIOSTOP
    
    def reset(self):
        while not self.audioQueue.empty():
            self.audioQueue.get() # clear the Queue.
        self.text = ''
        self.status = AUDIOSTA.INIT

audio_buffer_map_lock = asyncio.Lock()
audio_buffer_map: dict[str, AudioGenerator] = {}

# 这是您的线程函数
async def audio_generator():
    while True:
        is_empty = True
        async with audio_buffer_map_lock:
            listkey = list(audio_buffer_map.keys())
        for id in listkey:  # 安全在字典的时候删除元素
            async with audio_buffer_map_lock:
                txt = audio_buffer_map[id].popText()
                audioQ = audio_buffer_map[id].audioQueue
                
            if txt != '':
                print(txt)
                is_empty = False
                if is_english(txt):
                    await asyncio.get_running_loop().run_in_executor(None, AWSAudio.audio_by_txt_Q, txt, audioQ)
                else:
                    await asyncio.get_running_loop().run_in_executor(None, QianWen.audio_by_txt_Q, txt, audioQ)
        if is_empty:
            await asyncio.sleep(1)  # 如果txt_buffer_map中的内容都是空 那么就等1秒后再循环遍历


@app.on_event("startup")
async def startup_event():
    app.state.background_task = asyncio.create_task(audio_generator())


@app.post("/audio_txt")
async def handle_audio_action(request: Request):
    try:
        json_post_raw = await request.json()
        id = json_post_raw.get('id')
        text = json_post_raw.get('content')
        if len(text.strip()) != 0 and len(id.strip()) != 0:
            async with audio_buffer_map_lock:
                if id not in audio_buffer_map:
                    audio_buffer_map[id] = AudioGenerator(text)
                else:
                    audio_buffer_map[id].append(text)
            return  {"status":"OK"}
        else:
            print(f"Error params: {id} {text}")
            return {"Error":"invalid params"}
    except Exception as e:
        print(f"Error: {e}")  # For logging purposes
        return {"Error": str(e)}
    
@app.delete("/audio/{id}")
async def handle_end_action(id: str):
    async with audio_buffer_map_lock:
        if id in audio_buffer_map:
            audio_buffer_map[id].stop()
    await asyncio.sleep(1)
    return  {"status":"OK"}       

@app.get("/audio/{id}")
async def audio(id: str):
    try:
        async with audio_buffer_map_lock: 
            if id not in audio_buffer_map:
                audio_buffer_map[id] = AudioGenerator()
            else:
                audio_buffer_map[id].reset()
            currentAudio = audio_buffer_map[id]

        def iter_content():
            count = 0
            while True:
                try:
                    if currentAudio.status == AUDIOSTA.AUDIOSTOP or count > 14:
                        break
                    audio_data = currentAudio.audioQueue.get_nowait()
                    count = 0
                    yield audio_data
                except Empty: # Sleep when there's nothing in the queue
                    count += 1
                    time.sleep(0.45)
            print(f"Session:{id} audio play loop is end.")
            currentAudio.reset()
            yield b''
        return StreamingResponse(iter_content(), media_type="audio/mpeg")
    except Exception as e:
        print(f"Error: {e}")  # For logging purposes
        return {"Error": str(e)}
