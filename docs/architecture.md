# 架构与接口约定

本文件记录第一阶段确定的实现方案。除 Schema、核心类型和基础配置外，下述运行时行为在第二至四阶段实现。

## 前端与渲染边界

Next.js 页面负责初始文档与元数据，宠物画布是动态加载的 Client Component。PixiJS 只在浏览器初始化，避免 SSR 访问 `window`、WebGL 或 AudioContext。

Zustand 保存物种/品种/毛色、Size、Chubbiness、场景、视角、光照、声音偏好。引擎保存逐帧位置、速度、接触压力、网格速度和音频调制值。使用 Pointer Events 统一鼠标、触屏和笔；按压时使用 pointer capture，处理 `pointercancel`、失焦、页面隐藏和组件卸载。

所有形变与碰撞使用原始宠物坐标 `[0,1] × [0,1]`。指针先经过画布布局、整体缩放和当前形变的逆变换，再进行热区判断。纹理透明区域不触发抚摸，重叠热区按 priority 选中。Size 是整体等比缩放；Chubbiness 使用腰腹高斯权重，排除头、耳、四肢，禁止直接改变整张图宽高比。

渲染按帧应用：腰腹静态形变 → 呼吸与骨架动画 → 手部局部压陷与弹性回弹 → 毛发方向/噪点 → 昼夜光照。毛发采用确定性噪声，避免每帧重新生成纹理；按压采用局部网格位移和着色器波纹。部位各自配置软度、阻尼和尾部响应，肚皮可独立增加弹性。

背部和肚皮各有完整 rig、热区和贴图集合。翻身使用 `idle → turning-out → turning-in → idle`，中点原子切换视角资源、热区和变形参数，过渡期间暂停接触计数。第一版采用带轻微位移、阴影变化的网格翻转和交叉淡化；两张 2D 贴图不承担完整三维遮挡重建。

呼吸、尾摆和耳抖都有独立的时间参数。狗狗肚皮触发后腿蹬动；猫咪根据放松度触发踩奶或缩爪。主动翻肚提示由亲密度阈值触发，`unlockState.belly` 表示提示能力解锁；手动翻身按钮从一开始即可使用。

默认渲染上限 60 FPS、DPR 2，页面隐藏时暂停，低性能设备降低毛发密度和网格分辨率。响应 `prefers-reduced-motion`，禁用大幅翻转并降低连续动画。WebGL 不可用时使用 Canvas2D 程序化回退。

## 音频

首次 pointerdown/声音按钮手势时创建或恢复 AudioContext。猫咪基础呼噜由低频振荡、脉冲幅度调制与带通噪声叠加；狗狗使用滤波气流噪声与稀疏轻拍瞬态。按速度、持续时间、部位和放松度平滑更新 gain、filter cutoff 和调制深度。

真实音频与合成音共用 `AudioCue`。缺失或加载失败时回退合成，不能让加载错误阻塞互动。总体音量经过 master gain，使用短时间常数淡入淡出；页面隐藏时暂停，卸载时断开节点并关闭 context。音量范围 `[0,1]`，提供静音、音量滑块与相应可访问标签。

## 数据、身份与并发

匿名身份由服务端生成 UUID，放入签名、HttpOnly、SameSite cookie；生产使用 Secure。`ownerId`、`ownerKind` 不接受客户端 JSON 指定，也不返回给公开访客。登录接入时只需将所有者映射到真实账户。

分享码使用密码学随机值。`isPublic=false` 时禁止匿名公开读取；开启分享后 `/p/<shareCode>` 只读显示配置。写入始终校验所有者会话，分享码不能用于 PATCH 授权。PATCH 使用 `expectedVersion` 和条件更新防止多标签页互相覆盖。

配置编辑与遥测累计分离：仅配置修改递增 `version`，遥测原子增加统计，避免持续抚摸让配置保存反复冲突。所有时间返回 ISO 8601，BigInt 返回十进制字符串，禁止直接 JSON.stringify Prisma 原始对象。

SQLite Schema 使用 Json 存放可扩展渲染参数，不存 scalar arrays。第二阶段使用 Zod 校验 JSON 结构与 API 输入，并在迁移 SQL 中添加范围 CHECK。生产切换 PostgreSQL 时需要：

1. 把 datasource provider 改为 `postgresql`，安装同版本 `@prisma/adapter-pg` 和 `pg`，替换运行时 adapter。
2. 配置 PostgreSQL URL，生成对应迁移基线；SQLite migration SQL 不能直接复用。
3. 显式迁移数据，处理 UUID、日期、JSON 与 BigInt，重新核对 CHECK、唯一键和组合外键。
4. API 保持 Node.js runtime，使用受限连接池，构建阶段不访问数据库。

`config/database.ts` 为 CLI 和后续运行时 adapter 提供相同的 SQLite 绝对路径，防止创建两个不同的 dev.db。

## REST 接口

统一成功结构：`{ ok: true, data: ... }`；失败结构：`{ ok: false, error: { code, message, fields? } }`。定义位于 `src/types/api.ts`。请求体使用严格 allowlist，不接受统计字段或所有者字段。

- `GET /api/catalog`：一次返回启用的品种、毛色、背景、音效和默认配置。设置 ETag 与公共缓存，内容不包含身份数据。
- `POST /api/pets`：创建当前所有者的配置，校验 species/breed/coat 关系，生成唯一分享码，返回 201。
- `GET /api/pets/:id`：所有者可读取私有档案；公开档案可被分享访客读取。响应包含 `canEdit`；采用 `private, no-store` 避免缓存所有者权限。
- `PATCH /api/pets/:id`：校验所有权及 `expectedVersion`，禁止直接设置亲密度与计数；并发冲突返回 409。
- `POST /api/telemetry/pet`：每 10 秒或结束抚摸提交一个批次，结束时优先 fetch keepalive；适配 body 大小限制。校验时长、移动速度、次数与部位分布，批次最大 15 秒、150 次。客户端时间只作辅助，接收时间由服务端生成。
- `GET /api/stats/global`：读取汇总表，不扫描事件日志；提供短期公共缓存，因此是近实时统计。

没有已保存档案时也可上报匿名试玩；此时 petId 为空，只更新全局、所有者和品种统计。带 petId 时必须属于当前身份且品种一致。限流按会话和 IP 实现，不将完整 IP 存入遥测。

遥测在单一事务内执行：插入 `(ownerId,batchId)` 与 `(ownerId,sessionId,sequence)` 唯一事件 → 原子更新宠物计数/亲密度 → 原子更新三类聚合。相同批次重试返回 `accepted=false`，所有统计不重复增加。亲密度由服务端按有效时长、部位和适当速度计算并限制在 `[0,10000]`，不得接受客户端声明的奖励。

一次有效抚摸计数基于身体接触时的最小累计移动距离 `0.04`，并结合最短时间/冷却约束；禁止按每帧或每个 pointermove 直接加一。第二阶段固定服务端计数上限，第三阶段实现同一客户端采样规则。

## UI 与移动端

最终布局按参考图：居中大圆角画布、左上物种/品种/场景，右上日夜/翻身，下方左侧圆形毛色、右侧体型/声音/全屏/保存。日间米白暖阳，夜间深蓝灰，光照同时影响宠物和手掌。

仅画布使用 `touch-action:none` 和 overscroll 控制，浮层与页面仍保留可访问滚动和浏览器缩放。控件提供可见焦点、键盘操作、滑块标签、状态播报；移动端控制区不遮挡宠物主要接触区域。全屏 API 不支持的设备使用页面内沉浸模式。
