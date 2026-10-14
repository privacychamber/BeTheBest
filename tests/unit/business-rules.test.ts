import { describe, it, expect } from "vitest";
import {
  evaluateQualification,
  MINIMUM_PASSING_SCORE,
  MIN_FIXED_BUDGET_CENTS,
  MIN_HOURLY_RATE_CENTS,
} from "../../src/lib/scoring";
import {
  validateInitialAllocation,
  validateTopUpRequest,
  validateTopUpApproval,
  getMondayOfWeek,
  getSundayOfWeek,
  INITIAL_ALLOCATION_MAX,
  THURSDAY_TOP_UP_MAX,
  WEEKLY_CAP_MAX,
} from "../../src/lib/budget";
import {
  calculateFunnelRates,
  calculateAcquisitionCostCents,
  calculateRoi,
} from "../../src/lib/metrics";
import { hasPermission, assertPermission } from "../../src/lib/permissions";

describe("Job Qualification Scoring & Hard-Stop Rules", () => {
  it("scores verified client with high spend, high hire rate, and good fit correctly", () => {
    const result = evaluateQualification({
      clientPaymentVerified: true, // 20
      clientSpendCents: 1500000, // $15,000 -> 25
      clientHireRatePercent: 65, // >= 50% -> 20
      budgetFitScore: 18, // 18
      skillsMatchScore: 19, // 19
      proposalCompetitionScore: 10, // 10
      budgetAmountCents: 500000, // $5,000
    });

    expect(result.hardStopTriggered).toBe(false);
    expect(result.totalScore).toBe(100); // capped at 100
    expect(result.passed).toBe(true);
    expect(result.breakdown.paymentVerifiedScore).toBe(20);
    expect(result.breakdown.spendScore).toBe(25);
    expect(result.breakdown.hireRateScore).toBe(20);
  });

  it("fails qualification if total score is below minimum threshold (65)", () => {
    const result = evaluateQualification({
      clientPaymentVerified: true, // 20
      clientSpendCents: 50000, // $500 -> 5
      clientHireRatePercent: 20, // < 30% -> 0
      budgetFitScore: 10, // 10
      skillsMatchScore: 10, // 10
      proposalCompetitionScore: 5, // 5
      budgetAmountCents: 30000, // $300
    });

    // 20 + 5 + 0 + 10 + 10 + 5 = 50
    expect(result.totalScore).toBe(50);
    expect(result.passed).toBe(false);
    expect(result.hardStopTriggered).toBe(false);
  });

  it("triggers hard-stop for unverified client with $0 spend and 0% hire rate", () => {
    const result = evaluateQualification({
      clientPaymentVerified: false,
      clientSpendCents: 0,
      clientHireRatePercent: 0,
      budgetFitScore: 20,
      skillsMatchScore: 20,
      proposalCompetitionScore: 15,
      budgetAmountCents: 50000,
    });

    expect(result.hardStopTriggered).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.hardStopReason).toContain("Unverified client with $0 spend");
  });

  it("triggers hard-stop for fixed budget below minimum agency floor ($200)", () => {
    const result = evaluateQualification({
      clientPaymentVerified: true,
      clientSpendCents: 2000000,
      clientHireRatePercent: 80,
      budgetFitScore: 20,
      skillsMatchScore: 20,
      proposalCompetitionScore: 15,
      budgetAmountCents: 15000, // $150.00
    });

    expect(result.hardStopTriggered).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.hardStopReason).toContain("below minimum agency threshold");
  });

  it("triggers hard-stop for hourly rate below minimum agency floor ($25/hr)", () => {
    const result = evaluateQualification({
      clientPaymentVerified: true,
      clientSpendCents: 5000000,
      clientHireRatePercent: 90,
      budgetFitScore: 20,
      skillsMatchScore: 20,
      proposalCompetitionScore: 15,
      isHourly: true,
      hourlyRateMinCents: 1500, // $15/hr
      hourlyRateMaxCents: 2000, // $20/hr
    });

    expect(result.hardStopTriggered).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.hardStopReason).toContain("Hourly rate of $20.00 is below minimum agency threshold");
  });
});

describe("Upwork Budget Limits & Top-Up Approvals", () => {
  it("permits initial allocation up to 300 connects for active profiles", () => {
    const valid = validateInitialAllocation(300, "ACTIVE");
    expect(valid.valid).toBe(true);
  });

  it("rejects initial allocation exceeding 300 connects", () => {
    const invalid = validateInitialAllocation(350, "ACTIVE");
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toContain("cannot exceed 300 connects");
  });

  it("strictly prevents budget release for profile marked 'Review required' or named 'Rakesh'", () => {
    const blockedStatus = validateInitialAllocation(200, "REVIEW_REQUIRED");
    expect(blockedStatus.valid).toBe(false);
    expect(blockedStatus.error).toContain("Review required");

    const blockedName = validateInitialAllocation(150, "ACTIVE", "Rakesh Sharma");
    expect(blockedName.valid).toBe(false);
    expect(blockedName.error).toContain("Review required");
  });

  it("validates Thursday top-up request within 200 connects and 500 weekly cap", () => {
    // 300 initial + 150 top-up = 450 (<= 500)
    const valid = validateTopUpRequest(150, 300, "ACTIVE");
    expect(valid.valid).toBe(true);
  });

  it("rejects Thursday top-up request exceeding 200 connects", () => {
    const invalid = validateTopUpRequest(250, 200, "ACTIVE");
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toContain("cannot exceed 200 connects");
  });

  it("rejects Thursday top-up request that breaches the 500 weekly cap", () => {
    // 350 current + 180 request = 530 (> 500)
    const invalid = validateTopUpRequest(180, 350, "ACTIVE");
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toContain("cannot exceed 500 connects");
  });

  it("allows only ADMIN to approve Thursday top-up", () => {
    const bidderAttempt = validateTopUpApproval("BIDDER", 300, 100, "ACTIVE");
    expect(bidderAttempt.valid).toBe(false);
    expect(bidderAttempt.error).toContain("Only an Administrator or BD Lead can approve");

    const adminAttempt = validateTopUpApproval("ADMIN", 300, 100, "ACTIVE");
    expect(adminAttempt.valid).toBe(true);
  });
});

describe("Date and Reporting-Period Boundaries", () => {
  it("determines Monday as week start and Sunday as week end correctly", () => {
    // 2026-10-14 is a Wednesday
    const wednesday = new Date("2026-10-14T12:00:00Z");
    const monday = getMondayOfWeek(wednesday);
    const sunday = getSundayOfWeek(wednesday);

    expect(monday).toBe("2026-10-12");
    expect(sunday).toBe("2026-10-18");
  });
});

describe("Funnel Metrics, Acquisition Cost, and ROI Calculations", () => {
  it("calculates funnel conversion rates accurately", () => {
    const rates = calculateFunnelRates({
      submitted: 50,
      viewed: 25,
      responded: 15,
      interviewed: 10,
      won: 4,
    });

    expect(rates.viewRatePercent).toBe(50);
    expect(rates.responseRatePercent).toBe(30);
    expect(rates.interviewRatePercent).toBe(20);
    expect(rates.winRatePercent).toBe(8);
  });

  it("calculates acquisition costs in integer cents", () => {
    const acq = calculateAcquisitionCostCents({
      totalConnectsSpent: 1000, // 1000 * 15 cents = 15000 cents ($150)
      directCostsCents: 35000, // $350
      wonDealsCount: 2,
    });

    expect(acq.totalCostCents).toBe(50000); // $500 total
    expect(acq.costPerWonDealCents).toBe(25000); // $250 per deal
  });

  it("computes net profit, ROI, and profit margin correctly", () => {
    const roi = calculateRoi({
      revenueCents: 1000000, // $10,000 revenue
      directCostCents: 200000, // $2,000 direct cost
      connectsSpent: 1000, // 1000 * 15 = $150
    });

    const expectedCost = 200000 + 15000; // 215000
    const expectedProfit = 1000000 - 215000; // 785000
    expect(roi.totalCostCents).toBe(expectedCost);
    expect(roi.netProfitCents).toBe(expectedProfit);
    expect(roi.roiPercent).toBeCloseTo(365.12, 1);
    expect(roi.profitMarginPercent).toBe(78.5);
  });
});

describe("Role-Based Permission Matrix", () => {
  it("grants ADMIN full management capabilities", () => {
    expect(hasPermission("ADMIN", "budget:approve_topup")).toBe(true);
    expect(hasPermission("ADMIN", "profile:clear_review")).toBe(true);
    expect(hasPermission("ADMIN", "finance:view_roi")).toBe(true);
  });

  it("prevents BIDDER from approving budget increases or clearing reviews", () => {
    expect(hasPermission("BIDDER", "budget:approve_topup")).toBe(false);
    expect(hasPermission("BIDDER", "profile:clear_review")).toBe(false);
    expect(hasPermission("BIDDER", "budget:allocate_initial")).toBe(false);
    expect(() => assertPermission("BIDDER", "budget:approve_topup")).toThrow("Forbidden");
  });

  it("allows BIDDER to create opportunities and submit proposals", () => {
    expect(hasPermission("BIDDER", "opportunity:create")).toBe(true);
    expect(hasPermission("BIDDER", "proposal:create")).toBe(true);
    expect(hasPermission("BIDDER", "budget:request_topup")).toBe(true);
  });

  it("allows COORDINATOR to manage contracts and handovers", () => {
    expect(hasPermission("COORDINATOR", "contract:manage")).toBe(true);
    expect(hasPermission("COORDINATOR", "handover:manage")).toBe(true);
    expect(hasPermission("COORDINATOR", "budget:approve_topup")).toBe(false);
  });
});
