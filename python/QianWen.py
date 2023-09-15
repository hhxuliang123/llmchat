from http import HTTPStatus
from dashscope import Generation


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
if __name__ == '__main__':
    call_with_messages()