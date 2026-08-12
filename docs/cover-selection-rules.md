# 首页卡片封面图选择规则（Cover Selection Rules）

> 用于 deeptimestudio 首页卡片封面图（及 schema image / og:image）的自动选择，
> 也可以作为其他项目"从一组图片中挑选代表图"的通用模版规则。

## 背景

每个品种（页面）包含多张图片，每张图在源 PDF 中都有独立的 caption。
封面图的选择决定了首页卡片展示哪张图——选得好能显著提升卡片吸引力与点击率。

核心观察（已用数据验证）：

| 图片类型 | caption 特征 | 实际色彩度均值 |
|---|---|---|
| 科普文献黑白图 | caption 含数字（年代/标本编号，如 `Öpik 1963`、`NIGP123836`） | **4.1**（近黑白） |
| 收藏者实物图 | caption 无数字（如 `Complete dorsal shield (Yunnan; Amazon)`） | **33.2**（彩色） |

## 选择规则（优先级从高到低）

1. **人工覆盖（最高）**
   - `data/trilobites/covers.json` 中 `covers[slug]` 显式指定的图片，永远优先。
2. **无数字 caption（主规则）**
   - 在该品种所有图片中，优先选 caption **不含任何数字** 的图片（彩色收藏实物图）。
3. **同分排序（补充信号）**
   - 若有多张满足主规则的图片，按以下打分从高到低排序：
     - **色彩度**：图片 RGB 均值差（`|r-g|+|g-b|+|b-r|`，120px 缩略图计算）越高越好，优先彩色收藏图，兜底"无数字但仍是黑白复原图"的情况；
     - **语义**：caption 含 `Complete dorsal shield / Complete exoskeleton / Enrolled / Pyritized` 等"完整标本"描述者加分；含 `Reconstruction / Restoration / Close-up` 等复原图/局部图者减分；
     - **顺序**：同分时取原图顺序更靠前的一张。
4. **回退**
   - 若所有图片 caption 都含数字、或无 caption、或本页无图 → 回退到默认第一张图。

## 打分函数（实现参考）

```ts
const COMPLETE_SPECIMEN_RE = /complete\s+(dorsal\s+)?(shield|exoskeleton|carapace|specimen)|enrolled|pyritized|pyritised|exoskeleton/i;
const RECONSTRUCTION_RE = /reconstruction|restoration|close-?up|reconstruction\b/i;

function coverScore(img: TrilobiteImage): number {
  const caption = (img.caption || "").trim();
  if (!caption) return 0;
  let score = 0;
  if (!/\d/.test(caption)) score += 100;              // 无数字 = 收藏实物图
  score += Math.min((img.colorfulness ?? 0) / 10, 5); // 色彩度加分（上限 5）
  if (COMPLETE_SPECIMEN_RE.test(caption)) score += 10;
  if (RECONSTRUCTION_RE.test(caption)) score -= 15;
  return score;
}
```

## 数据结构依赖

| 字段 | 来源 | 说明 |
|---|---|---|
| `images[].caption` | `scripts/relink_captions.py` 从源 PDF 逐图归属 | 主规则判断依据 |
| `images[].colorfulness` | `scripts/probe_colorfulness.py`（色彩度批量计算） | 同分排序信号 |
| `covers.json` | 人工维护 | 最高优先级覆盖 |

## 操作流程

1. 若某品种封面选择不理想，直接在 `data/trilobites/covers.json` 的
   `covers` 对象中加入该品种覆盖（如 `"ammagnostus-wangcunensis": "03.webp"`）。
2. 重新 `npm run build` 生效（首页卡片、schema image、og:image 共用该选择）。
