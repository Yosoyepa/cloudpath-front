export type Nodeid = string;
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

export interface LessonRequest {
  nodeId: Nodeid;
  profile: LearnerProfile;
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
