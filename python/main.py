#python -m uvicorn main:app --host 172.16.1.68 --port 12345
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import StreamingResponse
import json

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
            import QianWen
            for response in QianWen.chat_question(llm_type,prompt):
                yield response
                
        except Exception as e:
            print(f"Error: {e}")  # For logging purposes
            # Yield an error message and then raise an exception
            yield "An internal error occurred."
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred in the model.")    
    generator = chat_generator(prompt, llm_type, history, max_length, top_p, temperature)
    return StreamingResponse(generator, media_type="text/plain")

