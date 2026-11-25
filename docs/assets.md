# 素材替换与对象存储

`public/assets/assets.json` 是程序化默认资源的稀疏覆盖清单，结构见 `src/types/assets.ts` 与旁边的 JSON Schema。第一阶段只建立接口；第三阶段实现读取、合并、异步加载和自动回退。

## 零素材模式

默认清单中的 breeds、coats、backgrounds 均为空，手掌图为 null。程序化生成器读取目录的骨架、花纹和材质配置，绘制两种视角、猫狗轮廓、耳尾、肉垫、毛发与背景；音频使用合成器。默认清单不引用任何不存在的图片，也不请求外部摄影资源。

## 对象键

本地根路径 `/assets` 与 R2/S3 公共根地址可互换。`ImageAsset.key` 必须是相对对象键，不带开头 `/`、域名、查询字符串或 `..` 段；不接受 `data:`、`javascript:` 等 URL。

```text
pets/domestic-shorthair/black/back/albedo.png
pets/domestic-shorthair/black/back/normal.png
pets/domestic-shorthair/black/back/displacement.png
pets/domestic-shorthair/black/back/interaction-mask.png
pets/domestic-shorthair/black/belly/albedo.png
backgrounds/linen/day.webp
audio/cat/purr/soft-01.ogg
hand/day.png
```

上传 R2/S3 时保留对象键，把 baseUrl 改为受控的 HTTPS CDN 地址。跨域素材服务必须设置相应 CORS 响应；不能把 access key 或 secret 写进清单。环境变量中的服务端存储驱动处理上传，浏览器只读取公开素材。

## 图片标准

- 同一视角的 albedo、normal、displacement、roughness 与 interactionMask 使用完全一致的像素尺寸、透明边距和对齐方式。
- 建议起点为 2048 × 1024；实际尺寸写入 dimensions，加载时校验。背部与肚皮各有独立图组，不强制两种视角复用同一遮罩。
- albedo 使用透明 PNG / WebP 和 sRGB；normal、displacement、roughness、interactionMask 使用线性色彩空间。
- normal 使用切线空间 RGB（中性值约为 128,128,255）；置换图中灰色为中性、高低值表示相对起伏，具体强度由 breed deformation 配置控制。
- interactionMask 的 alpha 是宠物轮廓，red 是胖瘦腰腹权重。头、耳、爪区域的 red 应为 0，保证胖瘦滑块不拉伸这些区域。
- 手掌图保持透明，pivot 采用归一化坐标。没有图片时用程序化手掌，日夜光照均在运行时统一调制。

资源覆盖顺序：**程序化默认值 → 品种资源 → 毛色资源**；缺少某张贴图时仅该层回退。加载失败保留上一个可用画面，异步切换使用请求代次丢弃过期结果，防止快速换品种时串图。

## 添加一张真实贴图

先把文件放到 `public/assets/pets/domestic-shorthair/black/back/albedo.png`，然后在清单 coats 对象中增加：

```json
{
  "domestic-shorthair/black": {
    "views": {
      "back": {
        "albedo": {
          "key": "pets/domestic-shorthair/black/back/albedo.png",
          "dimensions": { "width": 2048, "height": 1024 },
          "colorSpace": "srgb"
        }
      }
    }
  }
}
```

示例只展示 coats 内的条目，不是完整清单。毛色 slug 需与第二阶段 Seed 中的目录一致。更新 revision（例如 `photo-v2`）以便缓存失效；未提供的肚皮视角继续使用程序化资源。

## 音频标准

音频在 breeds 的 audio 字段按 cue 设置，可提供多个变体；相对文件键与图片一致。clip 包含 loop、gain 和 playbackRateRange，基础混音仍由音频引擎按抚摸行为调制。

呼噜、轻喘可循环；轻叫、长叹、尾拍采用单次触发与冷却。切换音源使用短交叉淡化，避免爆音。清单没有音频或解码失败时继续合成，不要求运行环境准备 mp3 / ogg 文件。
