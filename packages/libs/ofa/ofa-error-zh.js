//! ofa-errors - v1.0.0 undefined  (c) undefined-2025 undefined
!(function (e) {
  "function" == typeof define && define.amd ? define(e) : e();
})(function () {
  "use strict";
  const e = JSON.stringify({
    load_fail: "加载 {url} 失败",
    load_fail_status: "加载 {url} 失败，状态码为：{status}",
    load_module: "加载模块失败，模块的地址为：{url}",
    no_alias: "没有查找到别名:{name}，所以 '{url}' 请求无效",
    config_alias_name_error: "设置别名出错，必须带有'@'开头",
    alias_already: "别名'{name}'已经存在",
    alias_relate_name: "别名不能配置相对地址，'{name}':'{path}'",
    failed_to_set_data: "设置属性值 {key} 出错",
    failed_to_get_data: "获取 {key} 出错",
    nexttick_thread_limit:
      "nextTick超出线程限制，可能出现了死循环，请尝试修复或优化函数",
    not_func: "{name}方法的回调参数必须是Function",
    not_found_func:
      "没有在目标{tag}上找到'{name}'方法，请在组件{tag}的'proto'上定义'{name}'方法",
    invalid_key:
      "注册'{compName}'组件的参数有误，'{targetName}'上的'{name}'已被占用，请将'{name}'改为其他名字。",
    xhear_wrap_no_parent: "目标元素没有父元素，不能使用warp方法",
    xhear_unwrap_has_siblings: "目标元素包含相邻节点，不能使用unwrap方法",
    xhear_reander_err: "渲染标签 '{tag}' 失败",
    xhear_register_exists: "组件'{name}'已经存在，不能重复注册这个组件",
    xhear_register_err: "注册'{tag}'组件出错",
    xhear_validate_tag:
      "注册组件名 '{str}' 有误，Web Components 命名规则请参阅： https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define#valid_custom_element_names ",
    xhear_tag_noline:
      "注册组件名 '{str}' 有误，至少包含一个'-'字符；Web Components 命名规则请参阅： https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define#valid_custom_element_names ",
    xhear_regster_data_noset:
      "注册组件{tag}错误，自定义数据不能出现 'Set' 或 'Map'类型的数据",
    xhear_regster_data_nofunc:
      "注册组件{tag}错误，自定义数据内不能出现函数，请将函数放在 'proto' 内；或者将 '{key}' 更改为 '_{key}' ",
    xhear_fakenode_unclose:
      "这个一个没有关闭的 FakeNode；使用错误的属性名：{name}",
    xhear_fill_tempname: "填充组件未找到模板'{name}'",
    xhear_eval: "模板语法'{name}'报错，表达式 {name}:{arg0}=\"{arg1}\"",
    xhear_listen_already: "旧监听器已经存在，此元素渲染有误。",
    xhear_dbfill_noname: "fill组件内只能渲染带有'name'属性的fill组件",
    xhear_temp_exist: "模板'{name}'已经存在",
    xhear_sync_no_options: "不允许直接使用'sync'方法，它只用于模板渲染",
    xhear_sync_object_value:
      "不能使用'sync'同步Object类型的值，目标{targetName}",
    loading_nothing: "Loading函数没有返回内容",
    app_src_change: "已经初始化过的app元素，不能再修改src属性",
    no_cross_access_func: "要跨域跳转页面，必须设置 access 函数",
    access_return_error: "不允许被跳转到 {src}",
    load_comp_module: "加载组件模块出错，错误的模块地址: {url}",
    comp_registered: "组件'{tag}'已被注册，不能重复注册该组件",
    "inject-link-rel":
      "inject-host 组件内的link元素的rel属性值只能为'stylesheet'",
    "use-data-inject":
      "请不要在inject-host中的样式元素上使用data()，因为它会导致严重的性能危机",
    load_page_module: "加载页面模块 {url} 失败",
    page_no_defaults: "当前页({src})已经被渲染了，不能重复渲染",
    not_page_module: "{src} 不是页面模块，不能被设置为page组件的src",
    page_failed: "加载页面失败: {src}",
    fetch_temp_err: "页面模块 {url} 加载模版 {tempSrc} 失败",
    page_wrap_fetch: "页面 {before} 获取父页面({current}) 失败",
    context_change_name:
      "更改{compName}的'name'可能会导致性能问题，请避免更改这个属性",
    no_provider: "name为'{name}'的consumer没有被相应的 provider 捕获到",
    page_invalid_key:
      "页面 {src} 的注册参数有误，'{targetName}'上的'{name}'已被占用，请将'{name}'改为其他名字。",
    root_provider_exist:
      "名为'{name}'的根provider出现异常，根provider组件只能出现一次",
    root_provider_name_change:
      "名为'{name}'的根provider出现异常，根provider组件不能更改 'name' 属性",
    change_lm_src: "{tag}元素更改 'src' 属性无效，这个属性只能被设置一次。",
    error_no_owner: "此数据有误，owner没有登记此对象",
    circular_data: "出现循环引用的对象",
    fill_type: "'x-fill'的'value'必须是Array类型，当前值的类型为 {type}",
    fill_key_duplicates: "填充组件内的key出现重复",
    render_el_error: "渲染元素失败，渲染错误的地方为 {expr}",
    temp_multi_child:
      "模板元素中只能包含一个子元素。如果出现多个子元素，则子元素将重新包装在一个<div> 元素中",
    temp_wrap_child:
      "模板'{tempName}'包含 {len} 个子元素，这些子元素已被包裹在具有属性'{wrapName}'的 div 元素中。",
    app_noback: "已经是第一页，不可以再执行 'back' 操作",
    invalidated_inject_host: "此元素将在'inject-host'中失效",
    olink_out_app: "[olink]的元素仅允许在 o-app 内使用",
    app_noforward: "已经是最后一页，不可以再执行 'forward' 操作",
    need_forwards:
      "目标o-app不允许前进操作，请给目标添加 '_forwards' 属性；或者在 app config文件中，添加 'export const allowForward = true' ",
    watchuntil_timeout: "watchUntil超时，没有监听到目标值",
  });
  localStorage["ofa-errors"] !== e && (localStorage["ofa-errors"] = e),
    (localStorage["ofa-errors-time"] = Date.now());
});
