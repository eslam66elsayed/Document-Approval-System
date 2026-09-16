# ⚙️ AWS Setup Guide

This guide explains how to build and deploy the **Document Approval System** from scratch using the AWS Management Console.

---

# 📋 Architecture

The project uses:

- Amazon S3
- Amazon CloudFront
- Amazon API Gateway
- AWS Lambda
- Amazon DynamoDB
- Amazon SES
- AWS IAM
- Amazon CloudWatch

The project contains:

- **1 S3 bucket**
- **1 DynamoDB table**
- **2 Lambda functions**
- **1 REST API**
- **1 CloudFront distribution**

---

# 1. Create the S3 Bucket

Go to:

**AWS Console → S3 → Create bucket**

### Bucket settings

Choose a globally unique bucket name:

```text
document-approval-system-your-name
```

### Object Ownership

Select:

```text
ACLs disabled
```

### Block Public Access

Keep:

```text
Block all public access
```

enabled.

### Bucket Versioning

Optional:

```text
Disable
```

### Default Encryption

Use:

```text
Amazon S3 managed keys (SSE-S3)
```

Click:

**Create bucket**

---

# 2. Upload Frontend Files

Open your S3 bucket.

Upload:

```text
index.html
admin.html
style.css
script.js
admin.js
```

Do not manually create:

```text
documents/
```

Lambda will create the document prefixes automatically.

---

# 3. Create DynamoDB Table

Go to:

**AWS Console → DynamoDB → Tables → Create table**

### Table name

```text
document-requests
```

### Partition key

```text
request_id
```

Type:

```text
String
```

### Capacity

Select:

```text
On-demand
```

Create the table.

---

# 4. Create IAM Role

Go to:

**IAM → Roles → Create role**

Select:

```text
AWS service
```

Use case:

```text
Lambda
```

Click:

**Next**

Attach:

```text
AWSLambdaBasicExecutionRole
```

Create the role.

Name:

```text
DocumentApprovalLambdaRole
```

---

# 5. Add Lambda Permissions

Open:

**IAM → Roles → DocumentApprovalLambdaRole**

Add an inline policy.

Use the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:YOUR_REGION:YOUR_ACCOUNT_ID:table/document-requests"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

Replace:

```text
YOUR_BUCKET_NAME
YOUR_REGION
YOUR_ACCOUNT_ID
```

with your AWS values.

---

# 6. Create SubmitDocumentLambda

Go to:

**AWS Console → Lambda → Create function**

Choose:

```text
Author from scratch
```

Function name:

```text
SubmitDocumentLambda
```

Runtime:

```text
Python 3.12
```

Architecture:

```text
x86_64
```

Under permissions select:

```text
Use an existing role
```

Choose:

```text
DocumentApprovalLambdaRole
```

Click:

**Create function**

---

# 7. SubmitDocumentLambda Environment Variables

Go to:

**Lambda → SubmitDocumentLambda → Configuration → Environment variables**

Add:

```text
BUCKET_NAME = YOUR_BUCKET_NAME
TABLE_NAME = document-requests
```

If the function sends email to the admin, also configure the required SES sender/recipient variables.

---

# 8. SubmitDocumentLambda Code

Open:

**SubmitDocumentLambda → Code → lambda_function.py**

Paste the code from:

```text
SubmitDocumentLambda/lambda_function.py
```

from this repository.

Click:

**Deploy**

---

# 9. Create AdminDocumentLambda

Go to:

**AWS Console → Lambda → Create function**

Choose:

```text
Author from scratch
```

Function name:

```text
AdminDocumentLambda
```

Runtime:

```text
Python 3.12
```

Architecture:

```text
x86_64
```

Choose the existing role:

```text
DocumentApprovalLambdaRole
```

Click:

**Create function**

---

# 10. AdminDocumentLambda Environment Variables

Go to:

**Configuration → Environment variables**

Add:

```text
BUCKET_NAME = YOUR_BUCKET_NAME
TABLE_NAME = document-requests
SES_FROM_EMAIL = YOUR_VERIFIED_SES_EMAIL
```

If required by the code, also configure the AWS Region.

---

# 11. AdminDocumentLambda Code

Open:

**AdminDocumentLambda → Code → lambda_function.py**

Paste the code from:

```text
AdminDocumentLambda/lambda_function.py
```

Click:

**Deploy**

This Lambda handles:

```text
GET /admin/requests
GET /admin/document
POST /admin/decision
```

---

# 12. Configure Amazon SES

Go to:

**AWS Console → Amazon SES**

Make sure you are using the same AWS Region used by your Lambda functions.

Go to:

**SES → Verified identities**

Click:

**Create identity**

Select:

```text
Email address
```

Enter your email address.

Verify the email using the verification message sent by SES.

The email must show:

```text
Verified
```

---

# 13. SES Sandbox

If your SES account is still in the Sandbox environment, recipient email addresses may also need to be verified.

For testing:

```text
Sender Email → Verified
User Email → Verified
```

---

# 14. Create API Gateway REST API

Go to:

**AWS Console → API Gateway**

Choose:

**Create API**

Select:

```text
REST API
```

Do not select HTTP API.

API name:

```text
DocumentApprovalAPI
```

Endpoint type:

```text
Regional
```

Create the API.

---

# 15. Create `/submit`

Inside the REST API:

Create resource:

```text
/submit
```

Create method:

```text
POST
```

Integration type:

```text
Lambda Function
```

Select:

```text
SubmitDocumentLambda
```

Enable Lambda proxy integration.

Save the method.

---

# 16. Create `/admin`

Create a resource:

```text
/admin
```

Inside `/admin`, create:

```text
/requests
```

---

# 17. Create `GET /admin/requests`

Select:

```text
/admin/requests
```

Create:

```text
GET
```

Integration:

```text
Lambda Function
```

Lambda:

```text
AdminDocumentLambda
```

Enable Lambda proxy integration.

---

# 18. Create `GET /admin/document`

Create another resource under `/admin`:

```text
/document
```

Create method:

```text
GET
```

Integration:

```text
AdminDocumentLambda
```

Add query string parameter:

```text
request_id
```

Set it as:

```text
Required
```

The frontend will call:

```text
GET /admin/document?request_id=REQUEST_ID
```

---

# 19. Create `POST /admin/decision`

Under `/admin`, create:

```text
/decision
```

Create:

```text
POST
```

Integration:

```text
AdminDocumentLambda
```

Enable Lambda proxy integration.

The frontend sends:

```json
{
  "request_id": "REQ-123456",
  "decision": "Approved"
}
```

or:

```json
{
  "request_id": "REQ-123456",
  "decision": "Rejected"
}
```

---

# 20. Enable CORS

For the API resources used by the frontend, configure CORS.

Allow:

```text
*
```

during development/testing.

Required methods:

```text
GET
POST
OPTIONS
```

For production, replace `*` with the actual CloudFront domain.

---

# 21. Deploy API Gateway

Go to:

**API Gateway → Resources**

Click:

**Deploy API**

Create a new stage:

```text
prod
```

Your API URL will look similar to:

```text
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
```

Copy this URL.

---

# 22. Configure Frontend

Open:

```text
frontend/script.js
```

Find:

```javascript
const API_BASE_URL =
    "PASTE_YOUR_API_GATEWAY_URL_HERE";
```

Replace it with your API Gateway URL:

```javascript
const API_BASE_URL =
    "https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod";
```

Do the same in:

```text
frontend/admin.js
```

---

# 23. Upload Updated Frontend

Upload the updated files to the S3 bucket:

```text
index.html
admin.html
style.css
script.js
admin.js
```

---

# 24. Configure CloudFront

Go to:

**AWS Console → CloudFront → Create distribution**

### Origin

Select your S3 bucket.

Use:

```text
Origin Access Control (OAC)
```

Do not make the S3 bucket public.

### Viewer Protocol Policy

Choose:

```text
Redirect HTTP to HTTPS
```

### Default Root Object

Set:

```text
index.html
```

Create the distribution.

---

# 25. Update S3 Bucket Policy

CloudFront will provide the option to update the S3 bucket policy for Origin Access Control.

Allow CloudFront to access the S3 bucket.

Keep:

```text
Block Public Access = ON
```

The S3 bucket should remain private.

---

# 26. CloudFront URL

After the distribution becomes deployed, you will receive a domain similar to:

```text
https://xxxxxxxxxxxx.cloudfront.net
```

Open:

```text
https://xxxxxxxxxxxx.cloudfront.net
```

The user page should appear.

The admin dashboard can be accessed through:

```text
https://xxxxxxxxxxxx.cloudfront.net/admin.html
```

The Admin page is not linked from the user interface.

> Hiding the admin page URL is only a UI-level measure, not real authentication. For a production system, add proper admin authentication.

---

# 27. CloudFront Cache Invalidation

Whenever you update frontend files:

Go to:

**CloudFront → Distribution → Invalidations**

Click:

**Create invalidation**

Object path:

```text
/*
```

Click:

**Create invalidation**

Wait until the invalidation status becomes:

```text
Completed
```

Then refresh the CloudFront website.

---

# 28. Test User Submission

Open the CloudFront URL.

Enter:

```text
Full Name
Email Address
Document
```

Click:

```text
Submit Document
```

Expected flow:

```text
User
 ↓
CloudFront
 ↓
S3 Frontend
 ↓
API Gateway
 ↓
SubmitDocumentLambda
 ↓
S3 + DynamoDB
```

---

# 29. Verify S3

Open:

**S3 → Your Bucket**

You should find the uploaded document under:

```text
documents/
```

Example:

```text
documents/
└── REQ-123456/
    └── document.pdf
```

---

# 30. Verify DynamoDB

Go to:

**DynamoDB → Tables → document-requests → Explore table items**

You should see an item similar to:

```json
{
  "request_id": "REQ-123456",
  "name": "John Doe",
  "email": "john@example.com",
  "document_key": "documents/REQ-123456/document.pdf",
  "status": "Pending",
  "created_at": "2026-09-16T12:00:00Z"
}
```

---

# 31. Test Admin Dashboard

Open:

```text
https://YOUR_CLOUDFRONT_DOMAIN/admin.html
```

The dashboard should load the requests.

You should see:

```text
Total Requests
Pending
Approved
Rejected
```

---

# 32. Test Document Viewing

Click:

```text
View
```

The frontend calls:

```text
GET /admin/document?request_id=...
```

The Lambda generates an S3 Presigned URL.

The document opens temporarily without making the S3 bucket public.

---

# 33. Test Approval

Click:

```text
Approve
```

The frontend sends:

```json
{
  "request_id": "REQ-123456",
  "decision": "Approved"
}
```

The Lambda:

```text
AdminDocumentLambda
        │
        ├──► DynamoDB
        │     status = Approved
        │
        └──► SES
              │
              ▼
           User Email
```

---

# 34. Test Rejection

Click:

```text
Reject
```

The Lambda updates:

```text
status = Rejected
```

Then SES sends the rejection email to the user's email address.

---

# 35. Final Architecture

```text
                     USER
                       │
                       ▼
                ┌─────────────┐
                │ CloudFront  │
                └──────┬──────┘
                       │
                       ▼
                ┌─────────────┐
                │     S3      │
                │  Frontend   │
                │ Documents   │
                └──────┬──────┘
                       │
                       ▼
                ┌─────────────┐
                │ API Gateway │
                │    REST     │
                └──────┬──────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
     ┌─────────────────┐ ┌─────────────────┐
     │ SubmitDocument  │ │ AdminDocument   │
     │     Lambda      │ │     Lambda      │
     └────────┬────────┘ └────────┬────────┘
              │                   │
          ┌───┴───┐          ┌────┼────┐
          ▼       ▼          ▼    ▼    ▼
         S3   DynamoDB    DynamoDB S3  SES
                              │
                              ▼
                       Admin Dashboard
                              │
                       Approve / Reject
                              │
                              ▼
                             SES
                              │
                              ▼
                         User Email
```

---

# ✅ Final AWS Resources

The completed project should contain:

```text
Amazon S3
└── 1 Bucket

Amazon DynamoDB
└── 1 Table
    └── document-requests

AWS Lambda
├── SubmitDocumentLambda
└── AdminDocumentLambda

Amazon API Gateway
└── DocumentApprovalAPI
    ├── POST /submit
    ├── GET /admin/requests
    ├── GET /admin/document
    └── POST /admin/decision

Amazon CloudFront
└── 1 Distribution

Amazon SES
└── Email Notifications

AWS IAM
└── DocumentApprovalLambdaRole
```

---

# 🎉 Project Completed

At this point, the Document Approval System is running with:

- One S3 bucket
- One DynamoDB table
- Two Lambda functions
- One REST API
- CloudFront
- SES
- IAM
- Presigned document URLs
- User interface
- Admin dashboard

The administrator manages approvals from the dashboard, while users receive the final decision by email.
