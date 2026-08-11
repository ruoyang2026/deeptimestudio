# Fashion 详情页文案模版（Fashion Detail Copy Template）

> 用途：作为提示词参考，快速生成 `/fashion/[slug]` 详情页文案。
> 套用下方标准结构，替换每块内容即可，无需改动页面组件或样式。

---

## 标准模版

```
[设计主题名]
[物种学名，斜体]
[年代 · 地质时期 · 具体产地]

THE SPECIMEN
[真实化石照片，建议统一比例，如 4:3，可带白色边框模拟博物馆标本卡]

[2-3 句话，必须包含：
- 具体发掘地点（精确到省/市/地层）
- 化石保存状态
- 1-2 个可辨识的形态特征]

THE STORY
[3-4 句话，叙事规则：
- 第一句：时间锚点（"Before X, before Y..." 或 "In the seas of Z, 500 million years ago..."）
- 第二句：具体场景（不要抽象，要写 "warm shallow seas" 或 "volcanic ash beds"）
- 第三句：化石的命运（如何被埋藏、如何被发现）
- 第四句（可选）：克制的主观连接]

DESIGN PHILOSOPHY
[2-3 句话，必须包含：
- 颜色来源（从化石/地层中采样）
- 设计动作（不是 "inspired by"，而是 "repositioned as" / "treated as" / "framed as"）
- 品牌信条（Real fossil. Reimagined.）]

COLLECTION
Drop [序号] · [系列名]
```

---

## 案例 1：THE FIRST CREST

**Eoredlichia intermedia**

**520 Million Years Old · Early Cambrian · Kunming, Yunnan**

**THE SPECIMEN**

[化石实拍小图，带比例尺或地层标签]

This specimen of Eoredlichia intermedia was recovered from the Early Cambrian strata near Kunming, Yunnan — a region that preserves one of the most complete records of the Cambrian Explosion. The fossil retains the species' characteristic semicircular cephalon and fifteen thoracic segments, mineralized in dark shale for over half a billion years.

**THE STORY**

Before dinosaurs. Before flowers. Before almost everything we recognize as "life today."

520 million years ago, in the warm shallow seas of what is now Kunming, this creature was already armored, segmented, and symmetrical. It did not know it would become a fossil. It did not know it would outlast the mountains that buried it.

We found it in the rock. We photographed it. We did not improve it.

**DESIGN PHILOSOPHY**

The palette is sampled directly from the fossil matrix: oxidized manganese purple, pyrite replacement gold, and the deep black of Cambrian shale.

The form is not reinterpreted — it is repositioned. The Eoredlichia is treated as a heraldic crest from an empire that ruled the ocean floor before vertebrates existed.

Real fossil. Reimagined.

**COLLECTION**

Drop 01 · Cambrian Dawn

---

## 案例 2：THE FIRST CREST

**Eoredlichia intermedia**

**520 Million Years Old · Early Cambrian · Kunming, Yunnan**

**THE SPECIMEN**

[化石实拍小图，带比例尺或地层标签]

This specimen of Eoredlichia intermedia was recovered from the Early Cambrian strata near Kunming, Yunnan — a region that preserves one of the most complete records of the Cambrian Explosion. The fossil retains the species' characteristic semicircular cephalon and fifteen thoracic segments, mineralized in dark shale for over half a billion years.

**THE STORY**

Before dinosaurs. Before flowers. Before almost everything we recognize as "life today."

520 million years ago, in the warm shallow seas of what is now Kunming, this creature was already armored, segmented, and symmetrical. It did not know it would become a fossil. It did not know it would outlast the mountains that buried it.

We found it in the rock. We photographed it. We did not improve it.

**DESIGN PHILOSOPHY**

The palette is sampled directly from the fossil matrix: oxidized manganese purple, pyrite replacement gold, and the deep black of Cambrian shale.

The form is not reinterpreted — it is repositioned. The Eoredlichia is treated as a heraldic crest from an empire that ruled the ocean floor before vertebrates existed.

Real fossil. Reimagined.

**COLLECTION**

Drop 01 · Cambrian Dawn

---

## 备注

- 当前两个案例内容一致（同一产品 The First Crest），后续新增款式时以案例为范本替换内容即可。
- 页面视觉（红色 kicker、白色卡片、字体样式）由 `styles/globals.css` 控制，无需改动。
- 数据存储在 `lib/fashion.ts` 的 `fashionProducts` 数组，新增款式在此追加并在 `docs` 中登记文案即可。
