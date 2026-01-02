import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CONFIG } from './config';

export interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  rdsSg: ec2.SecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Database credentials stored in Secrets Manager
    const credentials = rds.Credentials.fromGeneratedSecret('chess_admin', {
      secretName: `${CONFIG.projectName}/db/credentials`,
    });

    // RDS PostgreSQL instance
    this.database = new rds.DatabaseInstance(this, 'ChessDb', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),

      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [props.rdsSg],

      // Cost optimizations
      multiAz: false,
      allocatedStorage: CONFIG.dbStorageGb,
      maxAllocatedStorage: 100,
      storageType: rds.StorageType.GP2,

      // Database config
      databaseName: CONFIG.dbName,
      credentials: credentials,
      port: 5432,

      // Backup & maintenance
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      deletionProtection: false, // Set to true for production
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,

      // Performance (disabled for cost)
      enablePerformanceInsights: false,
      monitoringInterval: cdk.Duration.seconds(0),

      // Parameter group
      parameterGroup: new rds.ParameterGroup(this, 'ChessDbParams', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_16_4,
        }),
        parameters: {
          log_statement: 'ddl',
          log_min_duration_statement: '1000',
        },
      }),
    });

    // Store the secret reference
    this.dbSecret = this.database.secret!;

    // Outputs
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.database.instanceEndpoint.hostname,
      exportName: `${CONFIG.projectName}-db-endpoint`,
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
      exportName: `${CONFIG.projectName}-db-secret-arn`,
    });
  }
}
