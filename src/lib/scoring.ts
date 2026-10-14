// Qualification Scoring & Hard-Stop Evaluation Engine

export interface QualificationInput {
  clientPaymentVerified: boolean;
  clientSpendCents: number;
  clientHireRatePercent: number;
  budgetFitScore: number; // 0 - 20
  skillsMatchScore: number; // 0 - 20
  proposalCompetitionScore: number; // 0 - 15
  budgetAmountCents?: number;
  hourlyRateMinCents?: number;
  hourlyRateMaxCents?: number;
  isHourly?: boolean;
  manualHardStop?: boolean;
  manualHardStopReason?: string;
}

export interface QualificationResult {
  totalScore: number;
  breakdown: {
    paymentVerifiedScore: number;
    spendScore: number;
    hireRateScore: number;
    budgetFitScore: number;
    skillsMatchScore: number;
    competitionScore: number;
  };
  hardStopTriggered: boolean;
  hardStopReason?: string;
  passed: boolean;
}

export const MINIMUM_PASSING_SCORE = 65;
export const MIN_FIXED_BUDGET_CENTS = 20000; // $200.00
export const MIN_HOURLY_RATE_CENTS = 2500; // $25.00/hr

export function evaluateQualification(input: QualificationInput): QualificationResult {
  // Check automatic hard-stops
  if (input.manualHardStop) {
    return {
      totalScore: 0,
      breakdown: {
        paymentVerifiedScore: 0,
        spendScore: 0,
        hireRateScore: 0,
        budgetFitScore: 0,
        skillsMatchScore: 0,
        competitionScore: 0,
      },
      hardStopTriggered: true,
      hardStopReason: input.manualHardStopReason || "Disqualified via manual hard-stop rule",
      passed: false,
    };
  }

  // Hard stop rule 1: Unverified client with $0 spend and 0% hire rate
  if (!input.clientPaymentVerified && input.clientSpendCents === 0 && input.clientHireRatePercent === 0) {
    return {
      totalScore: 0,
      breakdown: {
        paymentVerifiedScore: 0,
        spendScore: 0,
        hireRateScore: 0,
        budgetFitScore: 0,
        skillsMatchScore: 0,
        competitionScore: 0,
      },
      hardStopTriggered: true,
      hardStopReason: "Unverified client with $0 spend and zero hire rate history",
      passed: false,
    };
  }

  // Hard stop rule 2: Budget below minimum economic threshold
  if (input.isHourly) {
    const rate = input.hourlyRateMaxCents ?? input.hourlyRateMinCents ?? 0;
    if (rate > 0 && rate < MIN_HOURLY_RATE_CENTS) {
      return {
        totalScore: 0,
        breakdown: {
          paymentVerifiedScore: 0,
          spendScore: 0,
          hireRateScore: 0,
          budgetFitScore: 0,
          skillsMatchScore: 0,
          competitionScore: 0,
        },
        hardStopTriggered: true,
        hardStopReason: `Hourly rate of $${(rate / 100).toFixed(2)} is below minimum agency threshold ($25.00/hr)`,
        passed: false,
      };
    }
  } else if (input.budgetAmountCents !== undefined && input.budgetAmountCents > 0 && input.budgetAmountCents < MIN_FIXED_BUDGET_CENTS) {
    return {
      totalScore: 0,
      breakdown: {
        paymentVerifiedScore: 0,
        spendScore: 0,
        hireRateScore: 0,
        budgetFitScore: 0,
        skillsMatchScore: 0,
        competitionScore: 0,
      },
      hardStopTriggered: true,
      hardStopReason: `Fixed budget of $${(input.budgetAmountCents / 100).toFixed(2)} is below minimum agency threshold ($200.00)`,
      passed: false,
    };
  }

  // Calculate scores
  const paymentVerifiedScore = input.clientPaymentVerified ? 20 : 0;

  // Client Spend Scoring (up to 25 pts)
  let spendScore = 0;
  if (input.clientSpendCents >= 1000000) { // $10,000+
    spendScore = 25;
  } else if (input.clientSpendCents >= 100000) { // $1,000+
    spendScore = 15;
  } else if (input.clientSpendCents > 0) {
    spendScore = 5;
  }

  // Hire rate scoring (up to 20 pts)
  let hireRateScore = 0;
  if (input.clientHireRatePercent >= 50) {
    hireRateScore = 20;
  } else if (input.clientHireRatePercent >= 30) {
    hireRateScore = 10;
  }

  // Budget fit (clamped to 0 - 20)
  const budgetFitScore = Math.max(0, Math.min(20, Math.round(input.budgetFitScore)));

  // Skills match (clamped to 0 - 20)
  const skillsMatchScore = Math.max(0, Math.min(20, Math.round(input.skillsMatchScore)));

  // Competition score (clamped to 0 - 15)
  const competitionScore = Math.max(0, Math.min(15, Math.round(input.proposalCompetitionScore)));

  const totalScore = Math.min(
    100,
    paymentVerifiedScore + spendScore + hireRateScore + budgetFitScore + skillsMatchScore + competitionScore
  );

  const passed = totalScore >= MINIMUM_PASSING_SCORE;

  return {
    totalScore,
    breakdown: {
      paymentVerifiedScore,
      spendScore,
      hireRateScore,
      budgetFitScore,
      skillsMatchScore,
      competitionScore,
    },
    hardStopTriggered: false,
    passed,
  };
}
