from boto3 import client
import os, time

def audio_by_txt(text,filename):
    print(time.time())
    polly = client("polly", aws_access_key_id=os.environ.get('AWS_ACCESS_KEY'), aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'), region_name="us-east-1")
    response=polly.synthesize_speech(Text=text,OutputFormat='mp3',Engine='standard',VoiceId='Amy')

    result=response['AudioStream'].read()
    print(time.time())
    if result is not None:
        with open(f"files/{filename}", 'wb') as f:
            f.write(result)


def audio_by_txt_Q(text,Q):
    print(f"start time:{time.time()}")
    polly = client("polly", aws_access_key_id=os.environ.get('AWS_ACCESS_KEY'), aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'), region_name="us-east-1")
    response=polly.synthesize_speech(Text=text,OutputFormat='mp3',Engine='standard',VoiceId='Amy')
    result=response['AudioStream'].read()
    print(f"end time:{time.time()}")
    Q.put(result)
    

def awsaudio(text):
    polly = client("polly", aws_access_key_id=os.environ.get('AWS_ACCESS_KEY'), aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'), region_name="us-east-1")
    response=polly.synthesize_speech(Text=text,OutputFormat='mp3',Engine='standard',VoiceId='Amy')
    return response['AudioStream'].read()
    


if __name__ == '__main__':
    audio_by_txt('hello world!','hello.mp3')