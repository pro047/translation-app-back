const ENDINGS = [".", "?", "!", "입니다.", "합니다.", "다."];
const TIMEOUT_MS = 3000;

class TranscriptManager {
  constructor(pushFn) {
    this.lastPushed = "";
    this.currentTranscript = "";
    this.lastNormalized = "";
    this.pushFn = pushFn;
    this.timeout = null;
  }

  onTranscript(transcript, isFinal) {
    this.currentTranscript = transcript;

    if (!transcript.trim()) return;

    const isSentenceEnd = ENDINGS.some((e) => diff.trim().includes(e));

    if (isSentenceEnd || isFinal) {
      this.pushNow(isFinal);
    } else {
      this.armTimeout();
    }
  }

  armTimeout() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.pushNow(false);
    }, TIMEOUT_MS);
  }

  pushNow(isFinal) {
    let diff = this.currentTranscript;
    const normalCurrTrans = normalize(this.currentTranscript);
    const normalLastPushed = normalize(this.lastPushed);

    if (
      this.lastPushed.length > 0 &&
      normalCurrTrans.includes(normalLastPushed)
    ) {
      const idx = normalCurrTrans.indexOf(normalLastPushed);
      diff = normalCurrTrans.slice(idx + normalLastPushed.length);
    }

    const normalDiff = normalize(diff).trim();

    console.log(
      `➡️ normalCurrTrans : ${normalCurrTrans} \n➡️ normalDiff : ${normalDiff} \n➡️ norLast : ${normalLastPushed}`
    );

    if (!diff || diff.trim() === "") {
      console.log("skip ⏭️");
      return;
    }

    if (normalDiff.length < 5 || normalDiff === this.lastNormalized) {
      console.log(
        `❌ 조건 미충족으로 푸쉬 생략 \n➡️ normal diff : ${normalDiff} - len : ${normalDiff.length} `
      );
      return;
    }

    this.pushFn({ transcript: normalDiff, isFinal });
    console.log(`🫸 pushed ➡️ ${normalDiff}`);

    if (isFinal) {
      console.log("‼️ pushed due to isFinal true");
    }

    this.lastPushed = this.currentTranscript;
    this.lastNormalized = normalDiff;

    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
  }
}

function normalize(text) {
  return text
    .trim()
    .replace(/[\s]+/g, " ")
    .replace(/[.!?]+$/, "");
}

module.exports = { TranscriptManager };
