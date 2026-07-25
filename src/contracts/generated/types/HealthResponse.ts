export type Certification = string;
export type ProviderName = "gemini_live" | "claude" | "minimax" | "aws_knowledge_mcp";
export type ProviderState = "ready" | "degraded" | "unavailable" | "not_configured";
export type Providers = ProviderStatus[];
export type Status = "ok" | "degraded";
export type Version = string;

export interface HealthResponse {
  certification: Certification;
  providers: Providers;
  status: Status;
  version: Version;
}
export interface ProviderStatus {
  provider: ProviderName;
  state: ProviderState;
}
