#python -m uvicorn main:app --host 172.16.1.68 --port 12345
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

import json, os, time, requests, asyncio, re
from queue import Queue, Empty
import QianWen, AWSAudio
import enum
import aiohttp
import aiofiles


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

pic_file_map_lock = asyncio.Lock()
data_dict = {}
try:
    with open('json_file.json') as f:
        data_dict = json.load(f)
except FileNotFoundError:
    pass

@app.post("/stablediffusion")
async def stablediffusion(request: Request):
    try:
        json_post_raw = await request.json()
        prompt = json_post_raw.get('prompt')
        action = json_post_raw.get('action')
        print(f"Stable Diffusion generator: action is {action}, prompt is {prompt}.")

        file_name = f"image{time.time()}.jpg"
        
        async with pic_file_map_lock:
            if prompt in data_dict:
                if action == 'generate':
                    print(f"Action is {action}. {data_dict[prompt]} is shotted.")
                    return data_dict[prompt]
                else:
                    print(f"Action is {action}. Old picture {data_dict[prompt]} is deleted.")
                    os.remove(f"files/{data_dict[prompt]}")
                    del data_dict[prompt]
                    async with aiofiles.open('json_file.json', 'w') as f:
                        await f.write(json.dumps(data_dict))
    
        result = QianWen.sample_async_call(prompt)
    
        if 'result' not in result or 'results' not in result['result'] or len(result['result']['results']) < 1 or 'url' not in result['result']['results'][0]:
            raise ValueError("Unexpected result structure: missing 'url'")

        url = result['result']['results'][0]['url']
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    file_path = os.path.join(os.getcwd()+'/files/', file_name)
                    async with aiofiles.open(file_path, 'wb') as file:
                        await file.write(await response.read())
                else:
                    print(f"Unable to download image. Server responded with status code {response.status}")
        
        async with pic_file_map_lock:
            data_dict[prompt] = file_name
            async with aiofiles.open('json_file.json', 'w') as f:
                await f.write(json.dumps(data_dict))
    
        print(f"{file_name} generate is done and then return.")
        return file_name
        
    except Exception as e:
        print(f"Error: {e}")  
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

pt_txt_end = 'BJ_PERFECTEK_20180808_END'
# 这是您的线程函数
async def audio_generator():
    while True:
        is_empty = True
        async with audio_buffer_map_lock:
            key_values = [(key, audio_buffer_map[key].popText(), audio_buffer_map[key].audioQueue) for key in audio_buffer_map.keys()]
        
        for id, txt, audioQ in key_values:   # 安全在字典的时候删除元素
            if txt != '':
                print(f"{time.ctime()}:audio gen by text:{txt}")
                is_empty = False
                au_t = txt.replace(pt_txt_end, '')
                if is_english(au_t):
                    await asyncio.get_running_loop().run_in_executor(None, AWSAudio.audio_by_txt_Q, au_t, audioQ)
                else:
                    await asyncio.get_running_loop().run_in_executor(None, QianWen.audio_by_txt_Q, au_t, audioQ)
                if pt_txt_end in txt:
                    audioQ.put(None)
        if is_empty:
            await asyncio.sleep(0.4)  # 如果txt_buffer_map中的内容都是空 那么就等1秒后再循环遍历


@app.on_event("startup")
async def startup_event():
    app.state.background_task = asyncio.create_task(audio_generator())


@app.post("/audio_txt")
async def handle_audio_action(request: Request):
    try:
        json_post_raw = await request.json()
        id = json_post_raw.get('id').strip()
        text = json_post_raw.get('content').strip()
        action = json_post_raw.get('action').strip()
        print(f"{time.ctime()}:receive text:{text}")
        if id != '':
            async with audio_buffer_map_lock:
                if id not in audio_buffer_map:
                    audio_buffer_map[id] = AudioGenerator(text)
                else:
                    audio_buffer_map[id].append(text)
                    if action == "end":
                        audio_buffer_map[id].append(pt_txt_end)
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
            #else:
            #    audio_buffer_map[id].reset()
            currentAudio = audio_buffer_map[id]

        def iter_content():
            count = 0
            while True:
                try:
                    audio_data = currentAudio.audioQueue.get_nowait()
                    count = 0
                    print("write a audio!")
                    if audio_data is None:
                        break
                    yield audio_data
                except Empty: # Sleep when there's nothing in the queue
                    count += 1
                    if currentAudio.status == AUDIOSTA.AUDIOSTOP or count > 14:
                        break
                    time.sleep(0.45)
            print(f"{time.ctime()}:Session:{id} audio play loop is end.")
            currentAudio.reset()
            return b''
        return StreamingResponse(iter_content(), media_type="audio/mpeg")
    except Exception as e:
        print(f"Error: {e}")  # For logging purposes
        return {"Error": str(e)}


@app.get("/audio_ios/{id}")
async def audio_ios(id: str):
    try:
        first_time = False
        async with audio_buffer_map_lock: 
            if id not in audio_buffer_map:
                audio_buffer_map[id] = AudioGenerator()
            #else:
            #    audio_buffer_map[id].reset()
            currentAudio = audio_buffer_map[id]
            if currentAudio.status == AUDIOSTA.INIT:
                currentAudio.status = AUDIOSTA.AUDIOPLAY
                first_time = True
        def iter_content():
            count = 0
            while True:
                try:
                    if first_time:
                        yield b'00000000000000000000000000000000000000000000000000000000000000000000000'
                        time.sleep(5)
                        break
                    audio_data = currentAudio.audioQueue.get_nowait()
                    count = 0
                    print("write a audio!")
                    if audio_data is None:
                        break
                    yield audio_data
                    
                except Empty: # Sleep when there's nothing in the queue
                    count += 1
                    if currentAudio.status == AUDIOSTA.AUDIOSTOP or count > 14:
                        break
                    time.sleep(0.45)
            print(f"{time.ctime()}:Session:{id} audio play loop is end.")
            currentAudio.reset()
            return b''
        return StreamingResponse(iter_content(), media_type="audio/mpeg")
    except Exception as e:
        print(f"Error: {e}")  # For logging purposes
        return {"Error": str(e)}
