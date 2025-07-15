const logger = require("../util/logger");

const initSttStream = (session) => {
  logger.info(`session speechClient: ${session.speechClient}`);
  const request = {
    config: {
      encoding: "LINEAR16",
      sampleRateHertz: 16000,
      languageCode: "ko-KR",
      enableAutomaticPunctuation: true,
      useEnhanced: true,
      model: "latest_long",
    },
    interimResults: true,
    singleUtterance: false,
  };

  try {
    session.recognizeStream = session.speechClient
      .streamingRecognize(request)
      .on("data", (data) => {
        if (data.results[0]?.alternatives[0]) {
          const transcript = data.results[0].alternatives[0].transcript;
          const isFinal = data.results[0]?.isFinal;

          session.transcriptManager.getTranscript(transcript, isFinal);
        }
      })
      .on("error", (err) => {
        logger.error(new Error(`recog stream error : ${err}`));
        session._handleError(err);
      })
      .on("end", (code) => session._handleEnd(code));
  } catch (err) {
    logger.error(new Error(`recognizseStream create error ${err}`));
  }
};

module.exports = { initSttStream };
