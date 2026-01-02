export const CONFIG = {
  // Naming
  projectName: 'chess',

  // Domain
  domainName: 'pakhunchan.com',
  apiSubdomain: 'chess-api',
  frontendUrl: 'https://chess.pakhunchan.com',

  // GitHub
  githubRepo: 'pakhunchan/chess',

  // ECS
  cpu: 256,
  memory: 512,
  desiredCount: 1,
  containerPort: 8000,

  // RDS
  dbName: 'chess',
  dbInstanceType: 't3.micro',
  dbStorageGb: 20,

  // Logging
  logRetentionDays: 7,
};
