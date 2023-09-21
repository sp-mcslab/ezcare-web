export type EventResult<T> = EventSuccessResult<T> | EventFailureResult;

export interface EventSuccessResult<T> {
  readonly type: "success";
  data?: T;
}

export interface EventFailureResult {
  readonly type: "failure";
  readonly message: string;
}
