
<div align="right">
  <details>
    <summary >🌐 Language</summary>
    <div>
      <div align="center">
        <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=en">English</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=zh-CN">简体中文</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=zh-TW">繁體中文</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=ja">日本語</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=ko">한국어</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=hi">हिन्दी</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=th">ไทย</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=fr">Français</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=de">Deutsch</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=es">Español</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=it">Italiano</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=ru">Русский</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=pt">Português</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=nl">Nederlands</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=pl">Polski</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=ar">العربية</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=fa">فارسی</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=tr">Türkçe</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=vi">Tiếng Việt</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=id">Bahasa Indonesia</a>
        | <a href="https://openaitx.github.io/view.html?user=kirakiray&project=NoneOS&lang=as">অসমীয়া</
      </div>
    </div>
  </details>
</div>

# NoneOS - A Lightweight Virtual Operating System Based on Browser

[中文](./md/README_CN.md) | [日本語](./md/README_JP.md)

## Project Introduction

NoneOS is an innovative browser-based virtual operating system solution that adopts a pure static file architecture and can run without the support of a backend server.

Short-term goal: To create a lightweight NAS system based on the browser, achieving seamless connection and collaboration between devices.

- [x] Support for browser-based file management
- [x] Bookmark synchronization application
- [x] Note synchronization application (similar to Notion)
- [x] File transfer application (similar to LocalSend)
- [ ] Rebuild Note synchronization application

## Quick Start

Directly visit the official site: [https://os.noneos.com/](https://os.noneos.com/)

### Local Run
1. Clone or download the project and ensure that nodejs is installed locally.
2. Install dependencies:
```bash
npm install
```
3. Start the server:
```bash
npm run static
```
1. Visit: `http://localhost:5559/`

## How to Create an Application?

NoneOS adopts an advanced Web micro-application architecture, with each application built on the powerful ofa.js framework. Developers can easily create their own applications by simply importing the application directory (such as the example application `others/hello-world.napp`) into the system's "Apps" folder to quickly deploy and run it.

We are currently writing more detailed development documentation. In the meantime, developers can:
- Refer to the official ofa.js documentation to understand the framework features.
- Check the example applications under the `packages/apps` directory as a reference for development.