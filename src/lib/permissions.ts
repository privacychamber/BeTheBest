import { UserRole } from "@/types";

export type PermissionAction =
  | "user:manage"
  | "budget:approve_topup"
  | "budget:allocate_initial"
  | "budget:request_topup"
  | "profile:clear_review"
  | "profile:create"
  | "profile:view_all"
  | "opportunity:create"
  | "opportunity:assign"
  | "opportunity:qualify"
  | "proposal:create"
  | "contract:manage"
  | "handover:manage"
  | "finance:view_roi"
  | "finance:record";

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  ADMIN: [
    "user:manage",
    "budget:approve_topup",
    "budget:allocate_initial",
    "budget:request_topup",
    "profile:clear_review",
    "profile:create",
    "profile:view_all",
    "opportunity:create",
    "opportunity:assign",
    "opportunity:qualify",
    "proposal:create",
    "contract:manage",
    "handover:manage",
    "finance:view_roi",
    "finance:record",
  ],
  BIDDER: [
    "budget:request_topup",
    "opportunity:create",
    "opportunity:qualify",
    "proposal:create",
  ],
  COORDINATOR: [
    "profile:view_all",
    "contract:manage",
    "handover:manage",
    "finance:record",
  ],
};

export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(action);
}

export function assertPermission(role: UserRole, action: PermissionAction): void {
  if (!hasPermission(role, action)) {
    throw new Error(`Forbidden: Role '${role}' lacks permission for '${action}'`);
  }
}
