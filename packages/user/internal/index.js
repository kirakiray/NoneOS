import rtcOfferHandler from "./rtc-offer.js";
import rtcAnswerHandler from "./rtc-answer.js";
import rtcIceCandidateHandler from "./rtc-ice-candidate.js";
import rtcOfferErrorHandler from "./rtc-offer-error.js";
import fsAgent from "./fs-agent.js";
import receiveObserve from "./fs-receive-observe.js";
import getCard from "./get-card.js";
import updateUserCard from "./update-user-card.js";
import trigger from "./trigger.js";
import { ping, pong } from "./ping-pong.js";

// 内部操作相关的函数
export default {
  "rtc-offer": rtcOfferHandler,
  "rtc-offer-error": rtcOfferErrorHandler,
  "rtc-answer": rtcAnswerHandler,
  "rtc-ice-candidate": rtcIceCandidateHandler,
  "fs-agent": fsAgent,
  "receive-observe": receiveObserve,
  "get-card": getCard,
  "update-user-card": updateUserCard,
  trigger: trigger,
  ping: ping,
  pong: pong,
};
