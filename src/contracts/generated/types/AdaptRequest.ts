/**
 * @minItems 1
 * @maxItems 6
 */
export type Attempts =
  | [Attempt]
  | [Attempt, Attempt]
  | [Attempt, Attempt, Attempt]
  | [Attempt, Attempt, Attempt, Attempt]
  | [Attempt, Attempt, Attempt, Attempt, Attempt]
  | [Attempt, Attempt, Attempt, Attempt, Attempt, Attempt];
export type Answer = string;
/**
 * Only two levels exist so the deterministic matrix stays exhaustive.
 */
export type Confidence = "low" | "high";
export type Correct = boolean;
export type Createdat = string;
export type Hintsused = number;
export type Nodeid = string;
export type Responsetimems = number;
/**
 * @minItems 1
 * @maxItems 24
 */
export type Nodeids = [string, ...string[]];
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
export type Routeversion = number;

export interface AdaptRequest {
  attempts: Attempts;
  nodeIds: Nodeids;
  profile: LearnerProfile;
  routeVersion: Routeversion;
}
export interface Attempt {
  answer: Answer;
  confidence: Confidence;
  correct: Correct;
  createdAt: Createdat;
  hintsUsed: Hintsused;
  nodeId: Nodeid;
  responseTimeMs: Responsetimems;
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
