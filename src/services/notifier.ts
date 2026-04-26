import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { CostAlertConfig, AlertPayload } from '../types';

export class NotifierService {
  private config: CostAlertConfig;
  private snsClient: SNSClient;

  constructor(config: CostAlertConfig) {
    this.config = config;
    this.snsClient = new SNSClient({ region: config.awsRegion });
  }

  private formatMessage(payload: AlertPayload): string {
    const { currentMonthCost, forecastedCost, breakdown } = payload;

    const top5 = breakdown
      .slice(0, 5)
      .map((s) => `  • ${s.serviceName}: $${s.amount.toFixed(2)}`)
      .join('\n');

    return [
      '🚨 *AWS Cost Alert*',
      '',
      `💰 Current month:    *$${currentMonthCost.toFixed(2)}*`,
      `📈 Forecasted total: *$${forecastedCost.toFixed(2)}*`,
      `⚠️  Threshold:        *$${this.config.thresholdUSD.toFixed(2)}*`,
      '',
      '📊 *Top services by cost:*',
      top5,
      '',
      '🔗 https://console.aws.amazon.com/cost-management/home',
    ].join('\n');
  }

  async sendAlert(payload: AlertPayload): Promise<void> {
    const message = this.formatMessage(payload);
    const promises: Promise<void>[] = [];

    if (this.config.slackWebhookUrl) {
      promises.push(this.sendSlack(message));
    }

    if (this.config.emailAddress && process.env.SNS_TOPIC_ARN) {
      promises.push(this.sendSNS(message));
    }

    if (promises.length === 0) {
      console.warn('⚠️  No notification channel configured. Printing alert:');
      console.log(message);
      return;
    }

    await Promise.all(promises);
    console.log('✅ Alert sent successfully.');
  }

  private async sendSlack(message: string): Promise<void> {
    const res = await fetch(this.config.slackWebhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });

    if (!res.ok) {
      throw new Error(`Slack webhook failed: ${res.status} ${res.statusText}`);
    }
  }

  private async sendSNS(message: string): Promise<void> {
    await this.snsClient.send(
      new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Subject: '🚨 AWS Cost Alert — Threshold Exceeded',
        Message: message,
      })
    );
  }
}
