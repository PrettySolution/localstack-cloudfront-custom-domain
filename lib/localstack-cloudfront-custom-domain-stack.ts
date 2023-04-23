import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Queue} from "aws-cdk-lib/aws-sqs";
import {ARecord, HostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  OriginRequestPolicy,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import {LoadBalancerV2Origin, S3Origin} from "aws-cdk-lib/aws-cloudfront-origins";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {AssetHashType, DockerImage, Duration, IgnoreMode} from "aws-cdk-lib";
import {BucketDeployment, Source} from "aws-cdk-lib/aws-s3-deployment";
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface LocalstackCloudfrontCustomDomainProps extends cdk.StackProps {
  hostedZoneName: string
}

export class LocalstackCloudfrontCustomDomainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LocalstackCloudfrontCustomDomainProps) {
    super(scope, id, props);

    // ################## HostedZone and Certificate ######################
    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.hostedZoneName,
    })

    const cert = new Certificate(this, 'DnsValidatedCertificate', {
      validation: CertificateValidation.fromDns(hostedZone),
      domainName: hostedZone.zoneName,
      subjectAlternativeNames: [`*.${hostedZone.zoneName}`],
    })

    // ################## MyFrontend ######################
    const MyFrontend = new Bucket(this, 'MyFrontend', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      // cors: [corsRule]
    })

    const distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new S3Origin(MyFrontend),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [hostedZone.zoneName],
      certificate: cert,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
      ],

    })

    new BucketDeployment(this, 'BucketDeployment', {
      sources: [
        Source.asset('web', {
          bundling: {
            image: DockerImage.fromRegistry('public.ecr.aws/docker/library/node:18.12.1'),
            user: 'root:root',
            command: ['sh', '-c', 'npm i && npm run build && cp -R ./dist/* /asset-output/'],

          },
          assetHashType: AssetHashType.SOURCE,
          ignoreMode: IgnoreMode.GIT,
        }),
      ],
      destinationBucket: MyFrontend,
      distributionPaths: ['/*'], // invalidate on deploy
      distribution,
    })

    new ARecord(this, 'ARecord', {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    })

  }
}
