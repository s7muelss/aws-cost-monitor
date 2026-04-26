export interface CostAlertConfig {
  thresholdUSD: number;
  slackWebhookUrl?: string;
  emailAddress?: string;
  awsRegion: string;
}

export interface ServiceCost {
  serviceName: string;
  amount: number;
  unit: string;
}

export interface CostReport {
  currentMonthCost: number;
  forecastedCost: number;
  breakdown: ServiceCost[];
}

export type AlertPayload = CostReport;
