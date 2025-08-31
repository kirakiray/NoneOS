import { getListData } from "./get-list-data.js";
import { exportHandle } from "/packages/fs/task/main.js";
import { get } from "/packages/fs/main.js";
import { toast } from "/packages/pui/util.js";
import { getRealLang } from "../../util/get-real-lang.js";

export const proto = {
  async exportWeb() {
    // 设置导出状态
    this.exporting = true;
    this.exportType = "web";

    try {
      // 获取项目信息
      const projectInfo = await this.app.getProject(
        this.projectDirname,
        "self"
      );

      const projectName = projectInfo.data.projectName;

      // 初始化web目录
      await this._initWebDirectory(projectInfo);

      // 重新获取web目录句柄
      const webDirHandle = await projectInfo.__handle.get("web");

      // 拷贝依赖文件
      await this._copyDependencies(webDirHandle);

      // 获取模板文件内容
      const tempContent = await this._getTemplateContent(
        projectInfo.data.analyticsCode
      );

      // 拷贝source目录
      await this._copySource(projectInfo, webDirHandle);

      // 处理所有语言
      const homeAid = await this._processAllLanguages(
        projectInfo,
        webDirHandle,
        tempContent
      );

      // 生成首页
      await this._generateIndex(
        webDirHandle,
        homeAid,
        projectInfo.data.analyticsCode
      );

      // 生成支持的语言文件
      await this._generateSupportedLangFile(projectInfo, webDirHandle);

      // 生成sitemap.xml
      await this._generateSitemap(projectInfo, webDirHandle);

      // 生成llms.txt
      await this._generateLlmsTxt(projectInfo, webDirHandle);

      // 导出文件
      await this._exportFiles(webDirHandle, projectName);

      // 生成整站数据
      await this._generateFullsite(projectInfo);

      // 导出完成
      this.exporting = false;
      this.exportType = "";
      toast(`${projectName} 导出成功`);
    } catch (error) {
      // 导出失败
      this.exporting = false;
      this.exportType = "";
      toast(`导出失败: ${error.message}`);
    }
  },

  // 初始化web目录
  async _initWebDirectory(projectInfo) {
    // 获取预览的文件夹
    let webDirHandle = await projectInfo.__handle.get("web");

    if (webDirHandle) {
      // 先清理旧的
      await webDirHandle.remove();
    }

    // 拷贝模板文件到web
    const tempDir = await get("/packages/apps/luminote.napp/source/doc-static");
    await tempDir.copyTo(projectInfo.__handle, "web");
  },

  // 拷贝依赖文件
  async _copyDependencies(webDirHandle) {
    // 写入依赖的 packages 那部份文件
    const pui = await get("/packages/pui");
    const pkgDirHandle = await webDirHandle.get("packages", {
      create: "dir",
    });
    await pui.copyTo(pkgDirHandle);

    const hljsLib = await get("/packages/libs/hljs-es");
    const libsDirHandle = await pkgDirHandle.get("libs", {
      create: "dir",
    });
    await hljsLib.copyTo(libsDirHandle);

    const blockDir = await get("/packages/apps/luminote.napp/lumi/block");
    const inlineDir = await get("/packages/apps/luminote.napp/lumi/inline");
    const lumiDirHandle = await pkgDirHandle.get("apps/luminote.napp/lumi", {
      create: "dir",
    });
    await blockDir.copyTo(lumiDirHandle);
    await inlineDir.copyTo(lumiDirHandle);
  },

  // 获取模板内容
  async _getTemplateContent(analyticsCode) {
    // 获取模板文件内容
    let tempContent = await fetch(
      "/packages/apps/luminote.napp/source/doc-static/_temp.html"
    ).then((e) => e.text());

    tempContent = tempContent.replace(
      "<!-- Analytics Code -->",
      analyticsCode || ""
    );

    return tempContent;
  },

  // 拷贝source目录
  async _copySource(projectInfo, webDirHandle) {
    // 拷贝sources
    const sourceDirHandle = await projectInfo.__handle.get("source");

    if (sourceDirHandle) {
      await sourceDirHandle.copyTo(webDirHandle);
    }
  },

  // 处理所有语言
  async _processAllLanguages(projectInfo, webDirHandle, tempContent) {
    const { mainLang } = projectInfo.data;
    let homeAid; // 第一个页面当成首页

    // 写入特定语言到项目
    const writeProject = async (lang) => {
      // 获取所有文章目录
      const listData = await getListData({
        list: projectInfo.data.main,
        lang,
        mainLang,
        callback: async (item) => {
          const aid = item.aid || item._dataId;

          if (!homeAid) {
            homeAid = aid;
          }

          // 写入文章数据
          const articleFile = await webDirHandle.get(`${lang}/${aid}.html`, {
            create: "file",
          });

          let title = item.title;

          if (mainLang !== lang) {
            if (item.titleI18nContent && item.titleI18nContent[lang]) {
              title = item.titleI18nContent[lang].value;
            }
          }

          let articleContent = `<h1>${title}</h1>\n\n`;

          // 内容转html
          for (const e of item.content) {
            let type = e.type;

            if (e.removed) {
              continue;
            }

            if (type === "article") {
              if (mainLang !== lang) {
                let title;
                try {
                  title = e.titleI18nContent[lang].value;
                } catch (error) {
                  title = e.title;
                }

                articleContent += `<a href="./${e.aid}.html" olink style="display:block;">${title}</a>`;
                continue;
              }
              articleContent += `<a href="./${e.aid}.html" olink style="display:block;">${e.title}</a>`;
              continue;
            }

            if (e.type === "paragraph") {
              type = "p";
            }
            let content = e.value;

            if (mainLang !== lang) {
              if (e.i18nContent && e.i18nContent[lang]) {
                content = e.i18nContent[lang].value;
              }
            }

            let attrStr = "";

            if (e.attrs) {
              Object.entries(e.attrs).forEach(([key, value]) => {
                if (key === "dataStatus") {
                  return;
                }

                attrStr += ` ${key}="${value}"`;
              });
            }

            if (e.tab) {
              articleContent += `<${type}${attrStr} style="margin-left: ${
                e.tab * 16
              }px;">${content}</${type}>\n\n`;
            } else {
              articleContent += `<${type}${attrStr}>${content}</${type}>\n\n`;
            }
          }

          // 最终要写入的内容
          let finalContent = tempContent.replace("{{article}}", articleContent);

          finalContent = finalContent.replace("{{title}}", title);

          await articleFile.write(finalContent);
        },
      });

      // 存放 list 数据
      const listFile = await webDirHandle.get(`_data/${lang}_list.json`, {
        create: "file",
      });

      await listFile.write(JSON.stringify(listData));
    };

    await writeProject(projectInfo.data.mainLang);
    for (let lang of projectInfo.data.otherLang) {
      await writeProject(lang);
    }

    return homeAid;
  },

  // 生成首页
  async _generateIndex(webDirHandle, homeAid, analyticsCode) {
    // 添加首页自动跳转代码
    let indexContent = await fetch(
      "/packages/apps/luminote.napp/source/doc-static/_index.html"
    ).then((e) => e.text());

    indexContent = indexContent.replace(/aaa\.html/g, `${homeAid}.html`);

    if (analyticsCode) {
      indexContent = indexContent.replace(
        "<!-- Analytics Code -->",
        analyticsCode
      );
    }

    // 写入首页
    const indexFile = await webDirHandle.get(`index.html`, {
      create: "file",
    });
    await indexFile.write(indexContent);
  },

  // 生成支持的语言文件
  async _generateSupportedLangFile(projectInfo, webDirHandle) {
    // 写入支持的语言
    const langFile = await webDirHandle.get(`_data/supported-lang.json`, {
      create: "file",
    });

    await langFile.write(
      JSON.stringify([
        {
          value: projectInfo.data.mainLang,
          label: getRealLang(projectInfo.data.mainLang),
          projectName: projectInfo.data.projectName,
        },
        ...projectInfo.data.otherLang.map((e) => ({
          value: e,
          label: getRealLang(e),
          projectName: projectInfo.data.projectName,
        })),
      ])
    );
  },

  // 生成sitemap.xml
  async _generateSitemap(projectInfo, webDirHandle) {
    // 生成 sitemap.xml
    const sitemapUrls = [];

    // 添加首页
    sitemapUrls.push({
      loc: "index.html",
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "daily",
      priority: "1.0",
    });

    // 收集所有语言的页面
    const allLangs = [projectInfo.data.mainLang, ...projectInfo.data.otherLang];

    for (let lang of allLangs) {
      // 获取该语言的所有文章
      const listData = await getListData({
        list: projectInfo.data.main,
        lang,
        mainLang: projectInfo.data.mainLang,
      });

      // 递归收集所有页面URL
      const collectUrls = (items) => {
        items.forEach((item) => {
          if (item.aid) {
            sitemapUrls.push({
              loc: `${lang}/${item.aid}.html`,
              lastmod: new Date().toISOString().split("T")[0],
              changefreq: "daily",
              priority: "0.8",
            });
          }
          if (item.list && item.list.length > 0) {
            collectUrls(item.list);
          }
        });
      };

      collectUrls(listData);
    }

    // 生成 sitemap.xml 内容
    let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    sitemapUrls.forEach((url) => {
      sitemapContent += `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>
`;
    });

    sitemapContent += `</urlset>`;

    // 写入 sitemap.xml
    const sitemapFile = await webDirHandle.get("sitemap.xml", {
      create: "file",
    });
    await sitemapFile.write(sitemapContent);
  },

  // 生成llms.txt
  async _generateLlmsTxt(projectInfo, webDirHandle) {
    // 生成 llms.txt
    let llmsContent = `# ${projectInfo.data.projectName}

## 项目概述
- **项目名称**: ${projectInfo.data.projectName}
- **主要语言**: ${getRealLang(projectInfo.data.mainLang)}
- **支持语言**: ${[projectInfo.data.mainLang, ...projectInfo.data.otherLang]
      .map((lang) => getRealLang(lang))
      .join(", ")}
- **生成时间**: ${new Date().toISOString().split("T")[0]}

## 文档结构

`;

    // 收集所有语言的文档结构
    const allLangs = [projectInfo.data.mainLang, ...projectInfo.data.otherLang];

    for (let lang of allLangs) {
      llmsContent += `### ${getRealLang(lang)} 版本\n\n`;

      // 获取该语言的所有文章
      const listData = await getListData({
        list: projectInfo.data.main,
        lang,
        mainLang: projectInfo.data.mainLang,
      });

      // 递归生成文档结构
      const generateStructure = (items, level = 0) => {
        let structure = "";
        items.forEach((item) => {
          if (item.aid) {
            const indent = "  ".repeat(level);
            structure += `${indent}- [${item.title}](${lang}/${item.aid}.html)\n`;
          }
          if (item.list && item.list.length > 0) {
            structure += generateStructure(item.list, level + 1);
          }
        });
        return structure;
      };

      llmsContent += generateStructure(listData);
      llmsContent += "\n";
    }

    llmsContent += `## 内容摘要

`;

    // 生成内容摘要
    const generateSummary = async (items, lang, level = 0) => {
      let summary = "";

      for (const item of items) {
        if (item.aid && !item.removed) {
          const indent = "  ".repeat(level);

          // 获取原始文章内容
          let title = item.title;
          let content = "";

          if (lang !== projectInfo.data.mainLang) {
            if (item.titleI18nContent && item.titleI18nContent[lang]) {
              title = item.titleI18nContent[lang].value;
            }
          }

          // 提取内容摘要
          if (item.content) {
            for (const e of item.content) {
              if (e.type === "paragraph" && e.value && e.value.length > 0) {
                let paragraphContent = e.value;

                if (lang !== projectInfo.data.mainLang) {
                  if (e.i18nContent && e.i18nContent[lang]) {
                    paragraphContent = e.i18nContent[lang].value;
                  }
                }

                // 截取前200字符作为摘要
                const summaryText =
                  paragraphContent.length > 200
                    ? paragraphContent.substring(0, 200) + "..."
                    : paragraphContent;

                content += summaryText + " ";
              }
            }
          }

          summary += `${indent}### ${title}\n${indent}${content}\n\n`;
        }

        if (item.list && item.list.length > 0) {
          summary += await generateSummary(item.list, lang, level + 1);
        }
      }

      return summary;
    };

    // 为每个语言生成内容摘要
    for (let lang of allLangs) {
      const listData = await getListData({
        list: projectInfo.data.main,
        lang,
        mainLang: projectInfo.data.mainLang,
        needContent: true,
      });

      llmsContent += `### ${getRealLang(lang)} 内容摘要\n`;
      llmsContent += await generateSummary(listData, lang);
      llmsContent += "\n";
    }

    llmsContent += `## 技术信息
- **文件格式**: 静态HTML网站
- **技术栈**: HTML, CSS, JavaScript
- **兼容性**: 现代浏览器
- **响应式设计**: 支持

---
*此文件由 Luminote 自动生成，用于帮助 AI 模型理解项目结构和内容*`;

    // 写入 llms.txt
    const llmsFile = await webDirHandle.get("llms.txt", {
      create: "file",
    });
    await llmsFile.write(llmsContent);
  },

  // 导出文件
  async _exportFiles(webDirHandle, projectName) {
    // 导出文件
    const fileArr = [];
    for await (let [name, item] of webDirHandle.entries()) {
      if (
        name === "_demo.html" ||
        name === "_temp.html" ||
        name === "_index.html"
      ) {
        // 忽略无用文件
        continue;
      }

      fileArr.push(item.path);
    }

    await exportHandle(fileArr, projectName);
  },
};
