export interface ChatMessage {
  readonly id: string;
  readonly authorId: string;
  readonly content: string;
  /** ISO time string format */
  readonly sentAt: string;
}
