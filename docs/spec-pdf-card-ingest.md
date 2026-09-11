# spec-pdf 生成物种卡片数据对接文档（Species Cards Ingest）

> 把「pdf-translate 的 `species_pdf.py` 生成的每物种 PDF」批量转成
> deeptimestudio 网站的**卡片封面 + 物种详情数据**。核心脚本：
> `scripts/extract_species_cards.py`（对应 README「Batch-ingest species cards
> from PDFs」章节）。

---

## 一、总览（两段式流水线）

```text
化石书扫描 PDF ──> species_pdf.py ──> 每物种 1 个 PDF（spec-pdf）
                                         │  species_NN_*.pdf（页1信息 / 页2+图版）
                                         ▼
deeptimestudio: extract_species_cards.py ──> 网站卡片 + 数据
                                         │  public/<归档>/<slug>/01.webp
                                         │  data/<归档>/species.json / drillable.json / covers.json
                                         ▼
                          npm run build ──> 上线（卡片网格 + 详情页）
```

- **Step 1（上游，pdf-translate 项目）**：把书页图版精准裁进每物种 PDF。
- **Step 2（本站）**：把每物种 PDF 的图版页渲染 → 去白边 → WebP，并合并
  species JSON 文本字段 → 生成站点数据。**结构化文本不解析自 PDF**，来自
  配套的 `species_data_*.json`。

---

## 二、Step 1：生成 spec-pdf（上游 pdf-translate）

命令（在 `pdf-translate/scripts/` 下）：

```bash
python species_pdf.py \
    --json "…/species_data_24.json" \
    --pdf "…/luoping_text_p23_46.pdf" \
    --blocks-json "…/p23_46_block_split_paragraphs.json" \
    --output "…/spec-pdf-24" \
    --separate
```

要点（详见 pdf-translate 的 `SPECIES_PDF_FORMAT.md`）：

| 参数 | 说明 |
|---|---|
| `--json` | 物种数据 JSON（含 `species[]`：id / species / family / genus / age / locality / diagnosis / remark / photo.caption 等） |
| `--pdf` | 源 PDF（scanned/text-layer 均可） |
| `--blocks-json` | `_block_split_paragraphs.json`。**同页多图时必填**，用 `figure_id` 精确定位每个图版；只有 json+pdf 时单图版页正常、同页多图会重复 |
| `--output` / `--separate` | 输出目录 / 每物种独立 PDF |

输出约定（**本站 ingest 的硬性输入格式**）：

```
spec-pdf-24/
  species_01_Mixosaurus_cf_panxianensis.pdf
  species_02_Phalarodon_atavus.pdf
  ...
```

- 文件名必须 `species_{NN:02d}_*.pdf`（NN = JSON 里的 id）。
- **页 1**：物种信息页（taxonomy 文本字段，不上图）。
- **页 2 起**：每个图版一页、每页一张嵌入图（多图物种 → 多页 → 多张 WebP）。

> 图片已由 species_pdf 的「像素连通域智能裁剪」裁到图版 bbox，页 2+ 页面上的
> 图就是纯化石图（仍带少量白边，本站会用 `trim_white_margins` 再精准去边）。

---

## 三、Step 2：批量生成卡片 + 网页数据

### 命令

```bash
python scripts/extract_species_cards.py \
    --collection <归档名> \
    --pdf-dir "D:/fossil/三叶虫/luoping/spec-pdf-24" \
    --species-json "D:/fossil/三叶虫/luoping/species_data_24.json" \
    --id-prefix <新字母>
```

或 npm 方式：

```bash
npm run ingest:species -- --collection <归档名> --pdf-dir "…" --species-json "…" --id-prefix <字母>
```

### 参数

| 选项 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `--collection` | ✅ | — | 归档名 → `public/<c>/` + `data/<c>/` |
| `--pdf-dir` | ✅ | — | 含 `species_NN_*.pdf` 的目录 |
| `--species-json` | ✅ | — | 配套物种数据 JSON（`species[]`） |
| `--id-prefix` | — | `a` | 记录 id 前缀，跨批次避免 React key 冲突（每批用一个新字母：a、b、c…） |
| `--append` | — | 开 | 追加到已有 `species.json`（按 slug 去重，跳过已存在者） |
| `--replace` | — | 关 | 从零重建 `species.json` |
| `--max-dim` | — | `1600` | 封面 WebP 最长边（px） |
| `--skip-images` | — | 关 | 只更新 JSON，不再提取图片 |
| `--title` / `--source` | — | — | 覆盖 `species.json` 的元信息 |

### 脚本逻辑（关键）

- **找文件**：按 `species_{id:02d}_` 前缀匹配 `species_NN_*.pdf`。
- **抽图**：遍历每物种 PDF **第 2 页起**的所有页，每页渲染成图
  （`page.get_pixmap`）→ `trim_white_margins` 精准去白边 → 按 `--max-dim`
  缩放 → 存 `public/<c>/<slug>/NN.webp`（`01.webp`、`02.webp`…）。
- **slug**：只取学名双名，小写 + 连字符，去掉命名人/`?`。例：
  - `Chunerpeton tianyiensis Gao et Shubin, 2003` → `chunerpeton-tianyiensis`
  - `Sinerpeton? fengshanensis …` → `sinerpeton-fengshanensis`
- **合并数据**：JSON 文本字段 + 图片 meta（file/caption）→ 写 `species.json`；
  slug 已存在则跳过（append 模式归档可持续累积）。

### 产物

```text
public/<归档>/<slug>/01.webp     卡片封面（精准裁剪化石图）
data/<归档>/species.json         物种记录（taxonomy、age、distribution、
                                 diagnosis、remarks、captions、images[]、cover）
data/<归档>/drillable.json       全部解锁可点开（记录含总数字段）
data/<归档>/covers.json          封面覆盖（默认每物种 01.webp）
```

---

## 四、格式要求 / 对接兼容性清单

| 要求 | 说明 |
|------|------|
| PDF 文件名 | `species_{NN:02d}_*.pdf`（NN 与 species JSON 的 `id` 一致） |
| PDF 页结构 | 页 1 = 信息页（跳过）；页 2+ = 图版页，**每页至少一张嵌入图** |
| species JSON | 顶层 `species[]`，每条含 `id`、`species`（学名，slug 来源）、`photo.caption`（图片说明）；其余 taxonomy 字段可选 |
| 图片可读性 | 图版页内嵌图需能被 `get_pixmap` 渲染（spec-pdf 产物天然满足） |
| 多图物种 | 图版页数 ≥2 → 自动生成 `02.webp`…，全部进详情页 `images[]` |

与 **spec-pdf-24**（`species_data_24.json` + `spec-pdf-24/`）的对接：
完全兼容——文件名、页结构、`photo.caption` 字段均已满足。

---

## 五、ingest 之后的上线检查清单

1. 若新批次引入了现有筛选列表外的时代（age），在 `lib/amphibians.ts`
   （或对应归档的常量）的年龄过滤表里补充（如 Jurassic / Permian）。
2. 在 `data/updates.json` 追加 What's New 条目（`kind: "amphibians_added"`，
   count、slugs）。
3. `npm run build`——`/amphibians/<slug>` 详情页与 `/sitemap.xml` 条目由
   JSON 自动生成。
4. Commit & 部署（Vercel 收到推送自动构建）。

---

## 六、注意事项

- **新归档需要前端组件**：ingest 脚本只产出 `data/<c>/*.json` 和
  `public/<c>/`；站点组件是数据驱动的，但**每个归档需有对应组件**
  （现成的例子：`app/components/AmphibiansArchive.tsx` +
  `app/amphibians/[slug]/page.tsx` 读取 `data/amphibians/*.json`）。
  首次接一个全新 `--collection`（如 `luoping`）时需新增这类组件。
- **`--id-prefix` 每批换字母**：同一页面上多批次物种混排时，id 前缀避免
  React `key` 冲突（第一批 `a…`、第二批 `b…`）。
- **重复跑幂等**：append 模式按 slug 去重，重复 ingest 不会产生重复记录。
- 单物种 PDF 只有 1 页（无图物种）时，该物种无 `01.webp`，卡片用
  `covers.json` 或占位处理。

---

## 修订记录

- 2026-09-11：初稿。记录 spec-pdf（pdf-translate `species_pdf.py`）→
  deeptimestudio `extract_species_cards.py` 的对接流程、命令、格式要求。