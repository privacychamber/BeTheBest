// Financial & Funnel Metrics Calculation Engine

export interface FunnelCounts {
  submitted: number;
  viewed: number;
  responded: number;
  interviewed: number;
  won: number;
}

export interface FunnelConversionRates {
  viewRatePercent: number;
  responseRatePercent: number;
  interviewRatePercent: number;
  winRatePercent: number;
}

export function calculateFunnelRates(counts: FunnelCounts): FunnelConversionRates {
  const { submitted, viewed, responded, interviewed, won } = counts;
  if (submitted === 0) {
    return {
      viewRatePercent: 0,
      responseRatePercent: 0,
      interviewRatePercent: 0,
      winRatePercent: 0,
    };
  }

  const round = (val: number) => Math.round(val * 100) / 100;

  return {
    viewRatePercent: round((viewed / submitted) * 100),
    responseRatePercent: round((responded / submitted) * 100),
    interviewRatePercent: round((interviewed / submitted) * 100),
    winRatePercent: round((won / submitted) * 100),
  };
}

export const CONNECT_COST_USD_CENTS = 15; // Approx $0.15 per Connect

export interface AcquisitionCostInput {
  totalConnectsSpent: number;
  directCostsCents: number;
  wonDealsCount: number;
  connectCostCents?: number;
}

export function calculateAcquisitionCostCents(input: AcquisitionCostInput): {
  totalCostCents: number;
  costPerWonDealCents: number;
} {
  const costPerConnect = input.connectCostCents ?? CONNECT_COST_USD_CENTS;
  const connectsCostCents = input.totalConnectsSpent * costPerConnect;
  const totalCostCents = connectsCostCents + input.directCostsCents;

  const costPerWonDealCents = input.wonDealsCount > 0 
    ? Math.round(totalCostCents / input.wonDealsCount) 
    : totalCostCents;

  return {
    totalCostCents,
    costPerWonDealCents,
  };
}

export interface RoiInput {
  revenueCents: number;
  directCostCents: number;
  connectsSpent: number;
  connectCostCents?: number;
}

export interface RoiResult {
  netProfitCents: number;
  totalCostCents: number;
  roiPercent: number;
  profitMarginPercent: number;
}

export function calculateRoi(input: RoiInput): RoiResult {
  const costPerConnect = input.connectCostCents ?? CONNECT_COST_USD_CENTS;
  const connectsCostCents = input.connectsSpent * costPerConnect;
  const totalCostCents = input.directCostCents + connectsCostCents;
  const netProfitCents = input.revenueCents - totalCostCents;

  const roiPercent = totalCostCents > 0
    ? Math.round((netProfitCents / totalCostCents) * 10000) / 100
    : 0;

  const profitMarginPercent = input.revenueCents > 0
    ? Math.round((netProfitCents / input.revenueCents) * 10000) / 100
    : 0;

  return {
    netProfitCents,
    totalCostCents,
    roiPercent,
    profitMarginPercent,
  };
}
