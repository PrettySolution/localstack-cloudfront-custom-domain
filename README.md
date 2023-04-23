##### Steps:
1. `python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
2. `npm install -g aws-cdk-local aws-cdk`
3. `npm i`
```shell
export LOCALSTACK_API_KEY= 

export DNS_ADDRESS=0.0.0.0 && \
export LS_LOG=trace && \
  git checkout cdk.context.json && \
  export DEBUG=1 && \
  localstack stop; \
  docker stop $(docker ps -a -q); \
  docker rm $(docker ps -a -q); \
  docker volume prune --force;
  localstack start -d && \
  cdklocal bootstrap 000000000000/us-east-1 && \
  awslocal route53 create-hosted-zone --name app.localhost.localstack.cloud --caller-reference r1 | jq -r .HostedZone.Id && \
  cdklocal deploy --require-approval never
```
##### Issue
ReadTimeoutError: Read timeout on endpoint URL: "http://localhost:4566/2015-03-31/functions/LocalstackCloudfrontCustomDom-CustomCDKBucketDeploymen-196949f5/invocations"