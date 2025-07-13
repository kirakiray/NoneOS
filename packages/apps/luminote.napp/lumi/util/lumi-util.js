// 队列中的block元素
const blocks = [];
let running = false;
export const addLoadingTask = (lumiBlock) => {
  blocks.push(lumiBlock);

  if (!running) {
    runBlock();
  }
};

export const removeLoadingTask = (lumiBlock) => {
  const index = blocks.indexOf(lumiBlock);
  if (index !== -1) {
    blocks.splice(index, 1);
  }
};

// 按顺序渲染组件，防止页面卡顿
export const runBlock = async () => {
  running = true;

  const current = blocks.shift();

  current.loading = false;

  await new Promise((res) => setTimeout(res, 0)); // 异步渲染组件

  if (blocks.length) {
    runBlock();
  } else {
    running = false;
  }
};

// 在body中添加对用内联组件的表单元素的弹窗气泡
export const showInlineCompForm = (target) => {
  debugger
  const tag = target.tagName.toLowerCase();
  const registerItem = inlineComps.find((item) => item.tag === tag);

  const rect = target.getBoundingClientRect();

  clearTimeout(target._tips_remove_timer); // 清除移除的定时器

  let tipsEl = target.__tipsEl;

  if (tipsEl) {
    return;
  }

  if (!target.__isBinded) {
    target.__isBinded = true;
    target.addEventListener("mouseout", () => {
      removeTips(target);
    });
  }

  if (!tipsEl) {
    // 添加提示插件
    tipsEl = target.__tipsEl = $(
      `<${registerItem.formTag}></${registerItem.formTag}>`
    );

    $.nextTick(() => {
      // 运行组件的初始化函数
      tipsEl.onInit({
        target: $target,
      });
    });

    tipsEl.on("mouseover", () => {
      // 直接移动进来的时候
      clearTimeout(target._tips_remove_timer);
    });

    // 移除时添加移除事件
    tipsEl.on("mouseout", () => {
      removeTips(target);
    });

    target.__mousewheel_func = (e) => {
      console.log("mousewheel", e.target.tagName);
      // 在鼠标滚轮滚动时，目标对应的表单元素，则直接移除提示
      if (e.target.tagName.toLowerCase() !== registerItem.formTag) {
        // 移除监听
        document.removeEventListener("mousewheel", target.__mousewheel_func);
        target.__mousewheel_func = null;
        removeTips(target, 10);
      }
    };

    const $target = $(target);
    $target.active = true;
    $target.onActivate &&
      $target.onActivate({
        tips: tipsEl,
      });

    document.addEventListener("mousewheel", target.__mousewheel_func);
  }

  // 修正定位
  Object.assign(tipsEl.style, {
    position: "fixed",
    top: rect.top + rect.height + "px",
    left: rect.left + "px",
  });

  if (!tipsEl.isConnected) {
    $("body").push(tipsEl);
  }
};
