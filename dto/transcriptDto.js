class TranscriptDTO {
  constructor({ sessionId, type, transcript }) {
    (this.sessionId = sessionId),
      (this.type = type),
      (this.transcript = transcript);
  }

  toJSON() {
    return {
      type: this.type,
      sessionId: this.sessionId,
      transcript: this.transcript,
    };
  }
}
