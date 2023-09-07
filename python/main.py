#python -m uvicorn main:app --host 172.16.1.68 --port 12345
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from SparkApi import chat_question
import json

app = FastAPI()

def chat_generator(appid, api_key, api_secret, prompt, history=None, max_length=8192, top_p=0.8, temperature=0.95):
    try:
        for response in chat_question(appid=appid, api_key=api_key, api_secret=api_secret, gpt_url="ws://spark-api.xf-yun.com/v1.1/chat",question=prompt):
            yield response
            
    except Exception as e:
        print(f"Error: {e}")  # For logging purposes
        # Yield an error message and then raise an exception
        yield "An internal error occurred."
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred in the model.")

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
    appid = json_post_list.get('appid')
    api_key = json_post_list.get('api_key')
    api_secret = json_post_list.get('api_secret')
    
    generator = chat_generator(appid, api_key, api_secret, prompt, history, max_length, top_p, temperature)
    return StreamingResponse(generator, media_type="text/plain")

