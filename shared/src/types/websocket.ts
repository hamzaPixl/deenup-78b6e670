// shared/src/types/websocket.ts
// WebSocket event name constants — used by both backend and mobile/web clients

/**
 * Events emitted FROM the client TO the server
 */
export const CLIENT_EVENTS = {
  // Matchmaking
  JOIN_QUEUE: 'match:join_queue',
  LEAVE_QUEUE: 'match:leave_queue',

  // In-match
  SUBMIT_ANSWER: 'match:submit_answer',
  REQUEST_REMATCH: 'match:request_rematch',
  ACCEPT_REMATCH: 'match:accept_rematch',
  DECLINE_REMATCH: 'match:decline_rematch',
  ABANDON_MATCH: 'match:abandon',
} as const;

/**
 * Events emitted FROM the server TO the client
 */
export const SERVER_EVENTS = {
  // Matchmaking
  QUEUE_JOINED: 'match:queue_joined',
  QUEUE_LEFT: 'match:queue_left',
  MATCH_FOUND: 'match:found',
  QUEUE_TIMEOUT: 'match:queue_timeout',

  // Match lifecycle
  MATCH_STARTED: 'match:started',
  MATCH_ENDED: 'match:ended',
  MATCH_ABANDONED: 'match:abandoned',

  // Questions
  QUESTION_START: 'match:question_start',
  QUESTION_REVEAL: 'match:question_reveal',
  OPPONENT_ANSWERED: 'match:opponent_answered',

  // Answers
  ANSWER_ACCEPTED: 'match:answer_accepted',

  // Rematch
  REMATCH_REQUESTED: 'match:rematch_requested',
  REMATCH_ACCEPTED: 'match:rematch_accepted',
  REMATCH_DECLINED: 'match:rematch_declined',

  // Errors
  ERROR: 'match:error',
} as const;

export type ClientEventName = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
export type ServerEventName = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
