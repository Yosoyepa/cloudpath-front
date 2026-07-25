export type Diagnosis = string;
/**
 * @maxItems 4
 */
export type Operations =
  | []
  | [
      | InsertNodeOperation
      | ReinforceNodeOperation
      | UnlockNodeOperation
      | ReorderAfterOperation
      | ReplaceFormatOperation
    ]
  | [
      (
        | InsertNodeOperation
        | ReinforceNodeOperation
        | UnlockNodeOperation
        | ReorderAfterOperation
        | ReplaceFormatOperation
      ),
      (
        | InsertNodeOperation
        | ReinforceNodeOperation
        | UnlockNodeOperation
        | ReorderAfterOperation
        | ReplaceFormatOperation
      )
    ]
  | [
      (
        | InsertNodeOperation
        | ReinforceNodeOperation
        | UnlockNodeOperation
        | ReorderAfterOperation
        | ReplaceFormatOperation
      ),
      (
        | InsertNodeOperation
        | ReinforceNodeOperation
        | UnlockNodeOperation
        | ReorderAfterOperation
        | ReplaceFormatOperation
      ),
      (
        | InsertNodeOperation
        | ReinforceNodeOperation
        | UnlockNodeOperation
        | ReorderAfterOperation
        | ReplaceFormatOperation
      )
    ]
  | [
      (
        | InsertNodeOperation
        | ReinforceNodeOperation
        | UnlockNodeOperation
        | ReorderAfterOperation
        | ReplaceFormatOperation
      ),
      (
        | InsertNodeOperation
        | ReinforceNodeOperation
        | UnlockNodeOperation
        | ReorderAfterOperation
        | ReplaceFormatOperation
      ),
      (
        | InsertNodeOperation
        | ReinforceNodeOperation
        | UnlockNodeOperation
        | ReorderAfterOperation
        | ReplaceFormatOperation
      ),
      (
        | InsertNodeOperation
        | ReinforceNodeOperation
        | UnlockNodeOperation
        | ReorderAfterOperation
        | ReplaceFormatOperation
      )
    ];
export type Afternodeid = string;
export type Domain =
  "cloud_concepts" | "security_and_compliance" | "cloud_technology_and_services" | "billing_pricing_and_support";
export type Durationminutes = number;
export type LearningFormat = "video" | "text" | "practice" | "oral_explanation";
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
export type Type = "insert_node";
export type Masterydelta = number;
export type Nodeid = string;
export type Type1 = "reinforce_node";
export type Nodeid1 = string;
export type Type2 = "unlock_node";
export type Afternodeid1 = string;
export type Nodeid2 = string;
export type Type3 = "reorder_after";
export type Nodeid3 = string;
export type Type4 = "replace_format";
export type Rationale = string;
export type Requestrouteversion = number;
/**
 * @maxItems 5
 */
export type Sourcerefs1 =
  | []
  | [SourceRef]
  | [SourceRef, SourceRef]
  | [SourceRef, SourceRef, SourceRef]
  | [SourceRef, SourceRef, SourceRef, SourceRef]
  | [SourceRef, SourceRef, SourceRef, SourceRef, SourceRef];
export type Degraded = boolean;
export type Source = "claude" | "minimax" | "deterministic";

export interface AdaptResponse {
  decision: AdaptationDecision;
  degraded: Degraded;
  source: Source;
}
export interface AdaptationDecision {
  diagnosis: Diagnosis;
  operations: Operations;
  rationale: Rationale;
  requestRouteVersion: Requestrouteversion;
  sourceRefs?: Sourcerefs1;
}
export interface InsertNodeOperation {
  afterNodeId: Afternodeid;
  node: LearningNode;
  type: Type;
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
export interface ReinforceNodeOperation {
  masteryDelta: Masterydelta;
  nodeId: Nodeid;
  type: Type1;
}
export interface UnlockNodeOperation {
  nodeId: Nodeid1;
  type: Type2;
}
export interface ReorderAfterOperation {
  afterNodeId: Afternodeid1;
  nodeId: Nodeid2;
  type: Type3;
}
export interface ReplaceFormatOperation {
  format: LearningFormat;
  nodeId: Nodeid3;
  type: Type4;
}
