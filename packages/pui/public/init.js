// 主题相关常量
const THEME_STORAGE_KEY = "pui-theme";
const THEME_TYPES = {
  AUTO: "auto",
  DARK: "dark",
  LIGHT: "light",
};

let puiRoot = $.getRootProvider("pui");

// 刷新主题函数
const refreshTheme = () => {
  const puiRoot = $.getRootProvider("pui");

  const value = puiRoot.theme;
  const { documentElement } = document;

  // 重置所有主题类
  if (value === THEME_TYPES.AUTO) {
    documentElement.removeAttribute("theme");
    documentElement.classList.remove("theme-dark-mode");
    documentElement.classList.remove("theme-light-mode");
  } else if (value === THEME_TYPES.DARK) {
    documentElement.classList.add("theme-dark-mode");
    documentElement.classList.remove("theme-light-mode");
  } else if (value === THEME_TYPES.LIGHT) {
    documentElement.classList.add("theme-light-mode");
    documentElement.classList.remove("theme-dark-mode");
  }
};

// 初始化主题提供者
if (!puiRoot) {
  try {
    // 创建根提供者
    $("body").push(`
      <o-root-provider name="pui" theme="${THEME_TYPES.AUTO}"></o-root-provider>
    `);

    puiRoot = $.getRootProvider("pui");
  } catch (error) {
    console.error("初始化 PUI 主题提供者失败:", error);
  }
}

// 设置初始主题
puiRoot.theme = localStorage.getItem(THEME_STORAGE_KEY) || THEME_TYPES.AUTO;

// 监听主题变化
puiRoot.watchTick(() => {
  const value = puiRoot.theme;
  refreshTheme();
  localStorage.setItem(THEME_STORAGE_KEY, value);
});

refreshTheme();

// 加载 CSS 资源
try {
  // 检查是否已经有 public css
  let targetLink = $("link[pui-theme]");
  if (!targetLink) {
    targetLink = $(
      `<link pui-theme rel="stylesheet" href="${import.meta.resolve(
        "../css/public.css"
      )}" />`
    );

    const colorLink = $("head link[pui-colors]");
    if (colorLink) {
      colorLink.before(targetLink);
    } else {
      $("head").push(targetLink);
    }
  }
} catch (error) {
  console.error("加载 PUI CSS 资源失败:", error);
}
