from boto3 import client
import os

def audio_by_txt(text,filename):
    polly = client("polly", aws_access_key_id=os.environ.get('AWS_ACCESS_KEY'), aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'), region_name="us-east-1")
    response=polly.synthesize_speech(Text=text,OutputFormat='mp3',Engine='standard',VoiceId='Aditi')

    result=response['AudioStream'].read()

    if result is not None:
        with open(f"files/{filename}", 'wb') as f:
            f.write(result)


def audio_by_txt_Q(text,Q):
    polly = client("polly", aws_access_key_id=os.environ.get('AWS_ACCESS_KEY'), aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'), region_name="us-east-1")
    response=polly.synthesize_speech(Text=text,OutputFormat='mp3',Engine='standard',VoiceId='Aditi')
    result=response['AudioStream'].read()
    Q.put(result)
    

def awsaudio(text):
    polly = client("polly", aws_access_key_id=os.environ.get('AWS_ACCESS_KEY'), aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'), region_name="us-east-1")
    response=polly.synthesize_speech(Text=text,OutputFormat='mp3',Engine='standard',VoiceId='Aditi')
    return response['AudioStream'].read()
    


if __name__ == '__main__':
    audio_by_txt('hello world!','hello.mp3')