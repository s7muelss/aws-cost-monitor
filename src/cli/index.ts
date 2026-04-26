#!/usr/bin/env node
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { handler } from '../index';

dotenv.config();

const program = new Command();

program
  .name('aws-cost-alert')
  .description('Monitor your AWS costs and get alerts before your bill explodes 🚨')
  .version('1.0.0');

program
  .command('check')
  .description('Run a cost check now')
  .option('-t, --threshold <usd>', 'Cost threshold in USD', '50')
  .option('-r, --region <region>', 'AWS region', 'us-east-1')
  .action(async (options: { threshold: string; region: string }) => {
    process.env.COST_THRESHOLD_USD = options.threshold;
    process.env.AWS_REGION = options.region;
    await handler();
  });

program.parse();
