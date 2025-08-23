import { elementToLetterData, letterDataToElement } from "./range.js";
import { blockComps } from "../block/config.js";

export const htmlToItemData = async (pastedHtml) => {
  const temp = $(`<template>${pastedHtml}</template>`).ele;

  const contents = [];

  // 直接单标签开头
  if (/^</.test(pastedHtml.trim())) {
    for (let item of temp.content.children) {
      const reContent = await elementToLetterData(item);

      const tag = item.tagName.toLowerCase();

      if (tag === "p" || tag === "h2" || tag === "h3" || tag === "h4") {
        const type = tag === "p" ? "paragraph" : tag;

        contents.push({
          type,
          value: await letterDataToElement(reContent),
        });
      } else if (tag === "code") {
        contents.push({
          type: "lumi-code",
          value: item.innerHTML,
        });
      } else {
        const tag = item.tagName.toLowerCase();

        if (blockComps.find((e) => e.tag === tag)) {
          const attrs = {};

          let tab = 0;

          for (let e of item.attributes) {
            if (e.name === "data-tabcount") {
              tab = parseInt(e.value);
              continue;
            }
            attrs[e.name] = e.value;
          }

          const obj = {
            type: tag,
            attrs,
            value: await letterDataToElement(reContent),
          };

          if (tab) {
            obj.tab = tab;
          }

          contents.push(obj);
        } else {
          // 不明类型全部填充为段落
          contents.push({
            type: "paragraph",
            value: await letterDataToElement(reContent),
          });
        }
      }
    }

    return contents;
  }
};
