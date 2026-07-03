from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError
import os

app = FastAPI(title="Openband Cloud Backup Service")

# Configuração genérica compatível com AWS S3, Cloudflare R2 ou MinIO
S3_BUCKET = os.getenv("S3_BUCKET", "openband-projects")
s3_client = boto3.client(
    "s3",
    endpoint_url=os.getenv("S3_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "mock-key"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "mock-secret")
)

class PresignedUrlRequest(BaseModel):
    project_id: str
    file_name: str
    file_type: str

@app.post("/generate-upload-url")
def get_presigned_url(payload: PresignedUrlRequest):
    """
    Gera uma URL assinada para que o app offline-first envie arquivos .wav/.zip 
    diretamente para o Object Storage, poupando a banda do servidor Python.
    """
    object_name = f"projects/{payload.project_id}/{payload.file_name}"
    try:
        response = s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": object_name,
                "ContentType": payload.file_type
            },
            ExpiresIn=3600 # 1 hora
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"upload_url": response, "key": object_name}
