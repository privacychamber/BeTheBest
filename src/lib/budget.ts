// Budget Calculation, Weekly Allocation, and Top-Up Guard Logic

export const INITIAL_ALLOCATION_MAX = 300;
export const THURSDAY_TOP_UP_MAX = 200;
export const WEEKLY_CAP_MAX = 500;

export interface BudgetPeriodValidationInput {
  initialAllocation: number;
  topUpAmount: number;
  profileStatus: "ACTIVE" | "REVIEW_REQUIRED" | "PAUSED";
  profileName?: string;
  isRestrictedReviewRequired?: boolean;
}

export function validateInitialAllocation(
  amount: number,
  profileStatus: string,
  profileName?: string,
  isCleared?: boolean
): { valid: boolean; error?: string } {
  const isRakesh = profileName?.toLowerCase().includes("rakesh");
  const isRestricted = profileStatus === "REVIEW_REQUIRED" || (isRakesh && !isCleared);

  if (isRestricted) {
    return {
      valid: false,
      error: "Profile is in 'Review required' status. New budget release is blocked until explicit clearance is granted by a manager.",
    };
  }

  if (profileStatus === "PAUSED") {
    return {
      valid: false,
      error: "Profile is paused. Cannot allocate budget.",
    };
  }

  if (amount < 1) {
    return {
      valid: false,
      error: "Allocation must be at least 1 connect.",
    };
  }

  if (amount > INITIAL_ALLOCATION_MAX) {
    return {
      valid: false,
      error: `Initial weekly allocation cannot exceed ${INITIAL_ALLOCATION_MAX} connects.`,
    };
  }

  return { valid: true };
}

export function validateTopUpRequest(
  requestedAmount: number,
  currentInitial: number,
  profileStatus: string
): { valid: boolean; error?: string } {
  if (profileStatus !== "ACTIVE") {
    return {
      valid: false,
      error: `Cannot request top-up: profile status is ${profileStatus}.`,
    };
  }

  if (requestedAmount < 1) {
    return {
      valid: false,
      error: "Top-up request must be at least 1 connect.",
    };
  }

  if (requestedAmount > THURSDAY_TOP_UP_MAX) {
    return {
      valid: false,
      error: `Thursday top-up cannot exceed ${THURSDAY_TOP_UP_MAX} connects.`,
    };
  }

  if (currentInitial + requestedAmount > WEEKLY_CAP_MAX) {
    return {
      valid: false,
      error: `Total weekly allocation cannot exceed ${WEEKLY_CAP_MAX} connects. Current allocation is ${currentInitial}.`,
    };
  }

  return { valid: true };
}

export function validateTopUpApproval(
  approverRole: string,
  currentInitial: number,
  approvedAmount: number,
  profileStatus: string
): { valid: boolean; error?: string } {
  if (approverRole !== "ADMIN") {
    return {
      valid: false,
      error: "Authorization failed: Only an Administrator or BD Lead can approve top-up requests.",
    };
  }

  if (profileStatus !== "ACTIVE") {
    return {
      valid: false,
      error: `Cannot approve top-up for profile with status ${profileStatus}.`,
    };
  }

  if (approvedAmount > THURSDAY_TOP_UP_MAX) {
    return {
      valid: false,
      error: `Top-up approval cannot exceed ${THURSDAY_TOP_UP_MAX} connects.`,
    };
  }

  if (currentInitial + approvedAmount > WEEKLY_CAP_MAX) {
    return {
      valid: false,
      error: `Combined weekly allocation would exceed the strict ${WEEKLY_CAP_MAX} cap.`,
    };
  }

  return { valid: true };
}

/**
 * Returns Monday (YYYY-MM-DD) for a given date in local calendar time
 */
export function getMondayOfWeek(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  // day: 0 is Sun, 1 is Mon, ..., 6 is Sat
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.getFullYear(), date.getMonth(), diff);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const dayStr = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}`;
}

/**
 * Returns Sunday (YYYY-MM-DD) for a given date in local calendar time
 */
export function getSundayOfWeek(d: Date = new Date()): string {
  const mondayStr = getMondayOfWeek(d);
  const [y, m, day] = mondayStr.split("-").map(Number);
  const sunday = new Date(y, m - 1, day + 6);
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, "0");
  const dayStr = String(sunday.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}`;
}
