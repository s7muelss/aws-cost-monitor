import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
} from '@aws-sdk/client-cost-explorer';
import { CostReport, ServiceCost } from '../types';

export class CostExplorerService {
  private client: CostExplorerClient;

  constructor(region: string) {
    this.client = new CostExplorerClient({ region });
  }

  private getDateRange(): { start: string; end: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  async getMonthlyCosts(): Promise<CostReport> {
    const { start, end } = this.getDateRange();

    const usageResponse = await this.client.send(
      new GetCostAndUsageCommand({
        TimePeriod: { Start: start, End: end },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
        GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      })
    );

    const groups = usageResponse.ResultsByTime?.[0]?.Groups ?? [];

    const breakdown: ServiceCost[] = groups.map((group) => ({
      serviceName: group.Keys?.[0] ?? 'Unknown',
      amount: Number(group.Metrics?.UnblendedCost?.Amount ?? 0),
      unit: group.Metrics?.UnblendedCost?.Unit ?? 'USD',
    }));

    breakdown.sort((a, b) => b.amount - a.amount);

    const currentMonthCost = breakdown.reduce((sum, s) => sum + s.amount, 0);

    let forecastedCost = currentMonthCost;

    try {
      const today = new Date().toISOString().split('T')[0];

      if (today < end) {
        const forecastResponse = await this.client.send(
          new GetCostForecastCommand({
            TimePeriod: { Start: today, End: end },
            Granularity: 'MONTHLY',
            Metric: 'UNBLENDED_COST',
          })
        );
        forecastedCost =
          currentMonthCost + Number(forecastResponse.Total?.Amount ?? 0);
      }
    } catch {
      console.warn('⚠️  Could not fetch forecast. Using current cost.');
    }

    return { currentMonthCost, forecastedCost, breakdown };
  }
}
