# 3D 模型物种详情页制作标准（triassic-marine）

> 样板页：`/triassic-marine/robustichthys-luopingensis`（`threejs` 分支验证通过）。
> 本文档规定：页面长什么样、每块内容从哪来、怎么生成。照做即可复制到下一个物种。

---

## 一、页面标准格式（自上而下）

| # | 区块 | 内容 | 说明 |
|---|---|---|---|
| 1 | 面包屑 | All Triassic marine reptiles / 科 / 种名 | 模板自带，不动 |
| 2 | 标题头 | 目（小字）+ 种名（大标题斜体）+ 分类 + chips（年代/产地） | 模板自带，数据来自 `species.json` |
| 3 | 图片区 `.tri-gallery` | 见下表，共 5 格 | 本次新增 |
| 4 | 文字区 `.tri-description` | Description 全文（多段） | 本次新增，仅有 `description` 的物种显示 |
| 5 | 字段区 `.tri-fields` | Family / Genus / Original combination / Age / Locality / Figure caption | 模板自带 |
| 6 | 翻页器 | 上一物种 / 下一物种 | 模板自带 |

### 图片区 5 格规范

| 位 | 文件 | 来源 | 尺寸 | 样式 | caption |
|---|---|---|---|---|---|
| 01 | `01.webp`（已有化石照） | 不动 | 1600w | `span: wide` 通栏 | 原 caption |
| 02 | `02.webp` 复原比例对比图 | §二.1 生成 | 1600w | `span: wide` 通栏 | `Size comparison · <体长> cm standard length vs 175 cm scuba diver (same scale)`（手对比时换 hand 文案） |
| 03 | `03.webp` 3D hero | Asset `preview/hero.jpg` 转 webp | 1024w | 普通半格 | `3D reconstruction · hero view` |
| 04 | `04.webp` 3D side | Asset `preview/side.jpg` 转 webp | 1024w | 普通半格 | `3D reconstruction · side view` |
| CTA | 购买卡（非图片） | `model_url` 有值才渲染 | 占第三格，与 03/04 同行 | 深海渐变卡 `.tri-cta` | — |

CTA 卡文案（英文站，固定模板，只换链接）：
`3D MODEL · 1:1 SCALE` / `Bring it into your world` /
`PBR reconstruction + scientific dossier` / 按钮 `Get the model ↗`
（新窗口，`rel="sponsored noopener"`）。

### 响应式

- 桌面（≥960px）：01、02 通栏；03/04/CTA 三等分同行。
- 平板：自动 2 列；手机：单列堆叠。纯 CSS grid（`auto-fit, minmax(260px,1fr)`），无 JS。

### SEO 附带

- meta description：有 `description` 时取首段前 160 字符，否则回退通用文案。
- JSON-LD `image` 数组自动包含全部 gallery 图（模板已有映射，无需另加）。

---

## 二、源数据提取规范

### 2.1 物种 Asset 目录：`D:\project\3d-assets\models\<Genus_species>_Asset\`

| 页面内容 | 源文件 | 提取规则 |
|---|---|---|
| 复原图（对比图主角） | `pic/` | 有多张取文件名数字最小的（含 `1` 的优先，如 `pic/1.jpg`）；单张直接用 |
| 3D hero / side | `preview/hero.jpg`、`preview/side.jpg` | 原样转 webp，不裁剪不调色 |
| Description（只加这部分） | `docs/species-info.pdf` → `Description` 节 | 逐段照录，不改写；Diagnosis/Remarks 不进页面 |
| 标准体长（决定对比物） | `listing/store-listing.json` → bullets 中 `standard body length`（如 35 cm）；无则看 `technical-sheet.pdf` | **> 30 cm 用 diver，≤ 30 cm 用手** |
| 购买链接 | 同目录 `link.txt`（CGTrader 商品页 URL） | 存 `species.json` 的 `model_url` |

### 2.2 比例尺素材：`D:\project\fossil素材\compare\`

| 文件 | 标定 | 用法 |
|---|---|---|
| `diver.png`（透明底，横构图） | 整图人物长度 ≡ **175 cm** | 体长 > 30 cm 的物种；页面上下布局 |
| `hand.png`（透明底） | 手长（腕横纹至中指尖）≡ **18.5 cm**（成年人平均：男 ~18.9 / 女 ~17.4，取中） | 体长 ≤ 30 cm 的物种；页面左右布局 |

### 2.3 对比图合成规则（必须遵守）

1. **等比是铁律**：先量双方在原图中的像素长度（鱼：去灰底 bbox；diver/hand：alpha bbox），再按 `体长比` 缩放，禁止目测拉伸。
2. **一律头朝左**：复原图如头朝右则水平翻转，与参照物同向，左对齐。
3. **diver 版（上下布局）**：diver 在上、鱼在下；鱼下标蓝色长度线；底部刻度尺与 diver 同起点同比例（diver 按 25 cm 一档）。
4. **hand 版（左右布局）**：手在左、鱼在右（或手上鱼下按图定），刻度尺按 5 cm 一档。
5. 每行标注 `名称 · 体长 cm`；鱼标注用 `standard length` 口径并写明。
6. 画布底色取鱼图底色（≈ `#FBFBFB`），消除拼接缝；字体 DejaVu Sans。

---

## 三、生成方式（操作清单）

### 3.1 生成对比图

脚本：`C:\Users\ThinkPad\AppData\Local\Temp\opencode\scale_compare.py`
（函数 `scale_row`：裁剪 → 等比缩放 → 翻转 → 标注 → 刻度尺；hand 版调参复用，
把 `ref` 换 hand、`ref_len_cm` 填 18.5、布局改左右即可）。

```bash
python scale_compare.py   # 产物 robust_scale_diver.png（1600×1473）
```

### 3.2 转 webp 入库

```bash
# 02 对比图限宽 1600，03/04 限宽 1024，WEBP q82
public/triassic-marine/<slug>/02.webp
public/triassic-marine/<slug>/03.webp
public/triassic-marine/<slug>/04.webp
```

### 3.3 写数据（`data/triassic-marine/species.json`，只动该物种条目）

- 加 `description`：PDF Description 三段，段间 `\n\n` 连接。
- `images` 按 §一表格配齐 4 项：01/02 带 `"span": "wide"`，02/03/04 写 caption。
- 加 `model_url`：`link.txt` 全址原样存入。

### 3.4 模板（已就绪，一般不用再改）

- `lib/triassic-marine.ts`：`TriassicMarineImage.span?: "wide"`、
  `TriassicMarine.description?/model_url?`（可选字段，无数据物种零影响）；
  `description` 已纳入站内搜索。
- `app/triassic-marine/[slug]/page.tsx`：gallery 宽幅类、Description 分段渲染、
  有 `model_url` 才出 CTA 卡。
- `styles/globals.css`：`.tri-gallery__item--wide`、`.tri-description`、
  `.tri-cta*` 全套样式。

### 3.5 验证与发布

```bash
npx tsc --noEmit          # 类型检查须干净
npm run build             # 全站静态构建须通过
# 查预渲染产物（示例 robustichthys）：
# .next/server/app/triassic-marine/<slug>.html 应含 02/03/04.webp、
# tri-description、tri-cta、Description 首句
git add <上述4类文件> && git commit && git push origin threejs
# Vercel 自动构建 threejs 预览，打开 /triassic-marine/<slug> 目检
```

### 3.6 新物种检查单（复制即用）

- [ ] Asset `pic` 选图（多张取 `1`）→ 体长（>30 diver / ≤30 hand）
- [ ] 对比图生成 → 目检等比/朝向/刻度
- [ ] 02/03/04.webp 入库 → species.json（description + images + model_url）
- [ ] tsc + build + 预渲染 HTML 关键字检查
- [ ] 推 threejs → Vercel 目检（图/文/CTA链接新窗口）

---

## 附录：批量实战修正（gymno/luoxiong/sinosaur/sphargis 四物种）

### A. 文件命名：描述性文件名优先

`02/03/04.webp` 只在空闲时用。已有页面多半已有 `02/03.webp`（化石细部图），
为避免碰撞与改名风险，新图统一用描述性文件名，直接追加在 `images` 数组末尾
（画廊顺序由数组定，与文件名无关）：

- `scale.webp`（对比图，1600/1700 宽，`span: wide`）
- `3d-hero.webp` / `3d-side.webp`（1024 宽，普通格）

### B. hand 横版布局（体长 ≤ 30 cm）

- 左手右鱼，底部基线对齐；画布 1700 宽（防长学名标签溢出）。
- 手固定高 760px ≡ 18.5 cm；鱼按体长比统一缩放。
- 鱼标签两行、右对齐：学名单行 + `standard length · X cm` 次行。
- 手棋盘格底用肤色分割抠除并填平画布底色。

### C. 非水平姿态例外（sphargis 类）

身体轴线不在水平方向时，不用量 bounding-box 宽度，改用**凸包直径**
（内容轮廓点集的最大两点距离）作为体长像素； Landing 时保持原姿态
（不旋转），等比缩放即可，刻度尺照常水平。

### D. 朝向规则

只有头朝右的复原图才水平翻转；头已朝左的不动。翻转只为左右对齐，
不改任何比例。

### E. Description 提取清洗

- 截取 `Description` 至 `Diagnosis/References/Characters/Remarks` 首次出现处。
- 删页脚行（`Metadata compiled…`、`Deep Time Studio | … Page …`）。
- 删 tofu 占位 `\(n+\)`（PDF 中文未渲染部分），多余空格压缩。
- 段落按原文空行切分，段间 `\n\n` 存 JSON。

### F. 页面缺失与分类错配（重要）

- 以下 Asset 在站内**没有对应页面**，不要硬塞进近似页面：
  `Lashanichthys_sui`、`Mixosaurus_panxianensis`、`Nothosaurus_Sp`、
  `Yudaiichthys_eximius`（需新建物种页，另立任务）。
- `mixosaurus-cf` 与 `Mixosaurus_panxianensis`、`nothosaurus-zhangi` 与
  `Nothosaurus_Sp` 是**不同分类单元**，资产不可混用。
