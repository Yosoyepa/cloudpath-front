export type Degraded = boolean;
export type Expiresat = string;
export type Maxuses = number;
export type Model = string;
export type Token = string;

export interface VoiceTokenResponse {
  degraded: Degraded;
  expiresAt: Expiresat;
  maxUses: Maxuses;
  model: Model;
  token: Token;
}
