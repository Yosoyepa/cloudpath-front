export type Degraded = boolean;
export type Examdate = string | null;
export type ExperienceLevel = "none" | "beginner" | "intermediate" | "advanced";
/**
 * @maxItems 4
 */
export type Gaps = [] | [Domain] | [Domain, Domain] | [Domain, Domain, Domain] | [Domain, Domain, Domain, Domain];
export type Domain =
  "cloud_concepts" | "security_and_compliance" | "cloud_technology_and_services" | "billing_pricing_and_support";
export type Goal = string;
/**
 * @minItems 1
 * @maxItems 4
 */
export type Preferredformats =
  | [LearningFormat]
  | [LearningFormat, LearningFormat]
  | [LearningFormat, LearningFormat, LearningFormat]
  | [LearningFormat, LearningFormat, LearningFormat, LearningFormat];
export type LearningFormat = "video" | "text" | "practice" | "oral_explanation";
/**
 * @maxItems 4
 */
export type Strengths = [] | [Domain] | [Domain, Domain] | [Domain, Domain, Domain] | [Domain, Domain, Domain, Domain];
export type Weeklyminutes = number;
export type Activenodeid = string | null;
export type Source = string;
export type Target = string;
/**
 * @maxItems 48
 */
export type Edges = LearningEdge[];
/**
 * @minItems 1
 * @maxItems 24
 */
export type Nodes = [LearningNode, ...LearningNode[]];
export type Durationminutes = number;
export type Id = string;
export type Mastery = number;
/**
 * @maxItems 6
 */
export type Prerequisites =
  | []
  | [string]
  | [string, string]
  | [string, string, string]
  | [string, string, string, string]
  | [string, string, string, string, string]
  | [string, string, string, string, string, string];
/**
 * @maxItems 5
 */
export type Sourcerefs =
  | []
  | [SourceRef]
  | [SourceRef, SourceRef]
  | [SourceRef, SourceRef, SourceRef]
  | [SourceRef, SourceRef, SourceRef, SourceRef]
  | [SourceRef, SourceRef, SourceRef, SourceRef, SourceRef];
export type Cached = boolean;
export type Provider = string;
export type Retrievedat = string;
export type Title = string;
export type Url = string;
export type NodeStatus = "locked" | "available" | "in_progress" | "mastered" | "needs_review";
export type Title1 = string;
export type Routeversion = number;
export type Source1 = "claude" | "minimax" | "deterministic";

export interface ProfileResponse {
  degraded: Degraded;
  profile: LearnerProfile;
  route: RouteState;
  source: Source1;
}
export interface LearnerProfile {
  examDate?: Examdate;
  experienceLevel: ExperienceLevel;
  gaps?: Gaps;
  goal: Goal;
  preferredFormats: Preferredformats;
  strengths?: Strengths;
  weeklyMinutes: Weeklyminutes;
}
export interface RouteState {
  activeNodeId?: Activenodeid;
  edges?: Edges;
  nodes: Nodes;
  routeVersion: Routeversion;
}
export interface LearningEdge {
  source: Source;
  target: Target;
}
export interface LearningNode {
  domain: Domain;
  durationMinutes: Durationminutes;
  format: LearningFormat;
  id: Id;
  mastery: Mastery;
  prerequisites?: Prerequisites;
  sourceRefs?: Sourcerefs;
  status: NodeStatus;
  title: Title1;
}
export interface SourceRef {
  cached: Cached;
  provider: Provider;
  retrievedAt: Retrievedat;
  title: Title;
  url: Url;
}
