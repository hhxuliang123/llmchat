from http import HTTPStatus
from dashscope import Generation
from urllib.parse import urlparse, unquote
from pathlib import PurePosixPath
import requests
from dashscope import ImageSynthesis
from dashscope.audio.tts import SpeechSynthesizer

model = "stable-diffusion-v1.5"


def chat_question(llm_type,messages):
    gen = Generation()
    responses = gen.call(
        Generation.Models.qwen_turbo if llm_type =='qwen-turbo' else Generation.Models.qwen_plus,
        messages=messages,
        result_format='message',  # set the result is message format.
        stream=True,
    )
    res_len = 0
    for response in responses:
        if response.status_code == HTTPStatus.OK:
            resp_str = response.output.choices[0].message.content
            yield resp_str[res_len:]
            res_len = len(resp_str)
        else:
            print('Request id: %s, Status code: %s, error code: %s, error message: %s' % (
                response.request_id, response.status_code,
                response.code, response.message
            ))




def sample_block_call(prompt = "Eagle flying freely in the blue sky and white clouds"):
    rsp = ImageSynthesis.call(model=model,
                              prompt=prompt,
                              negative_prompt="garfield",
                              n=1,
                              size='512*512')
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output)
        print(rsp.usage)
        # save file to current directory
        for result in rsp.output.results:
            file_name = PurePosixPath(unquote(urlparse(result.url).path)).parts[-1]
            with open('./%s' % file_name, 'wb+') as f:
                f.write(requests.get(result.url).content)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))


def sample_async_call(prompt):
    rsp = ImageSynthesis.async_call(model=model,
                                    prompt=prompt,
                                    negative_prompt="garfield",
                                    n=1,
                                    size='512*512')
    if rsp.status_code != HTTPStatus.OK:
        return {'Failed': f'status_code: {rsp.status_code}, code: {rsp.code}, message: {rsp.message}'}

    status = ImageSynthesis.fetch(rsp)
    if status.status_code != HTTPStatus.OK:
        return {'Failed': f'status_code: {status.status_code}, code: {status.code}, message: {status.message}'}

    rsp = ImageSynthesis.wait(rsp)
    if rsp.status_code != HTTPStatus.OK:
        return {'Failed': f'status_code: {rsp.status_code}, code: {rsp.code}, message: {rsp.message}'}

    # 返回成功的结果。这部分需要根据实际的 rsp 结果进行调整。
    return {'result': rsp.output}


def audio_by_txt(txt,filename):
    result = SpeechSynthesizer.call(model='sambert-zhichu-v1',
                                    text=txt,
                                    sample_rate=48000,
                                    format='mp3')

    if result.get_audio_data() is not None:
        with open(f"files/{filename}", 'wb') as f:
            f.write(result.get_audio_data())
    
def audio_by_txt_Q(txt,Q):
    result = SpeechSynthesizer.call(model='sambert-zhichu-v1',
                                    text=txt,
                                    sample_rate=48000,
                                    format='mp3')
    Q.put(result.get_audio_data())
    
if __name__ == '__main__':
    sample_block_call()
    sample_async_call()
    call_with_messages()