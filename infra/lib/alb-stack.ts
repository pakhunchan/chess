import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { CONFIG } from './config';

export interface AlbStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  albSg: ec2.SecurityGroup;
}

export class AlbStack extends cdk.Stack {
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly httpsListener: elbv2.ApplicationListener;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: AlbStackProps) {
    super(scope, id, props);

    // Look up the existing hosted zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: CONFIG.domainName,
    });

    // Create ACM certificate with DNS validation
    const certificate = new acm.Certificate(this, 'ChessCert', {
      domainName: `${CONFIG.apiSubdomain}.${CONFIG.domainName}`,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Application Load Balancer
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ChessAlb', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.albSg,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // Target Group for ECS
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'ChessTargetGroup', {
      vpc: props.vpc,
      port: CONFIG.containerPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        protocol: elbv2.Protocol.HTTP,
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // HTTPS Listener
    this.httpsListener = this.alb.addListener('HttpsListener', {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [certificate],
      sslPolicy: elbv2.SslPolicy.TLS12,
      defaultTargetGroups: [this.targetGroup],
    });

    // HTTP -> HTTPS redirect
    this.alb.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // Route 53 A record pointing to ALB
    new route53.ARecord(this, 'ApiDnsRecord', {
      zone: hostedZone,
      recordName: CONFIG.apiSubdomain,
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(this.alb)
      ),
    });

    // Outputs
    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: this.alb.loadBalancerDnsName,
      exportName: `${CONFIG.projectName}-alb-dns`,
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://${CONFIG.apiSubdomain}.${CONFIG.domainName}`,
      exportName: `${CONFIG.projectName}-api-url`,
    });
  }
}
