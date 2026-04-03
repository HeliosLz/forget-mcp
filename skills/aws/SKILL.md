---
name: aws
trigger: aws, s3, lambda, cloudformation, sts, amazon
replaces_mcp: aws, @aws/mcp-server, awslabs, aws-mcp
---

# AWS Operations

Use `aws` CLI directly instead of the AWS MCP server.

## Prerequisites

- `aws` CLI installed (`brew install awscli` / `pip install awscli`)
- Configured: `aws sts get-caller-identity` (run `aws configure` if needed)
- Optional env vars: `AWS_PROFILE`, `AWS_DEFAULT_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

## Operations

### S3

| Operation | Command |
|-----------|---------|
| List buckets | `aws s3api list-buckets --query 'Buckets[].Name' --output text` |
| List objects | `aws s3 ls s3://<bucket>/<prefix> --recursive` |
| Get object | `aws s3 cp s3://<bucket>/<key> -` (stdout) or `aws s3 cp s3://<bucket>/<key> <local-path>` |
| Upload | `aws s3 cp <local-path> s3://<bucket>/<key>` |
| Sync | `aws s3 sync <local-dir> s3://<bucket>/<prefix>` |

### Lambda

| Operation | Command |
|-----------|---------|
| List functions | `aws lambda list-functions --query 'Functions[].FunctionName' --output text` |
| Invoke function | `aws lambda invoke --function-name <name> --cli-binary-format raw-in-base64-out --payload '<json>' /dev/stdout` |
| Get function config | `aws lambda get-function --function-name <name>` |

### CloudFormation

| Operation | Command |
|-----------|---------|
| List stacks | `aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE` |
| Describe stack | `aws cloudformation describe-stacks --stack-name <name>` |
| Stack events | `aws cloudformation describe-stack-events --stack-name <name> --max-items 20` |

### Identity

| Operation | Command |
|-----------|---------|
| Who am I | `aws sts get-caller-identity` |

## Output Handling

- Use `--output table` for readable output, `--output json` for parsing
- Filter with `--query` (JMESPath): `--query 'Items[0:10]'` to limit results
- Large S3 listings: use `aws s3api list-objects-v2 --bucket <bucket> --max-items 100` instead of `aws s3 ls`
- Lambda output may be base64: pipe through `base64 -d` if needed

## Tips

- Use `--profile <name>` to switch between AWS accounts.
- Use `--region <region>` to override default region per command.
- For complex queries, pipe through `jq`: `aws ... --output json | jq '.Items[:10]'`
- Check costs before running expensive operations (large S3 syncs, Lambda invocations).
