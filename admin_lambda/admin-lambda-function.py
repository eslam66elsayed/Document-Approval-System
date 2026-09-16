import json
import boto3
import os
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")
ses = boto3.client("ses")

TABLE_NAME = os.environ["TABLE_NAME"]
SENDER_EMAIL = os.environ["SENDER_EMAIL"]
BUCKET_NAME = os.environ["BUCKET_NAME"]

table = dynamodb.Table(TABLE_NAME)


def response(status_code, body):

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*"
        },
        "body": json.dumps(body)
    }


def lambda_handler(event, context):

    try:

        method = event.get("httpMethod", "")
        path = event.get("path", "")

        # ==========================================
        # GET ALL REQUESTS
        # ==========================================

        if method == "GET" and path.endswith("/requests"):

            result = table.scan()

            return response(
                200,
                {
                    "requests": result.get("Items", [])
                }
            )

        # ==========================================
        # GET PRESIGNED DOCUMENT URL
        # ==========================================

        if method == "GET" and path.endswith("/document"):

            request_id = (
                event.get("queryStringParameters") or {}
            ).get("request_id")

            if not request_id:

                return response(
                    400,
                    {
                        "message": "request_id is required"
                    }
                )

            result = table.get_item(
                Key={
                    "request_id": request_id
                }
            )

            item = result.get("Item")

            if not item:

                return response(
                    404,
                    {
                        "message": "Request not found"
                    }
                )

            document_key = item["document_key"]

            presigned_url = s3.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": BUCKET_NAME,
                    "Key": document_key
                },
                ExpiresIn=300
            )

            return response(
                200,
                {
                    "url": presigned_url
                }
            )

        # ==========================================
        # APPROVE / REJECT
        # ==========================================

        if method == "POST":

            body = event.get("body", "{}")
            data = json.loads(body)

            request_id = data["request_id"]
            decision = data["decision"]

            if decision not in ["Approved", "Rejected"]:

                return response(
                    400,
                    {
                        "message": "Invalid decision"
                    }
                )

            result = table.get_item(
                Key={
                    "request_id": request_id
                }
            )

            item = result.get("Item")

            if not item:

                return response(
                    404,
                    {
                        "message": "Request not found"
                    }
                )

            table.update_item(
                Key={
                    "request_id": request_id
                },
                UpdateExpression="""
                    SET #status = :status,
                        updated_at = :updated_at
                """,
                ExpressionAttributeNames={
                    "#status": "status"
                },
                ExpressionAttributeValues={
                    ":status": decision,
                    ":updated_at": datetime.utcnow().isoformat()
                }
            )

            if decision == "Approved":

                subject = "Document Approved"

                message = (
                    f"Hello {item['name']},\n\n"
                    "Your document has been approved successfully.\n\n"
                    f"Request ID: {request_id}\n"
                    "Status: Approved\n\n"
                    "Thank you."
                )

            else:

                subject = "Document Rejected"

                message = (
                    f"Hello {item['name']},\n\n"
                    "Your document has been rejected.\n\n"
                    f"Request ID: {request_id}\n"
                    "Status: Rejected\n\n"
                    "Please contact the administrator."
                )

            ses.send_email(
                Source=SENDER_EMAIL,
                Destination={
                    "ToAddresses": [
                        item["email"]
                    ]
                },
                Message={
                    "Subject": {
                        "Data": subject,
                        "Charset": "UTF-8"
                    },
                    "Body": {
                        "Text": {
                            "Data": message,
                            "Charset": "UTF-8"
                        }
                    }
                }
            )

            return response(
                200,
                {
                    "message":
                        f"Request {decision.lower()} successfully",
                    "request_id": request_id,
                    "status": decision
                }
            )

        return response(
            405,
            {
                "message": "Method not allowed"
            }
        )

    except Exception as e:

        print("ERROR:", str(e))

        return response(
            500,
            {
                "message": "Internal server error",
                "error": str(e)
            }
        )
