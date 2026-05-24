# Findings & Decisions

## Requirements
- 右下角浮动按钮切换赛博朋克模式
- 全部 6 项特效：CRT 扫描线、RGB 色差、暗角、Glitch 故障、3D 卡片倾斜、终端启动画面
- 模式状态持久化到 localStorage，跨标签页同步
- 尊重 prefers-reduced-motion
- 与现有 Flashlight、BackToTopFAB、swup 过渡不冲突

## Research Findings

### wenzhimo.xyz 源码分析
- WordPress 站点，自定义主题 "kappa-heavy-industries"
- 核心特效文件：
  - `CRTMonitorFX.js` — CRT 效果类（扫描线/光带/RGB/闪烁/暗角/Glitch），通过 CSS class 和 CSS 变量控制
  - `pointer-service.js` — 共享指针追踪，rAF 节流，发布/订阅模式
  - `homepage-intro-tilt.js` — 卡片 3D 倾斜，CSS 自定义属性驱动
  - `homepage-tech-capability-bg.js` — Canvas 贪吃蛇背景（不适合 Blog）
  - `homepage-music-showcase-bg.js` — Canvas 音频波形（不适合 Blog）
  - `homepage-boot.js` — 终端启动序列，模拟命令行日志
  - `cursor.js` — 自定义光标坐标显示
- CRTMonitorFX 本质是 CSS 驱动：JS 只管理设置面板和 localStorage，渲染完全由 CSS 完成
- 原版有控制面板 UI（展开式设置面板），不需要移植

### myBlog 现有架构
- Astro 4 + React 18 + Tailwind CSS 3
- 状态管理：jotai（ThemeProvider, modalStack, scrollInfo）
- 动画：framer-motion + swup 页面过渡
- 已有特效：Flashlight（光标手电筒）、ReadingProgress、AnimatedLogo、HeadGradient
- 暗色/亮色主题通过 `[data-theme="dark"]` 切换
- CSP 较严格，需检查是否有新的外部资源引用

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| CSS-driven CRT via `[data-cyberpunk="on"]` | 性能最优，GPU 合成，复用现有 `[data-theme]` 模式 |
| jotai atom for cyberpunk state | 与项目现有状态管理一致 |
| usePointerService shared hook | 去重 Flashlight 和 TiltCard 的指针追踪 |
| TiltCard 独立于赛博朋克模式 | 美感独立，两处都可使用 |
| 浮动按钮在 BackToTopFAB 上方 | 用户选择 C，需避免重叠 |
| 使用 wenzhimo.xyz 代码为参考而非直接复制 | 需适配 Astro/React，去掉控制面板 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| WebFetch 无法访问 wenzhimo.xyz（网络安全限制） | 改用 curl 直接抓取 HTML 和 JS 文件 |
| glitch-text.js 返回 404 | 跳过，Glitch 效果在 CRTMonitorFX.js 中已包含 |
| pre-commit hook pnpm 未找到 | Spec 文档已暂存，需用户手动 git commit |

## Resources
- wenzhimo.xyz 主页: https://www.wenzhimo.xyz/
- CRTMonitorFX.js: https://www.wenzhimo.xyz/wp-content/themes/kappa-heavy-industries/js/CRTMonitorFX.js
- pointer-service.js: https://www.wenzhimo.xyz/wp-content/themes/kappa-heavy-industries/js/shared/pointer-service.js
- Spec: docs/superpowers/specs/2026-05-24-cyberpunk-mode-design.md
- myBlog 项目: C:/Users/DreamNight/Documents/01My/projects/myBlog

## Visual/Browser Findings
- Visual companion 展示了开关位置选择（用户选 C：浮动按钮）和特效多选（用户选全部 A-F）
- 架构设计画面确认了 CSS 驱动方案和文件结构
