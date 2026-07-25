export type Degraded = boolean;
export type Activity = string;
export type Content = string;
export type LearningFormat = "video" | "text" | "practice" | "oral_explanation";
export type Nodeid = string;
export type Correctoptionindex = number;
export type Explanation = string;
export type Id = string;
/**
 * @minItems 2
 * @maxItems 5
 */
export type Options =
  | [string, string]
  | [string, string, string]
  | [string, string, string, string]
  | [string, string, string, string, string];
export type Prompt = string;
/**
 * @minItems 1
 * @maxItems 5
 */
export type Sourcerefs =
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
export type Title1 = string;
export type Source = "claude" | "minimax" | "aws_knowledge_mcp" | "local_catalog";

export interface LessonResponse {
  degraded: Degraded;
  lesson: Lesson;
  source: Source;
}
export interface Lesson {
  activity: Activity;
  content: Content;
  format: LearningFormat;
  nodeId: Nodeid;
  question: AssessmentQuestion;
  sourceRefs: Sourcerefs;
  title: Title1;
}
export interface AssessmentQuestion {
  correctOptionIndex: Correctoptionindex;
  explanation: Explanation;
  id: Id;
  options: Options;
  prompt: Prompt;
}
export interface SourceRef {
  cached: Cached;
  provider: Provider;
  retrievedAt: Retrievedat;
  title: Title;
  url: Url;
}
