import { CostExplorerService } from './services/costExplorer';
import { NotifierService } from './services/notifier';
import { CostAlertConfig } from './types';

const config: CostAlertConfig = {
  thresholdUSD: Number(process.env.COST_THRESHOLD_USD ?? 50),
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  emailAddress: process.env.ALERT_EMAIL,
  awsRegion: process.env.AWS_REGION ?? 'us-east-1',
};

export const handler = async (): Promise<void> => {
  console.log('🔍 Checking AWS costs...');

  const costService = new CostExplorerService(config.awsRegion);
  const notifier = new NotifierService(config);

  const { currentMonthCost, forecastedCost, breakdown } =
    await costService.getMonthlyCosts();

  console.log(`💰 Current month cost: $${currentMonthCost.toFixed(2)}`);
  console.log(`📈 Forecasted end-of-month: $${forecastedCost.toFixed(2)}`);

  const thresholdExceeded = currentMonthCost >= config.thresholdUSD;
  const forecastExceeded = forecastedCost >= config.thresholdUSD * 1.5;

  if (thresholdExceeded || forecastExceeded) {
    console.log('🚨 Threshold exceeded! Sending alert...');
    await notifier.sendAlert({ currentMonthCost, forecastedCost, breakdown });
  } else {
    console.log('✅ Costs are within the safe threshold.');
  }
};
