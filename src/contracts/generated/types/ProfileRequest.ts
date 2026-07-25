/**
 * @maxItems 6
 */
export type Answers =
  | []
  | [InterviewAnswer]
  | [InterviewAnswer, InterviewAnswer]
  | [InterviewAnswer, InterviewAnswer, InterviewAnswer]
  | [InterviewAnswer, InterviewAnswer, InterviewAnswer, InterviewAnswer]
  | [InterviewAnswer, InterviewAnswer, InterviewAnswer, InterviewAnswer, InterviewAnswer]
  | [InterviewAnswer, InterviewAnswer, InterviewAnswer, InterviewAnswer, InterviewAnswer, InterviewAnswer];
export type Answer = string;
export type Questionid = string;
export type Transcript = string;

export interface ProfileRequest {
  answers?: Answers;
  transcript?: Transcript;
}
export interface InterviewAnswer {
  answer: Answer;
  questionId: Questionid;
}
