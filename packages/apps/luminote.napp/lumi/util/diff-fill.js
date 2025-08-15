// 对比填充
export const diffFill = ({ container, data, create, isEqual }) => {
  // 遍历子元素，如果不一致则进行修正
  let lastEl = null; // 最后一个添加进去的元素

  if (!data.length) {
    // 清空内容
    container.html = "";
    return;
  }

  if (!container.length) {
    const frag = $.frag();

    for (let i = 0, len = data.length; i < len; i++) {
      const item = data[i];
      const blockEl = create({ item });
      frag.push(blockEl);
    }

    container.push(frag);
    return;
  }

  for (let i = 0, len = data.length; i < len; i++) {
    const item = data[i];
    const currentEl = container[i];

    if (!currentEl) {
      // 如果没有存在元素,代表为空,直接塞新数据进去
      const blockEl = create({ item });

      lastEl = blockEl;
      container.push(blockEl);
    } else {
      // 查看数据是否一致
      if (isEqual(currentEl, item)) {
        lastEl = currentEl;
        continue;
      }

      // 查看是否在后面的元素中
      const exitedIndex = container.findIndex((e) => {
        return isEqual(e, item);
      });

      if (exitedIndex > -1) {
        // 只修正位移
        const exitedItem = container[exitedIndex];
        // 防止触发 detached 事件
        exitedItem.ele.__internal = 1;
        currentEl.before(exitedItem);
        delete exitedItem.ele.__internal;
        lastEl = exitedItem;
        continue;
      }

      // 如果没有存在元素,代表为空,直接塞新数据进去
      const blockEl = create({ item });

      // 在目标前面添加
      currentEl.before(blockEl);
      lastEl = blockEl;
    }
  }

  // 将最后元素的后面的元素全部清除
  // 使用 while 循环清除所有后续元素,直到没有下一个元素为止
  while (lastEl && lastEl.next) {
    lastEl.next.remove();
  }
};

export default diffFill;
