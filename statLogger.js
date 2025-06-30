const fs = require("fs");
const stat = { ffmpeg: 0, stt: 0, client: 0 };

module.exports = {
  addFfmepg(bytes) {
    stat.ffmpeg += bytes;
  },
  addSttEvent() {
    stat.stt += 1;
  },
  addClient(bytes) {
    stat.client += bytes;
  },
  flush: function () {
    const now = Math.floor(Date.now() / 1000);
    const line = `${now} ${stat.ffmpeg} ${stat.stt} ${stat.client} \n`;
    fs.appendFileSync("pipeline_stats.txt", line);
    stat.ffmpeg = 0;
    stat.stt = 0;
    stat.client = 0;
  },
};
