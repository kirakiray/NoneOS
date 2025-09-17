# NoneOS - A Lightweight Virtual Operating System Based on Browser

[中文](./md/README_CN.md) | [日本語](./md/README_JP.md)

## Project Introduction

NoneOS is an innovative browser-based virtual operating system solution that adopts a pure static file architecture and can run without the support of a backend server.

Short-term goal: To create a lightweight NAS system based on the browser, achieving seamless connection and collaboration between devices.

- [x] Support for browser-based file management
- [x] Bookmark synchronization application
- [ ] File transfer application (similar to LocalSend)
- [ ] Note synchronization application (similar to Notion)

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