import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CONFIG } from './config';

export interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  ecsSg: ec2.SecurityGroup;
  dbSecret: secretsmanager.ISecret;
  targetGroup: elbv2.ApplicationTargetGroup;
}

export class EcsStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly service: ecs.FargateService;
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, 'ChessCluster', {
      vpc: props.vpc,
      clusterName: `${CONFIG.projectName}-cluster`,
      containerInsights: false, // Disabled for cost
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'ChessLogGroup', {
      logGroupName: `/ecs/${CONFIG.projectName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task Definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'ChessTaskDef', {
      memoryLimitMiB: CONFIG.memory,
      cpu: CONFIG.cpu,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // Grant task role access to read secrets
    props.dbSecret.grantRead(this.taskDefinition.taskRole);

    // Container Definition - built from local Dockerfile via CDK assets
    const container = this.taskDefinition.addContainer('ChessApi', {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../backend')),
      memoryLimitMiB: CONFIG.memory,
      cpu: CONFIG.cpu,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'chess-api',
        logGroup: logGroup,
      }),
      environment: {
        PYTHONUNBUFFERED: '1',
        DB_NAME: CONFIG.dbName,
        CORS_ORIGINS: `${CONFIG.frontendUrl},http://localhost:5173,http://127.0.0.1:5173`,
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
        DB_HOST: ecs.Secret.fromSecretsManager(props.dbSecret, 'host'),
        DB_PORT: ecs.Secret.fromSecretsManager(props.dbSecret, 'port'),
      },
      portMappings: [
        {
          containerPort: CONFIG.containerPort,
          protocol: ecs.Protocol.TCP,
        },
      ],
      healthCheck: {
        command: ['CMD-SHELL', `curl -f http://localhost:${CONFIG.containerPort}/health || exit 1`],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Fargate Service
    this.service = new ecs.FargateService(this, 'ChessService', {
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: CONFIG.desiredCount,
      serviceName: `${CONFIG.projectName}-service`,
      securityGroups: [props.ecsSg],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Public subnet for cost savings (no NAT)
      },
      assignPublicIp: true, // Required for public subnet
      enableExecuteCommand: true, // For debugging via ECS Exec
      circuitBreaker: {
        rollback: true,
      },
      minHealthyPercent: 0, // Allow 0 during deployment for single instance
      maxHealthyPercent: 200,
    });

    // Register with ALB target group
    this.service.attachToApplicationTargetGroup(props.targetGroup);

    // Outputs
    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      exportName: `${CONFIG.projectName}-cluster-name`,
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      exportName: `${CONFIG.projectName}-service-name`,
    });

    new cdk.CfnOutput(this, 'TaskDefinitionFamily', {
      value: this.taskDefinition.family,
      exportName: `${CONFIG.projectName}-task-family`,
    });
  }
}
