# Anomalocaris Sprite 透明与亮边问题排查手册

> 适用: `app/components/Anomalocaris.ts` + `public/anomalocaris/cam.png`
> 现象: 奇虾本体发虚/半透明、Sprite 四周出现白色矩形亮边
> 最终结论: **两个问题成因完全不同, 必须分开诊断; 且关键坑在于"线上 Vercel 跑旧代码, console 数值无法反映本地修复"。**

---

## 一、背景

奇虾用「8 方向 Sprite + Billboard」模拟伪 3D。素材是 `cam.png`(1536×1024, 2×4 拼接图, 每格 384×512, 对应 000/045/090/135 / 180/225/270/315), 在运行时被 `loadAnomalocarisAtlas()` 裁切成 8 张 `CanvasTexture`。

排查中发现: **素材本身已带透明 alpha(A=0 背景), 并非"白色不透明背景"**。用 PowerShell 逐像素验证:

- 所有 cell 四角/边中点 = `(25,23,22, A=0)` → 背景本就是透明深色
- 主体 alpha 最高只有 **254**(没有任何 255)
- 大量半透明像素 alpha 在 1~239 且 RGB 偏亮(lum>130)

---

## 二、问题一: 本体"发虚 / 半透明"

### 根因

代码里做过**距离渐隐**:

```ts
this.material.opacity = THREE.MathUtils.lerp(0.6, 1.0, 1 - distCam / 25);
```

奇虾游动时离相机 10~25 单位, opacity 长期停在 0.6~0.9 → 整只 40% 透明, 视觉上"发虚"。

### 解法

**主体必须恒定不透明**:

```ts
this.material.opacity = 1;            // 不再用 opacity 做距离淡出
this.sprite.visible = distCam < 20;   // 过远直接隐藏, 不做透明度渐变
```

- 材质: `transparent: true` 只让 PNG 背景区域支持 alpha
- 主体像素(a≥240)强制 `alpha = 255`
- 不做 `AdditiveBlending`, 不加 emissive
- 水下融合用 `scene.fog`, 不要用 `material.opacity`

---

## 三、问题二: 白色矩形亮边(核心难题)

### 根因(逐层定位)

亮边**不是 Bloom 造成的**(调高 threshold 无效), 也不是"背景白色未删"(背景本来就是 A=0 深色)。真正来源是**素材主体轮廓自带的一圈半透明/近不透明亮白像素**:

| 像素类型 | alpha | RGB | 位置 | 影响 |
|---|---|---|---|---|
| 半透明亮白 | 1~239 | lum>130 | 主体轮廓一圈 | 被普通混合叠加成白边 |
| **近不透明亮白** | ≥240 | lum>130 | 集中在 cell 底部 10px(如 cell0 有 1063 个) | 被 `a>=240→255` 原样保留成纯白 |

### 踩过的坑(不要重走)

1. **只调 Bloom** — 无效, 亮边来自素材 alpha 而非后处理
2. **只算 aspectRatio 不真裁切** — bbox 找到了但 canvas 仍是整格, 矩形光框保留
3. **压暗半透明亮白(dim)而非清除** — alpha 保留, 白边仍被渲染
4. **先找 bbox 再清理** — 白边像素把 bbox 撑满整格(crop=384x436), 裁切失效
5. **`toneMapped:false` ≠ 关 Bloom** — tone mapping 和 bloom 是两回事

### 最终解法(有效顺序)

处理流程**必须先整格清理, 再找 bbox 裁切**:

```ts
// 1) 整格清理
for (每个像素) {
  if (a < 32)        -> 全 0                          // 纯背景
  else if (a>=240 && lum>130 && 贴边缘<12px)
                     -> alpha 按距离渐变衰减           // 近不透明白带(素材底部亮边)
  else if (a >= 240) -> alpha = 255                    // 主体不透明(含内部白鳍片)
  else if (lum > 130)-> 全 0                           // 半透明亮白描边, 直接清除
  else               -> 保留                            // 主体暗色轮廓抗锯齿
}

// 2) 清理后再找 alpha bbox, 裁切 + 4px padding
// 3) texture: ClampToEdge + LinearFilter + generateMipmaps=false
//    (关闭 mipmap 防止半透明边缘 RGB 在缩放采样时扩散)
// 4) material: transparent, alphaTest 0.5, NormalBlending, depthWrite=false
```

**注意保留**: 主体内部的白色鳍片/高光(lum>130 但远离边缘)必须保留, 不能一刀切删所有亮色。

---

## 四、素材侧建议(治本)

代码处理是"打补丁"。彻底方案是重新生成一张**真正干净的 8 方向透明 Sprite Sheet**:

- 8 只奇虾完全同比例/同姿态, 只改视角
- 背景真透明(A=0), 主体 alpha=255
- 不要白色描边/羽化边
- 不贴格子边界, 四周留透明 padding

这样 `loadAnomalocarisAtlas()` 只需要做简单裁切 + bbox crop, 无需复杂的 alpha 清理逻辑。

---

## 五、排查工具

用 PowerShell 直接读 PNG 像素(不需要打开图片):

```powershell
Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("public/anomalocaris/cam.png")
# 四角 alpha: 确认背景是否透明
$bmp.GetPixel(2,2).A
# 统计 alpha 分布 / 亮白像素位置, 判断白边来源
$bmp.Dispose()
```

浏览器 console 有调试输出(需 `DEBUG_ANOMALOCARIS_ALPHA = true`):

```
[anomalocaris] angle=0 cell=384x436 crop=384x433 alpha: bg=106714 semi=1319 opaque=58239
```

- `crop` 应明显小于 cell(否则 bbox 被白边撑满)
- `semi` 大量 = 半透明像素仍多(白边/虚)

---

## 六、Vercel 部署验证(重要)

多次遇到"本地已修复但线上没变化":

1. `git rev-parse origin/threejs` 确认 GitHub 已推送新 commit
2. **console chunk hash 是否变化**(如 `page-f040e66c38174e6c.js`)——不变 = 跑的还是旧构建
3. 打开 Vercel Deployments 看新 commit 是否构建完成; preview 分支构建设置
4. 硬刷新 `Ctrl+Shift+R` 或隐私窗口排除缓存
5. 部署生效的标志: cell(0,0) 数值应变为 `bg=108156 semi=1708 opaque=57176`(对应 45759ed)

---

## 七、关键文件/提交

| 文件 | 说明 |
|---|---|
| `app/components/Anomalocaris.ts` | 8 方向 Sprite 类 + atlas 裁切/清理/bbox crop |
| `public/anomalocaris/cam.png` | 8 视角拼接素材 |
| `app/components/AbyssScene.tsx` | 场景集成 + Bloom 参数 |

修复提交序列: `59d7380`(清除半透明亮白)→ `45759ed`(近不透明白带边缘渐变)。