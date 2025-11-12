// migrate-mongo-config.ts
require('dotenv').config();
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs'
  }
});

const config = {
  mongodb: {
    url: process.env.MONGO_URI,
    databaseName: process.env.DB_NAME,
    options: {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.ts',
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;