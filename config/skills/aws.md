---
description: AWS cloud infrastructure and serverless best practices
keywords: [aws, lambda, iam, s3, dynamodb, rds, cloudformation, cdk, serverless, ec2, cloudwatch, security, cost-optimization]
last_updated: 2026-03
---

# AWS Cloud Infrastructure

Actionable rules for secure, cost-effective AWS development. Focus: serverless, IaC, and managed services.

## When to activate
- Designing serverless architectures or Lambda functions
- Configuring IAM policies, roles, or permissions
- Using S3, DynamoDB, RDS, or other AWS services
- Writing CloudFormation/CDK templates
- Auditing security, cost, or compliance

## IAM: least privilege essentials
- Grant minimal permissions; use `Action`/`Resource` constraints, never `*` unless justified.
- Use roles for services (e.g., Lambda execution role), not user credentials.
- Enable MFA for root and privileged users; rotate access keys regularly.
- Use IAM Policy Simulator to test permissions before deploy.

## Lambda/serverless patterns
- Keep functions small, single-purpose; max 5min timeout unless async.
- Use environment variables for config; store secrets in AWS Secrets Manager.
- Enable X-Ray for tracing; set reserved concurrency to prevent throttling.
- Package dependencies efficiently; use layers for shared code.

```javascript
// Lambda handler skeleton (Node.js)
exports.handler = async (event) => {
  const { action, payload } = JSON.parse(event.body || '{}');
  // Validate → Process → Return
  return { statusCode: 200, body: JSON.stringify({ result: 'ok' }) };
};
```

## Service quick guidelines
- **S3**: Enable versioning + encryption (SSE-S3/KMS); use lifecycle rules for cost; block public access by default.
- **DynamoDB**: Use on-demand for unpredictable traffic; design PK/SK for query patterns; add GSIs sparingly.
- **RDS**: Use parameter groups; enable automated backups; prefer Aurora Serverless for variable loads.
- **CloudWatch**: Set alarms on errors, duration, throttles; use structured logs.

## CloudFormation/CDK conventions
- Use CDK (TypeScript/Python) for complex logic; CloudFormation YAML for simple stacks.
- Parameterize environments (`dev`/`prod`); avoid hardcoding account IDs/regions.
- Use `cdk diff` before deploy; enable termination protection for prod stacks.
- Tag all resources: `App`, `Env`, `Owner` for cost allocation.

## ❌ Anti-patterns
- Hardcoding credentials or account IDs in code/templates
- Using `iam:PassRole` with `Resource: "*"`
- Provisioned concurrency for all Lambdas (costly)
- S3 buckets with public read/write by default
- Monolithic Lambda functions handling multiple unrelated tasks

## Quick checklist (PRs)
- [ ] IAM policies scoped to specific actions/resources
- [ ] Secrets in Secrets Manager/SSM, not plain env vars
- [ ] S3/DynamoDB encryption enabled at rest
- [ ] CloudFormation/CDK templates parameterized per env
- [ ] Tags (`App`, `Env`, `Owner`) applied for cost tracking
- [ ] CloudWatch alarms configured for errors/throttles

## Example prompts (semantic router)
"aws lambda best practices"
"iam least privilege policy example"
"s3 encryption lifecycle rules"
"dynamodb partition key design"
"cdk stack parameterization"
"aws serverless cost optimization"
"cloudformation vs cdk when to use"
"aws secrets manager vs ssm parameters"