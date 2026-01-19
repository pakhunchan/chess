#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { AlbStack } from '../lib/alb-stack';
import { EcsStack } from '../lib/ecs-stack';
import { CONFIG } from '../lib/config';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Network Stack - VPC, subnets, security groups
const networkStack = new NetworkStack(app, 'ChessNetworkStack', { env });

// Database Stack - RDS PostgreSQL
const databaseStack = new DatabaseStack(app, 'ChessDatabaseStack', {
  env,
  vpc: networkStack.vpc,
  rdsSg: networkStack.rdsSg,
});

// ALB Stack - Load balancer + ACM certificate
const albStack = new AlbStack(app, 'ChessAlbStack', {
  env,
  vpc: networkStack.vpc,
  albSg: networkStack.albSg,
});

// ECS Stack - Fargate service (pulls from GHCR)
const ecsStack = new EcsStack(app, 'ChessEcsStack', {
  env,
  vpc: networkStack.vpc,
  ecsSg: networkStack.ecsSg,
  dbSecret: databaseStack.dbSecret,
  targetGroup: albStack.targetGroup,
});

// Add dependencies
databaseStack.addDependency(networkStack);
albStack.addDependency(networkStack);
ecsStack.addDependency(networkStack);
ecsStack.addDependency(databaseStack);
ecsStack.addDependency(albStack);

// Tags for all resources
cdk.Tags.of(app).add('Project', CONFIG.projectName);
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('Environment', 'Production');
cdk.Tags.of(app).add('LastModified', new Date().toISOString());

app.synth();
