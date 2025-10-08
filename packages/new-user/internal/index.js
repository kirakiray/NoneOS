import rtcOfferHandler from "./rtc-offer.js";
import rtcAnswerHandler from "./rtc-answer.js";
import rtcIceCandidateHandler from "./rtc-ice-candidate.js";

// 内部操作相关的函数
export default {
  "rtc-offer": rtcOfferHandler,
  "rtc-answer": rtcAnswerHandler,
  "rtc-ice-candidate": rtcIceCandidateHandler,
};
