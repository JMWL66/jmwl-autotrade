<h1 align="center">加密未来 (JMWL-AutoTrade)</h1>

<p align="center">
  <strong>你私人的 AI 全自动量化交易引擎</strong><br/>
  <strong>支持全市场 · 适配多模型 · 安全高效无缝接入</strong>
</p>

<p align="center">
  <a href="https://github.com/JMWL66/jmwl-autotrade"><img src="https://img.shields.io/github/stars/JMWL66/jmwl-autotrade?style=for-the-badge" alt="Stars"></a>
  <a href="https://github.com/JMWL66/jmwl-autotrade/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg?style=for-the-badge" alt="License"></a>
  <a href="https://t.me/nofx_dev_community"><img src="https://img.shields.io/badge/Telegram-Community-blue?style=for-the-badge&logo=telegram" alt="Telegram"></a>
</p>

---

**加密未来 (JMWL-AutoTrade)** 是一个开源、**完全自主** 的 AI 交易系统。与传统的量化交易工具不同，你不需要写复杂的代码或手动盯着盘面，JMWL-AutoTrade 能够自主**感知市场、挑选模型并提取数据进行全自动化交易**。在你的授权下，AI 将接管策略的执行。

只需配置好账户和交易所 API，一切由 AI 接管。

### 🚀 快速启动 (一键安装)

```bash
curl -fsSL https://raw.githubusercontent.com/JMWL66/jmwl-autotrade/dev/install.sh | bash
```
完成后，在浏览器中打开 **http://127.0.0.1:3000** 即可进入系统控制台。

---

## ✨ 核心功能与亮点

| 特性 | 说明 |
|:--------|:------------|
| **全球主流 AI 模型全系列支持** | 接入 DeepSeek, Qwen, GPT, Claude, Gemini, Grok, Kimi, MiniMax 等，任意切换 |
| **涵盖所有主流交易所** | 币安 (Binance), Bybit, OKX, Bitget, KuCoin, Gate, Hyperliquid 等 |
| **可视化策略控制台** | 提供 AI 智能策略室与网格交易，完全零代码所见即所得 |
| **实时大盘监控** | 内置 K 线走势卡片与多维度投资组合分析 |
| **双语支持仪表盘** | 完全中英双语，提供实盘和模拟盘支持 |

---

## 📸 系统预览

| 交易控制台 | 行情与走势 |
|:---:|:---:|
| <img src="screenshots/dashboard-page.png" width="400"/> | <img src="screenshots/dashboard-market-chart.png" width="400"/> |

| 策略分析室 | 实时持仓统计 |
|:---:|:---:|
| <img src="screenshots/strategy-studio.png" width="400"/> | <img src="screenshots/dashboard-positions.png" width="400"/> |


---

## 🛠 源码本地运行 (Docker)

如果你想通过源码启动项目：

```bash
# 下载代码
git clone https://github.com/JMWL66/jmwl-autotrade.git
cd jmwl-autotrade

# 启动 Docker 容器 (编译并运行)
./start.sh start --build
```
系统启动后将自动拉起前端页面 (`:3000`) 和 Go 核心引擎后端 服务。

---

## 💬 社区与联系

- 官方推特 (X): [@jmwl_official](https://x.com/jmwl_official) (示例链接)
- Telegram 讨论组: [点击加入](https://t.me/nofx_dev_community)

> **风险提示**: 所有的 AI 自动化交易行为均存在重大市场风险。我们建议您在开始实盘大资金操作前，先通过系统的模拟盘环境进行学习测试。

---

## 📄 Licence
本项目遵循 [AGPL-3.0 协议](LICENSE) 进行开源。
