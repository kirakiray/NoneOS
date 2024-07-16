import { Hct } from "./hct/hct.js";

// material v3 主要的颜色阶段
const gloPoints = [100, 98, 95, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

export const getColors = (color, points = gloPoints) => {
  const hctObj = new Hct(parseInt(`0xff${color.replace("#", "")}`));

  return points.map((tone) => {
    const newObj = Hct.from(hctObj.hue, hctObj.chroma, tone);

    return `#${newObj.toInt().toString(16).replace(/^ff/, "")}`;
  });
};

export { Hct };
