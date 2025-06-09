export interface SessionClaims {
  admin?: boolean;
  tester?: boolean;
  beta?: boolean;
}

export interface SessionData extends SessionClaims {
  uid: string | null;
}
