import json
import boto3
import uuid
import base64
import os
from datetime import datetime

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

BUCKET_NAME = os.environ["BUCKET_NAME"]
TABLE_NAME = os.environ["TABLE_NAME"]

table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):

    try:

        body = event.get("body")

        if event.get("isBase64Encoded"):
            body = base64.b64decode(body).decode("utf-8")

        data = json.loads(body)

        name = data["name"]
        email = data["email"]
        file_name = data["file_name"]
        file_content = data["file_content"]

        request_id = "REQ-" + str(uuid.uuid4())[:8].upper()

        document_key = f"documents/{request_id}/{file_name}"

        file_bytes = base64.b64decode(file_content)

        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=document_key,
            Body=file_bytes
        )

        table.put_item(
            Item={
                "request_id": request_id,
                "name": name,
                "email": email,
                "document_key": document_key,
                "status": "Pending",
                "created_at": datetime.utcnow().isoformat()
            }
        )

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "message": "Document submitted successfully",
                "request_id": request_id,
                "status": "Pending"
            })
        }

    except Exception as e:

        print("ERROR:", str(e))

        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "message": "Error submitting document",
                "error": str(e)
            })
        }
