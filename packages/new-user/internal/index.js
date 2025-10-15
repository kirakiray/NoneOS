import rtcOfferHandler from "./rtc-offer.js";
import rtcAnswerHandler from "./rtc-answer.js";
import rtcIceCandidateHandler from "./rtc-ice-candidate.js";
import rtcOfferErrorHandler from "./rtc-offer-error.js";
import fsAgent from "./fs-agent.js";
import receiveObserve from "./fs-receive-observe.js";

// 内部操作相关的函数
export default {
  "rtc-offer": rtcOfferHandler,
  "rtc-offer-error": rtcOfferErrorHandler,
  "rtc-answer": rtcAnswerHandler,
  "rtc-ice-candidate": rtcIceCandidateHandler,
  "fs-agent": fsAgent,
  "receive-observe": receiveObserve,
};
