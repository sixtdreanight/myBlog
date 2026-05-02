---
title: DeepfakeBench EffortDetector 项目完全详解（250 问）
date: 2026-05-03
summary: 从零开始覆盖 DeepfakeBench EffortDetector 项目的全部细节。假设读者只会 Python 语法，其余概念全部讲解。
category: 教程
tags: [AI, DeepLearning, Deepfake, CLIP, LoRA, Mixup, ViT, PyTorch]
---

# DeepfakeBench EffortDetector 项目完全详解（250 问）

> "真相只有一个，但伪造的方式有千万种。"

本文以 250 个问答覆盖本项目全部细节。假设读者只会 Python 语法——其他概念从头讲起。

---

## 第〇章：预备知识

**Q1: 什么是图像？计算机怎么存储它？**

人眼中图像是光和颜色。计算机中，一张彩色图像是三维数组：`[高度, 宽度, 通道]`。通道=3（红R、绿G、蓝B），每像素每通道值 0-255（8位整数）。本项目输入 `224×224×3 = 150,528` 个数字。

**Q2: 什么是"张量"（Tensor）？和 Python list 有什么区别？**

Tensor = PyTorch 的多维数组，类似 NumPy 的 ndarray，但可以放在 GPU 上加速计算。支持自动求导（autograd），反向传播自动算梯度。

```python
import torch
batch = torch.randn(32, 3, 224, 224)  # 32张图, 3通道, 224x224
```

**Q3: 什么是 GPU？为什么深度学习需要 GPU？**

GPU 有数千个小型计算核心，擅长并行简单运算。神经网络的矩阵乘法正好是"简单但海量"的任务——GPU 一次算几千个乘加。本项目在 GPU 上训练约 2 小时，CPU 上可能需要几十小时。

**Q4: 什么是"预训练"？和"从零训练"有什么区别？**

预训练 = 拿别人训好的模型作为起点继续微调。如 CLIP 在 4 亿张图上训练过。从零训练 = 随机初始化所有参数。本项目数据少（~8000 帧），预训练是唯一可行的路线。

**Q5: 什么是"微调"（Fine-tuning）？全量微调和部分微调的区别？**

微调 = 拿预训练模型在目标数据上小范围调整参数。全量微调 = 所有参数可更新（307M）。部分微调 = 只更新一部分（本项目 789K = 0.26%）。本项目用部分微调——参数少、不易过拟合、训练快。

**Q6: 什么是 Logits？和 Probability 有什么区别？**

Logits = 模型最后一层原始输出，任意实数（未归一化）。Probability = logits 经 softmax 后，范围 [0,1] 且各项和为 1。Logits 用于计算损失（CrossEntropyLoss 内部自己做 softmax），Probability 用于给人看。

```python
logits = torch.tensor([2.0, -1.0])
prob = F.softmax(logits, dim=0)  # tensor([0.9526, 0.0474])
```

**Q7: 什么是"推理"（Inference）？和训练有什么区别？**

推理 = 用训好的模型对新数据做预测，不更新参数。用 `torch.no_grad()` 包裹，不跟踪梯度，更快、显存更少。测试时处于推理模式。

**Q8: 什么是随机种子（Random Seed）？为什么需要它？**

随机种子 = 伪随机数生成器的初始值。相同种子 → 相同随机序列 → 实验可复现。本项目 `manualSeed: 1024`。

**Q9: "epoch"、"batch"、"iteration" 三个概念的区别？**

Epoch = 全部训练数据完整看过一遍。Batch = 每次送入模型的一小批数据（本项目=32张图）。Iteration = 处理一个 batch 的完整过程（前向+反向+更新）。本项目 1 epoch ≈ 250 iteration，10 epoch = 2500 iteration。

**Q10: 什么是"过拟合"和"欠拟合"？**

过拟合 = 模型背下了训练数据但没学到规律。训练集好、测试集差。欠拟合 = 模型太简单，学不到规律。训练和测试都差。本项目防过拟合手段：冻结 CLIP、数据增强、Mixup、Weight Decay。

**Q11: 什么是"泛化"（Generalization）？**

泛化 = 模型在未见过的数据上的表现能力。训练集 99%、测试集 60% = 泛化差。训练集 80%、测试集 78% = 泛化好。本项目 FF++ 训练 → 6 个不同数据集测试，核心挑战就是泛化。

**Q12: 什么是"域迁移"（Domain Shift）？**

域迁移 = 训练和测试数据来自不同分布。如训练用 FF++ 换脸，测试用 Celeb-DF（改进换脸+后处理）——图像风格、伪影模式、压缩质量都不同。

**Q13: AI 中的"特征"（Feature）是什么意思？**

特征 = 从原始数据中提取的有意义的表示。低级特征：边缘、颜色、纹理。中级特征：眼睛、鼻子、嘴巴。高级特征：人脸整体、表情、身份。CLIP ViT 输出的 1024 维向量就是图像的"高级特征表示"。

**Q14: 什么是 softmax？公式是什么？**

softmax 把任意实数向量变成概率分布（非负且和为 1）：

$$p_i = \frac{e^{z_i}}{\sum_j e^{z_j}}$$

$e^z$ 确保非负，分母归一化确保和为 1。温度参数可调节"软硬"——温度越高分布越均匀。

**Q15: 什么是"梯度"（Gradient）？为什么重要？**

梯度 = 函数在各方向上的变化率（偏导数组成的向量）。深度学习中梯度告诉你"往哪个方向调参数能让损失变小"：$w \leftarrow w - lr \cdot \nabla L$。反向传播算法高效计算所有参数的梯度。

**Q16: 什么是"激活函数"？常见的有哪些？**

激活函数给神经网络引入非线性——没有它，多层网络等价于单层线性变换。常见：ReLU（max(0,x)）、GELU（平滑版 ReLU，ViT 中用）、Sigmoid（0~1，二分类概率）、Softmax（多分类概率）。

**Q17: 什么是"正则化"（Regularization）？本项目用了哪些？**

正则化 = 防止过拟合的技术。本项目用了：Weight Decay（惩罚大权重）、数据增强（随机变换扩数据）、Mixup（混合样本）、参数冻结（只训练少量参数限制模型容量）。

**Q18: 什么是"学习率"（Learning Rate）？太大/太小会怎样？**

学习率(lr) = 参数每次更新的步长。$w = w - lr \cdot \nabla L$。太大：跳过最优解，训练不稳定。太小：收敛极慢。本项目 lr=2e-4 对微调是中等偏小的值。

**Q19: 什么是"归一化"（Normalization）？为什么需要？**

归一化把输入数据缩放到统一范围（均值 0、方差 1）。图像归一化：$x_{norm} = (x/255 - mean) / std$。本项目用 CLIP 的统计量：

- mean = `[0.48145466, 0.4578275, 0.40821073]`
- std = `[0.26862954, 0.26130258, 0.27577711]`

> **tips**：必须用 CLIP 的统计量而非 ImageNet 的——CLIP 期望看到按这组值标准化的输入。

**Q20: 什么是 deepfake？有哪些类型？**

Deepfake = 用深度学习生成的虚假人脸媒体。三类：(1) 换脸（DeepFakes, FaceSwap）；(2) 重演（Face2Face, NeuralTextures）；(3) 全生成（StyleGAN, Diffusion）。本项目训练 FF++（换脸+重演），测试覆盖换脸和 GAN 后处理。

---

## 第一章：CLIP 与 Vision Transformer

**Q21: CLIP 是什么？谁做的？什么时候？**

CLIP（Contrastive Language-Image Pre-training）= OpenAI 2021 年发布。在 4 亿对"图片-文字描述"上训练，学会将图文映射到同一向量空间。可零样本分类（不需要针对特定任务训练）。

**Q22: CLIP 是怎么训练的？"对比学习"是什么意思？**

对比学习的目标：让匹配的图文对向量距离近、不匹配的距离远。一个 batch 含 N 对图文，计算 N×N 相似度矩阵——正样本（匹配的）在对角线上。Loss = InfoNCE：

$$L = -\frac{1}{N}\sum_i \log\frac{\exp(sim(I_i,T_i)/\tau)}{\sum_j \exp(sim(I_i,T_j)/\tau)}$$

模型需要从 N 个文字中找出与图像匹配的那个。

**Q23: CLIP 的视觉编码器有哪几种选择？有什么区别？**

两种架构：(1) ResNet（CNN）：ResNet-50, ResNet-101 等；(2) ViT（Transformer）：ViT-B/32, ViT-B/16, ViT-L/14。ViT-L/14 性能最好但最慢最大。本项目选 ViT-L/14。

**Q24: 什么是 Vision Transformer（ViT）？**

Google 2020 年把 Transformer 用于图像分类。核心想法：图像切成固定大小 patch → 每个 patch 当作"词" → 送入标准 Transformer 编码器。摒弃 CNN 的卷积，只用注意力。

**Q25: ViT 和 CNN 的本质区别是什么？**

CNN：局部连接（卷积核只看邻近像素）、权重共享、平移不变性、层次化特征。ViT：全局连接（自注意力让每个 patch 看所有 patch）、需要位置编码、直接全局感受野。

**Q26: ViT 的 patch embedding 是怎么做的？**

输入 [C,H,W] → 切成 P×P patch → [N, C×P×P]（N=HW/P²）。每 patch 经线性层映射到 D 维。本质是一个 `Conv2d(3, 1024, kernel=14, stride=14)`。

**Q27: 位置编码有几种？ViT 用哪种？**

ViT 用**可学习的 1D 位置编码**：每个位置有独立 D 维向量，随机初始化后参与训练。加到 patch embedding 上。CLIP ViT 用绝对位置编码。

**Q28: CLS token 是什么？为什么需要它？**

CLS = 在 patch 序列最前面追加的特殊 token。经过所有 Transformer 层后取其输出作为整张图的全局表示。借鉴 BERT 的设计。分类时只取 CLS token，不用所有 patch 平均。

**Q29: ViT-L/14 的具体参数——层数、头数、维度、参数量？**

24 层 Transformer，16 头 Multi-Head Attention，隐藏维度 1024，MLP 中间维度 4096，总参数 ~307M。patch_size=14，输入 224×224 → 256 patches。

**Q30: ViT 的一层 Transformer 内部发生了什么？**

输入 x [257, 1024]：
1. LayerNorm
2. Multi-Head Self-Attention（16头，每头64维）
3. 残差连接：`x = x + attention(x)`
4. LayerNorm
5. MLP：1024 → 4096 → 1024（GELU）
6. 残差连接：`x = x + mlp(x)`

**Q31: Multi-Head Self-Attention 的具体计算步骤？**

输入 x [257, 1024]：
1. 通过 W_Q/W_K/W_V 投影 → Q,K,V 各 [257,1024]
2. 分 16 头 → [16,257,64]
3. 每头：`Attn_h = softmax(Q_h K_h^T / √64) V_h`
4. 拼接 16 头 → [257,1024]
5. 过 W_O → 输出

**Q32: Self-Attention 中的 √d_k 是做什么的？**

$d_k$ = 每头维度(64)。$QK^T$ 方差 ≈ $d_k$，太大会导致 softmax 梯度消失。除以 √64=8 使方差归一化到 1。

**Q33: 为什么自注意力中 Q、K、V 都来自同一个 x？**

"自"注意力 = 输入自己给自己做注意力。Q（我想找谁）、K（我的关键特征）、V（我的实际内容）来自同一输入但通过不同投影提取不同信息。

**Q34: LayerNorm 和 BatchNorm 的区别？为什么 ViT 用 LayerNorm？**

BatchNorm：batch 维度归一化（依赖 batch 大小，小 batch 不稳定）。
LayerNorm：feature 维度归一化（每个样本独立）。ViT 用 LayerNorm 因为不依赖 batch 大小，训练/测试一致。

**Q35: GELU 是什么？和 ReLU 有什么不同？**

GELU = $x \cdot \Phi(x)$（$\Phi$ 是正态 CDF）。平滑非线性，0 附近有负值输出（不像 ReLU 硬截断）。ViT 的 MLP 用 GELU。

**Q36: 残差连接（Residual Connection）为什么重要？**

$output = x + f(x)$。作用：(1) 允许梯度无损流过深层网络；(2) 每层只需学"残差"（输入输出差异），降低学习难度。

**Q37: 为什么本项目选择 CLIP ViT-L/14 而非 ResNet？**

ViT 提供全局感受野（第一层就能看全图），对需要全局一致性判断的 deepfake 检测有利。ResNet 感受野逐层扩大，浅层看不到全局。

**Q38: "冻结 CLIP 视觉编码器"具体是怎么做到的？**

```python
for param in clip_model.vision_model.parameters():
    param.requires_grad = False  # 不计算梯度
```

PyTorch autograd 跳过这些参数的反向传播，节省显存和计算。

**Q39: 如果冻结了 CLIP，模型还怎么学？梯度流向哪里？**

前向传播：冻结的 CLIP 仍然正常工作，输出特征。后向传播：梯度穿过冻结层时不更新其参数（`requires_grad=False`），但继续向前传到可训的 LoRA 参数（A 和 B），只更新它们。

**Q40: CLIP 视觉编码器的 `pooler_output` 是什么？**

ViT 最后一层的 CLS token 经一个线性层 + Tanh 激活，输出 1024d 向量。这是 CLIP 定义的"图像表示"，训练时与文本向量算相似度。本项目直接用做 deepfake 检测的输入特征。

**Q41: CLIP ViT position embedding 是 224 分辨率的——不同分辨率怎么办？**

CLIP 位置编码固定 257 维（256 patches + CLS）。分辨率变→patch 数变→需要插值位置编码。本项目训练和测试都固定 224×224，无需处理。

**Q42: 概括：24 层 ViT，每层发生了什么？层层堆叠后输出什么？**

每层：LayerNorm → MultiHeadAttention(+残差) → LayerNorm → MLP(+残差)。24 层堆叠：浅层关注局部纹理，中层建立部件语义，深层关注全局一致性。最后一层 CLS token = 整张图的综合理解。

---

## 第二章：LoRA——低秩微调的完整解析

**Q43: LoRA 是什么的缩写？谁提出的？核心思想？**

LoRA = Low-Rank Adaptation。微软 2021 年提出（Hu et al., ICLR 2022）。核心：预训练权重 W 不直接改，学一个低秩增量 ΔW = BA，B 和 A 是小矩阵。秩 r 远小于 W 维度，参数量极小。

**Q44: LoRA 的数学表达式是什么？**

标准前向：$h = Wx + b$

LoRA 前向：$h = Wx + b + (BAx) \cdot \frac{\alpha}{r}$

W 和 b 冻结，只更新 A 和 B。A 尺寸 $r \times d_{in}$，B 尺寸 $d_{out} \times r$。

**Q45: 为什么叫"低秩"？秩是什么？**

矩阵的秩 = 独立行（或列）的数量 = 矩阵的自由度。满秩 1024×1024 有 1024 个独立方向。$BA$ 乘积最多 r 个独立方向（中间维度仅 r）。r=4 意味着只提供 4 个方向的变化。

**Q46: 为什么低秩就够了？秩越高不是越灵活吗？**

理论上越高越灵活。但 fine-tuning 需要的"变化"很少——预训练知识已很好，只需小幅调整。低秩防过拟合。秩太高参数暴增、过拟合风险增大。

**Q47: LoRA 权重初始化为什么 A 用正态分布、B 用零？**

A ~ N(0,0.02)，B = 0。训练开始时 BA=0（无论 A 是什么，B=0）。模型初始行为完全 = 原始 CLIP。随训练 B 逐渐非零，LoRA 通路慢慢"激活"。保证训练初期不破坏预训练知识。

**Q48: α/r 缩放因子有什么作用？为什么项目中 α/r=4？**

α/r 控制 LoRA 输出的"量级"。r=4,α=16→α/r=4（attention 层）。r=2,α=8→α/r=4（分类头）。调整 α 可不用改 lr 而控制 LoRA 的前向贡献——α 增大等效于 lr 增大。

```python
self.scaling = lora_alpha / r
# attention: 16/4 = 4
# head: 8/2 = 4
```

**Q49: LoRA 和全量微调的数学区别？**

全量微调：$W' = W + \Delta W_{full}$，$\Delta W$ 可与 W 同秩，参数更新量 = d×k。
LoRA：$W' = W + BA$，$\Delta W$ 受秩约束 ≤ r，参数更新量 = r×(d+k)。
差异：LoRA 施加"低秩先验"——认为需要的变化可用少数方向描述。

**Q50: LoRA 和 Adapter 的区别？哪个更好？**

Adapter：层间插入瓶颈网络（降维→激活→升维），增加推理时的计算。
LoRA：修改现有权重增量，不增加推理延迟（如 merge_weights）。LoRA 参数更少、推理零额外开销，公认更优。

**Q51: PyTorch 中 `requires_grad=False` 的权重和 LoRA 如何协同？**

前向：`h = W@x + B@A@x`，W 当常数，自动求导只对 A 和 B 算梯度。后向：dL/dA 和 dL/dB 被计算用于更新，W 不变。只有 `requires_grad=True` 的节点参与梯度计算。

**Q52: 项目中 LoRA 加在哪些具体的层？rank 各是多少？**

| 层 | 形状 | rank | α | 可训参数 |
|----|------|------|----|---------|
| q_proj | 1024×1024 | 4 | 16 | 8192 |
| k_proj | 1024×1024 | 4 | 16 | 8192 |
| v_proj | 1024×1024 | 4 | 16 | 8192 |
| out_proj | 1024×1024 | 4 | 16 | 8192 |
| head | 1024×2 | 2 | 8 | 2052 |

24 层 × 4 位置 × 8192 + head 2052 ≈ 786K + center vector 1024 ≈ **789,510**

**Q53: 为什么 q/k/v/out 四层都加而不是只加其中几个？**

q_proj（找什么）、k_proj（提供什么）、v_proj（传递什么）、out_proj（多头输出组合）功能不同，都需要微调来适配 deepfake 检测。消融（如只调 q 和 v）可能有效但未做。

**Q54: 为什么 MLP 层不加 LoRA？MLP 在 ViT 中做什么？**

MLP = 每 token 内部特征变换：1024→4096→1024。这是 CLIP 的核心知识存储处（"什么是人脸"、"什么是纹理"）。微调 MLP = 动摇 CLIP 知识根基。保留冻结保证了泛化。

**Q55: 分类头 rank=2 意味着什么？和全量微调分类头比？**

rank=2 提供 2 个独立判别方向。参数量：LoRA = 1024×2+2×2=2052，全量 = 1024×2+2=2050。几乎一样。但 LoRA 零初始化 B 保证训练初期一致性。

**Q56: CLIP attention 层的 nn.Linear 怎么被替换成 LoRA Linear？**

```python
for name, module in clip_model.vision_model.named_modules():
    if any(t in name for t in ["q_proj","k_proj","v_proj","out_proj"]):
        if isinstance(module, nn.Linear):
            lora = LoRALinear(module.in_features, module.out_features, r=4, alpha=16)
            lora.weight.data.copy_(module.weight.data)  # 复制原始权重
            setattr(parent, child_name, lora)            # 替换模块
```

**Q57: 为什么有两套 LoRA 实现？`use_loralib` 控制什么？**

`use_loralib: true` → 使用微软官方 `loralib` 库（经过充分测试、支持 weight merging）。
`use_loralib: false` → 自编 `Linear`（解耦依赖）。
两套逻辑等价（$Wx + BAx \times \alpha/r$），lora_dropout=0 时完全一致。

**Q58: `merge_weights` 是做什么的？本项目为什么不用？**

merge_weights = 推理时将 LoRA 融入 W：$W_{merged} = W + BA$。之后去掉 A 和 B，前向变为 $W_{merged}x + b$，零额外延迟。本项目未实现（推理场景不要求极致速度）。

**Q59: 训练时不冻结 W 同时在 LoRA 上训练会发生什么？**

W 和 BA 都会更新，等价于全量微调 + 额外低秩增量。比全量微调更快过拟合。违背 LoRA 核心设计。

**Q60: LoRA 的"低秩假设"在 deepfake 检测上一定成立吗？**

不一定。LoRA 假设 fine-tuning 变化在数学上低秩。但 deepfake 检测需要学全新判别模式（GAN 伪影、融合痕迹），这些可能与 CLIP 预训练知识完全不同——需要的变化可能非低秩。如果 LoRA 不如全量微调，低秩假设就不成立。目前没做对比，无法判断。

---

## 第三章：模型结构——从图像到判决

**Q61: EffortDetector 的完整结构图？**

```
                输入 [B, 3, 224, 224]
                        │
          CLIP ViT-L/14 vision_model (冻结)
          ├─ 24层 Transformer
          │  每层:
          │  ├─ q_proj [LoRA rank=4]
          │  ├─ k_proj [LoRA rank=4]
          │  ├─ v_proj [LoRA rank=4]
          │  ├─ out_proj [LoRA rank=4]
          │  └─ MLP (冻结)
          └─ CLS pooler → 特征 [B, 1024]
                        │
          LoRA Linear(1024→2) rank=2, α=8
                        │
          logits [B,2] → softmax[:,1] → prob [B]
```

**Q62: `features()` 做了什么？返回什么？**

```python
def features(self, data_dict):
    return self.backbone(data_dict['image'])['pooler_output']  # [B, 1024]
```

图像 → CLIP ViT 24 层 → 取 CLS token 的输出。这是"CLIP 对这张图的理解"。

**Q63: `classifier()` 做了什么？返回什么？**

```python
def classifier(self, features):
    return self.head(features)  # [B, 2] = [logit_real, logit_fake]
```

**Q64: `forward()` 在训练模式下做了什么？返回什么？**

```python
def forward(self, data_dict, inference=False):
    features = self.features(data_dict)                        # [B, 1024]
    pred = self.classifier(features)                           # [B, 2]
    prob = torch.softmax(pred, dim=1)[:, 1]                   # [B]
    return {'cls': pred, 'prob': prob, 'feat': features}
```

**Q65: `forward()` 在推理模式（`inference=True`）下多裁剪分支的逻辑？**

输入 5D [B,N,C,H,W]：
1. Flatten [B*N,C,H,W]
2. Backbone → [B*N,1024]
3. Head → [B*N,2]
4. softmax[:,1] → [B*N]
5. Reshape [B,N]
6. 聚合：有 texture_scores → TAA 加权；无 → 选 `|prob-0.5|` 最大的 crop

**Q66: TAA 聚合的公式和每个符号？**

$$S(I) = \beta \cdot s_{full} + (1-\beta) \cdot \sum_{j=1}^{N-1} w_j \cdot s_j, \quad w_j = \frac{t_j^\gamma}{\sum_k t_k^\gamma}$$

$s_{full}$ = 全图预测，$s_j$ = 第 j 个 crop 预测，$t_j$ = 第 j 个 crop 的 Laplacian 方差（纹理分数），β=0.5，γ=1.5。

**Q67: Laplacian 方差怎么算？为什么用它度量纹理？**

1. 图像转灰度：0.299R + 0.587G + 0.114B
2. Laplacian 卷积核：`[[0,1,0],[1,-4,1],[0,1,0]]`
3. 计算卷积输出（二阶导数值）的方差
纹理丰富区域（皮肤毛孔、头发）→ Laplacian 方差大。平滑区域→方差小。

**Q68: 置信度聚合为什么选 `|prob-0.5|` 最大？**

离 0.5 越远 = 越自信。选最自信的 crop 通常因为它捕捉到了最有判别力的面部区域，而非背景或遮挡。

**Q69: `get_losses()` 返回什么？每个 loss 的含义？**

```python
{'overall': L_CE,          # 全 batch 交叉熵（有 soft label 时用软标签 CE）
 'real_loss': L_CE_real,   # 仅 real 子集的 CE（硬标签，供 PCGrad）
 'fake_loss': L_CE_fake}   # 仅 fake 子集的 CE（硬标签，供 PCGrad）
```

**Q70: 软标签和硬标签在 `get_losses()` 中如何分支？**

有 `label_soft`：
$$L = -(y_{soft} \cdot \log P(fake) + (1-y_{soft}) \cdot \log P(real))$$

无 `label_soft`：
$$L = CE(pred, label)$$

`real_loss` 和 `fake_loss` 始终用硬标签（原始 label），不受 Mixup 影响。

**Q71: Margin Loss 的完整实现？**

```python
f_norm = F.normalize(features, dim=1)                   # L2 归一化
dist = torch.norm(f_norm - c_norm, dim=1)               # ∈ [0,2]
real = (labels == 0).float()   # y=1 for real
fake = (labels == 1).float()   # y=0 for fake
loss = (real * dist.pow(2)).mean() + (fake * F.relu(m - dist).pow(2)).mean()
```

特征和中心归一化后距离 ∈[0,2]。m=0.5 意味着假样本需被推出约 30° 角度距离。

**Q72: 预测队列 `prediction_queue` 是干什么的？**

一个 Python list，存储最近最多 512 个预测分数。`compute_adaptive_threshold()` 读取它来计算动态阈值。test.py 的 `inference()` 逐 batch 追加，trainer.test_epoch 一次性 extend。

---

## 第四章：数据管线

**Q73: 训练用什么数据？测试用什么数据？**

训练：FF++ c23 压缩，约 1000 真视频 × 8 帧 ≈ 8000 真样本 + 5 种伪造方法假样本。
测试：Celeb-DF-v1, Celeb-DF-v2, DFDC, DFDCP, FaceForensics++, UADFV 共 6 个数据集。

**Q74: DeepfakeAbstractBaseDataset 做了什么？**

继承 `torch.utils.data.Dataset`。`__init__` 读 JSON 索引收集图像路径和标签。`__getitem__` 读图 → resize → 增强（训练）→ 归一化 → 返回 tensor。支持 train/test 模式，LMDB/文件系统。

**Q75: 数据集是怎么初始化的？JSON 格式是什么？**

`collect_img_and_label_for_one_dataset()`：遍历 JSON 文件夹 → 解析每行 → 获取 `image_path` 和 `label`。JSON 格式：`[{"image_path": "...", "label": 0/1}, ...]`。帧选择支持连续 clip 和均匀采样。

**Q76: LMDB 和文件系统两种存储方式的区别？**

LMDB：内存映射，读取极快，需预处理。文件系统：直接读 PNG/JPG，灵活但慢。当前用文件系统。

**Q77: collate_fn 做了什么？**

将 batch 中各样本的 `image` 堆叠成 [B,C,H,W]，`label` 转 LongTensor [B]，`landmark`/`mask`/`texture_scores` 处理 None 或堆叠。返回字典。

**Q78: 测试时 multi_crop 是在数据集的哪个环节实现的？**

在 `__getitem__` 中，测试模式 + `multi_crop=True`：
1. 纹理引导：滑窗提取 patch → Laplacian 方差 → 选 top-Kr + top-Ks
2. 随机裁剪：crop_radio=0.8 位置随机 × num_crops 次 → 堆叠 [N,C,H,W]

**Q79: 数据归一化用的 mean/std 为什么不是 ImageNet 的？**

CLIP 在 4 亿张图上计算的统计量：mean=[0.481,0.458,0.408], std=[0.269,0.261,0.276]。CLIP 期望看到这组归一化的输入——用错了统计量特征就偏了。

**Q80: 数据增强列表和感知？**

12 种 Albumentations 增强：HorizontalFlip(0.5), RandomBrightnessContrast(0.5), HueSaturationValue(0.3), ImageCompression(0.1), GaussNoise(0.1), MotionBlur(0.1), CLAHE(0.1), ChannelShuffle(0.1), Cutout(0.1), RandomGamma(0.3), GlassBlur(0.3)。

> **tips**：ImageCompression 特别重要——社交媒体视频都压缩过，二次压缩伪影可能掩盖 deepfake 痕迹。

**Q81: ImageCompression 增强对 deepfake 检测为什么重要？**

社交媒体视频都重度压缩。压缩引入 blocking/ringing artifacts，可能掩盖或伪造 deepfake 微痕迹。训练中加随机压缩让模型学会在压缩退化下仍检测伪影。

**Q82: 训练时 batch_size=32, frame_num=8 → 每个 batch 多少个视频？**

32/8 = 4 个视频。Mixup 在 batch 内跨视频随机配对——可能不同视频、不同人物、不同伪造方法的帧被混合。

**Q83: 为什么训练时不做 multi_crop？**

训练时每样本已是完整图，multi_crop 产生 num_crops 倍的前向，太慢。测试不需反向，多几次前向可接受。

**Q84: 为什么训练只用 FF++ 而不用多数据集？**

"单域训练→跨域测试"是评估泛化能力的标准协议。多用数据就分不清"模型学好了"和"模型见过了"。

**Q85: JSON 中 100+ 数据集的标签映射如何管理？**

`train_config.yaml` 和 `test_config.yaml` 各一份 `label_dict`。某些生成模型数据集标签非 0/1（如 BigGAN_Fake=2），训练时 `torch.where(label!=0, 1, 0)` 统一转 1。

---

## 第五章：损失函数

**Q86: 交叉熵（Cross-Entropy）公式和物理意义？**

$$L = -\frac{1}{N}\sum_i [y_i \log p_i + (1-y_i) \log(1-p_i)]$$

$p_i$ = P(Fake)，$y_i$ = 真实标签 (0/1)。惩罚"自信的错误"——把真图坚定判为假比犹豫地判错代价大得多。

**Q87: 为什么用 `nn.CrossEntropyLoss()` 而不是 `nn.BCELoss()`？**

CrossEntropyLoss = LogSoftmax + NLLLoss，数值稳定（防 log(0) 的 NaN）。BCELoss 需手动 sigmoid 再 log，容易数值溢出。

---

## 第六章：训练配置与优化

**Q88: 训练用什么优化器？参数是什么？**

Adam：lr=2e-4，β₁=0.9，β₂=0.999，ε=1e-8，weight_decay=5e-4。无 LR scheduler。10 epoch。

**Q89: Adam 和 SGD 的本质区别？为什么选 Adam？**

SGD：$w_{t+1} = w_t - \eta g_t$，所有参数同学习率。
Adam：维护动量 $m_t$ 和自适应缩放 $v_t$。对微调场景（部分参数需大更新、部分需小更新）更合适。

**Q90: 为什么学习率 2e-4？怎么确定的？**

微调预训练模型通常用比从零训练小 10-100 倍的 lr。从零训 ViT 稍用 1e-3~3e-3。2e-4 是微调标准选择。未做 lr 消融。

**Q91: weight_decay=5e-4 的意义？**

Weight decay = L2 正则化。Adam 中：$w = w - \eta(g + \lambda w)$。$\lambda=5e-4$ 轻微惩罚大权重。太大限制 LoRA 表达能力，太小过拟合风险大。

**Q92: 为什么没有学习率调度（lr_scheduler: null）？**

微调时间短（10 epoch），从预训练权重开始已在最优值附近。但有 scheduler 可能更好——未探索。

**Q93: 训练多少 epoch？为什么是 10？够吗？**

10 epoch。基于早期经验。Mixup 作为正则化需更长训练才能发挥优势。20-50 epoch 可能更好。

**Q94: Best checkpoint 的"best"怎么定义？**

按 `metric_scoring: auc`。当某数据集的 AUC 超历史最佳 → 存 checkpoint。对 avg（所有测试集平均）也做同样处理。

**Q95: Checkpoint 存什么？.pth 文件有多大？**

`torch.save(model.state_dict(), path)` → 所有可训参数（LoRA A/B、分类头等）。不包括冻结的 CLIP 权重。约 789K × 4 bytes = 3.2MB。

**Q96: 完整的一次训练迭代做了什么？**

1. DataLoader 取 batch → 2. 移 GPU → 3. 可选 Mixup → 4. 前向 `model(data_dict)` → 5. `get_losses()` 算损失 → 6. `backward()` → 7. `optimizer.step()` → 8. 每 300 iter 算指标 + TensorBoard → 9. 每半 epoch 测试 + 存 best ckpt

**Q97: 训练和测试各占总时间多少？**

一个 epoch ~250 iter × 0.3s/iter ≈ 75s + 测试约 60s。10 epoch ≈ 20-30 min（单卡 V100/A10）。

**Q98: SAM（Sharpness-Aware Minimization）是什么？为什么没启用？**

SAM 找平坦极小值（邻域损失都低），需两步前向+反向。$\rho=0.05$。当前 `optimizer_wrapper: null`，未启用。

**Q99: PCGrad（梯度手术）是什么？为什么没启用？**

多任务梯度冲突检测：$g_i' = g_i - \frac{g_i \cdot g_j}{\|g_j\|^2}g_j$（当点积<0）。`pc_backward([real_loss, fake_loss])`。两个损失很少冲突→未启用。

**Q100: SWA（随机权重平均）是什么？为什么没启用？**

训练最后几个 epoch 对权取平均。`torch.optim.swa_utils.AveragedModel`。需 `SWA: true` + `swa_start`。未启用。

---

## 第七章：不对称 Mixup——核心贡献

**Q101: Mixup 是什么？谁提出的？动机？**

Mixup（Zhang et al., ICLR 2018）：两个样本图像和标签空间同做线性插值。动机：模型应在样本间"插值空间"也有合理预测，学平滑决策边界。

**Q102: 标准 Mixup 的公式？λ 从哪来？**

$$\tilde{x} = \lambda x_a + (1-\lambda) x_b, \quad \tilde{y} = \lambda y_a + (1-\lambda) y_b$$

$\lambda \sim Beta(\alpha, \alpha)$，通常 α∈[0.1,1.0]。

**Q103: Beta 分布是什么？为什么选它？**

Beta(α,β) 定义在 [0,1] 上的连续分布。Beta(α,α) 以 0.5 为对称中心。Mixup 论文推荐 α∈[0.1,0.4]（λ 倾向 0/1，轻微混合），但 α=0.5~1.0 也很常见。

**Q104: 什么是不对称 Mixup？"不对称"在哪？**

标准 Mixup 所有配对用同一标签公式。不对称 Mixup：
- 同类别（R+R, F+F）：标准标签
- 跨类别（R+F, F+R）：$\tilde{y} = 1 - (real\_prop)^\gamma$

"不对称" = 真图和假图在标签中地位不同——真图占比经指数变换。

**Q105: 不对称标签公式中每个符号的含义？**

- $\tilde{y}$：软标签（0=完全真，1=完全假）
- $real\_prop$：真图像素占比（∈[0,1]）
- $\gamma$：不对称强度

**Q106: 为什么 γ<1 使标签偏向"真"？**

$\gamma=0.2$，$real\_prop=0.5$：$0.5^{0.2} \approx 0.87$（比 0.5 大），$\tilde{y}=1-0.87=0.13$（比 0.5 小→偏真）。
数学上：$x^\gamma > x$ 当 $x\in(0,1)$ 且 $\gamma<1$（幂函数上凸）。

**Q107: γ 的 sweep 结果和解读？**

K=1, α=5.0 下：

| γ | ACC | video_auc | 趋势 |
|----|-----|-----------|------|
| 0.2 | 0.8248 | 0.9439 | ACC 最优 |
| 1.0 | ~0.80 | ~0.944 | 标准 Mixup |
| 3.0 | 0.7755 | 0.9447 | video_auc 最优 |

γ 越小→ACC 越高，γ 越大→video_auc 越高。Precision-Recall tradeoff。

**Q108: λ 的 α 控制什么？为什么 α=5.0？**

α=1→均匀分布（极端 λ 常见）。α=5→钟形（λ≈0.5）。α=0.5→U形（λ→0/1）。α=5.0 避免极端混合导致的无效增强。

**Q109: `asymmetric_mixup` 函数的逐行代码讲解？**

```python
def asymmetric_mixup(x, y, alpha=1.0, gamma=5.0):
    lam = np.random.beta(alpha, alpha)              # λ ~ Beta(α,α)
    index = torch.randperm(x.size(0))                # 随机配对
    mixed_x = lam*x + (1-lam)*x[index]               # 图像混合
    y_a, y_b = y.float(), y[index].float()
    lam_fake = torch.where(y_a==1.0, lam, 1.0-lam)  # 假图占比
    mixed_y_std = lam*y_a + (1-lam)*y_b              # 同类：标准标签
    mixed_y_asym = 1.0 - (1.0-lam_fake)**gamma       # 跨类：不对称标签
    mixed_y = torch.where(y_a==y_b, mixed_y_std, mixed_y_asym)
    return mixed_x, mixed_y
```

**Q110: `lam_fake` 为什么要 `torch.where`？**

不知道第一张还是第二张是假的。y_a=1（假图在前）→假图占比=λ。y_a=0（真图在前）→假图占比=1-λ。

**Q111: 同类别为什么用标准标签？**

R+R → 标签 = 0（还是真）。F+F → 标签 = 1（还是假）。同类混合不引入不对称偏置——只在跨类时需要不对称来推边界。

**Q112: Hardest-K Mixup 的完整 `hardest_k_mixup` 逻辑？**

1. 检查 K≤1 → fallback `asymmetric_mixup`
2. 采样 K 个独立 λ
3. 每真图选 K 随机假图
4. 构建 K*R 混合图像
5. `torch.no_grad()` 前向全候选 → CE loss → [K*R]
6. `argmax` 选每 real 的最难候选
7. 替换 batch 中 real 位置；fake 也与随机 real 混合（保持对称）
8. 返回新 batch + 软标签

**Q113: selection='hardest' vs 'random' 在代码中如何区分？**

```python
if selection == 'random':
    best_k = torch.randint(0, K, (R,))          # 随机
else:
    best_k = loss_kr.view(K,R).argmax(dim=0)    # 选最大损失
```

**Q114: K=1/2/3/4 实验结果差异？原因？**

K=1: ACC=0.8248, video_auc=0.9439（最佳）。
K≥2: AUC 全 0.6-0.8（崩溃）。
原因：FF++ 假图同源→候选间无难度差异→无信息增益只有噪声增益。

**Q115: 修复"假图不混合"bug 后为什么 K>1 仍可能不如 K=1？**

Bug 修复解决了"干净=假"的反向学习。但 K>1 的"极值偏差"和"梯度抖动"是固有局限——修复只能去掉学反的问题，不能凭空创造有意义的候选差异。

**Q116: Mixup 在训练的哪一步实施？**

`train_epoch` 中，batch 移 GPU 后、送入模型前：

```python
if config.get('use_mixup'):
    if mixup_k > 1:
        data_dict = hardest_k_mixup(model, data_dict, ...)
    else:
        data_dict['image'], data_dict['label_soft'] = asymmetric_mixup(...)
losses, predictions = train_step(data_dict)
```

仅训练时执行，测试/推理跳过。

**Q117: Mixup 对训练速度和显存的影响？**

K=1：几乎零开销（`lam*x + (1-lam)*y` 逐元素操作）。K>1：K 倍无梯度前向，计算量和显存均膨胀。

---

## 第八章：测试与评估

**Q118: AUC 是什么？取值范围和解释？**

AUC = ROC 曲线（FPR vs TPR 变化阈值 0→1）下的面积。1=完美排序，0.5=随机，0.95=优秀。不受类别不平衡和阈值影响。

**Q119: EER 是什么？和 AUC 的关系？**

EER = FPR=FNR 时的共同错误率。调整阈值使"误判真为假"和"漏判假为真"相等时的错误率。EER 越小越好，与 AUC 高度负相关。

**Q120: AP 是什么？为什么不直接看 accuracy？**

AP = PR 曲线下面积（Recall vs Precision）。对类别不平衡场景比 ACC 有信息量。ACC 受阈值漂移影响严重。

**Q121: 帧级 AUC 和视频级 AUC 的区别？**

帧级：每帧一票。视频级：同视频多帧均值 → 每视频一票。视频级 AUC 更贴近实际部署——关心"整个视频是真是假"。

**Q122: 视频级 AUC 是怎么计算的？**

1. 按视频名分组
2. 组内帧预测取均值 → 视频分数
3. 视频分数 + 视频标签 → ROC → video_auc

**Q123: test.py vs trainer.test_epoch vs testall.py 三种测试的区别？**

trainer.test_epoch：训练中自动触发，监控训练 + 存 best ckpt。
test.py：独立测试脚本，单数据集评估。
testall.py：批处理脚本，循环调 test.py 对多数据集评估 + 计算均值 + 画密度图。

**Q124: testall.py 怎么解析 test.py 的输出？**

正则 `^([a-zA-Z_]+):\s*([0-9.]+)` 匹配 test.py 的 `metric: value` 行。提取 acc, auc, eer, ap, video_auc, video_eer, video_acc, best_th。对匹配值计算平均。

**Q125: 测试时 `multi_crop` 开几个 crop？怎么聚合？**

`num_crops: 5`，置信度聚合：取 `|prob-0.5|` 最大的 crop 为最终预测。

**Q126: 测试时为什么需要 `torch.no_grad()`？**

不构建计算图，不跟踪梯度。节约显存、加速推理。测试/推理必须用。

**Q127: `model.eval()` 做了？为什么测试时需要？**

切换评估模式。影响 dropout（关闭）和 BN（全局统计量）。本项目无 dropout + 用 LayerNorm，实际效果很小但保留为最佳实践。

**Q128: 概率密度图（testall.py 输出）怎么画？什么意思？**

scipy Gaussian KDE 估计 Real 和 Fake 概率密度。x 轴=预测分数，y 轴=密度。理性：Real 峰在 0、Fake 峰在 1，两峰完全分离。重叠越多=模型越差。

**Q129: `get_test_metrics()` 计算了什么？怎么算的？**

帧级：AUC（ROC曲线）、EER（FPR=FNR时的错误率）、AP（PR曲线）、ACC（pred>0.5）。
视频级：video_auc, video_eer, video_acc（帧均值→视频分数→ROC）。

---

## 第九章：动态阈值 OWTTT

**Q130: 为什么需要自适应阈值？固定 0.5 有什么问题？**

跨域场景分数分布漂移→最优阈值在不同数据集不同（可能 0.3 或 0.7）。固定 0.5 一刀切 → 错一大片。

**Q131: OWTTT 全称和来源？**

OWTTT = Open-World Test-Time Training + Threshold。Yushu Li et al., ICCV 2023。原用于 OOD 检测阈值自适应，本项目用于 deepfake 二分类。

**Q132: OWTTT 核心假设是什么？为什么有效？**

假设 OOD 和 ID 分数呈双峰分布，峰间为谷底。最优阈值 = 谷底。有效因为：双峰时最小化类内方差定位谷底。

**Q133: OWTTT 目标函数每项的意义？**

$$\min_{\lambda} \frac{n_0}{N}Var(S|S<\lambda) + \frac{n_1}{N}Var(S|S\ge\lambda) - \alpha\cdot\min|S-\lambda|$$

项1=低组加权方差，项2=高组加权方差，项3=gap 惩罚（防止阈值落在某数据点上）。

**Q134: OWTTT 搜索空间和步长？**

`np.arange(0, 1, 0.01)` = 100 候选。精度 ±0.005。对 800-36000 样本的数据集基本够用。

**Q135: OWTTT 队列长度为 512——为什么？**

原论文推荐 100-500。512=2^9，计算机友好。足以估计双峰特征，不至于因最新样本过度漂移。

**Q136: 队列 < 32 时返回 0.5——合理吗？**

太少无法可靠估计方差。返回 0.5 保守但不一定对。对单峰偏斜分布，0.5 也不对。

**Q137: gap_weight=0.01 有意义吗？**

方差项量级 ~0.05-0.25。gap 项=0.01×0.01~0.1≈1e-4~1e-3——比方差小 50-250 倍。纯 tie-breaker，不是主要驱动力。

**Q138: OWTTT 在 deepfake 检测中的实际效果？**

训得好（AUC>0.9，双峰明显）→ OWTTT≈0.5，跟固定阈值无差。训得差（AUC~0.7，单峰/重叠）→ 可能 0.99 或 0.01，无意义。当前项目中可有可无。

**Q139: 试过的 GMM 双高斯拟合替代方案为什么失败？**

当分数非双峰时 GMM 强行拟合两高斯→交叉点无意义。公式推导中 c 项符号曾写错。修正后仍返回 0.99——非双峰分布的"最优交叉"没有物理意义。

---

## 第十章：Sweep 实验设计

**Q140: 什么是超参数 Sweep？为什么需要？**

Sweep = 系统尝试多组超参数组合找最优。人工调靠直觉，Sweep 靠穷举。本项目扫了 K、γ、α 三个参数，22 组。

**Q141: Sweep 跑了多少组合？怎么选的？**

K∈{1,2,3} × γ∈{0.2,0.5,0.8,1.0,1.5,2.0,3.0,5.0}，α=5.0 固定。合计 22 组。

**Q142: Sweep 脚本怎么工作的？**

`run_sweep.sh`：每组合：(1) Python 改 yaml；(2) `nohup python3 train.py ...`；(3) `wait` 等完；(4) Python 解析日志取指标；(5) 追加 `sweep_results.tsv`。跑完三个排序输出。

**Q143: Sweep 结果按什么排序？为什么三个排序？**

按 video_auc、AUC、ACC 分别排序。最优参数取决于你更看重哪个指标：video_auc（视频级核心）、ACC（帧级判定）、AUC（综合排序）。

**Q144: Sweep 指标解析怎么做？可靠吗？**

正则 `testing-metric, (\w+): ([0-9.]+)` 匹配 `dataset: avg` 块最后的测试指标行。已在真实日志验证。

**Q145: Sweep 核心发现（三句话）？**

1. K=1 最优——多候选无增益
2. γ=0.2 在 ACC 上最优——保守标签策略更好
3. α=5.0——λ 集中在 0.5 比均匀好

**Q146: Sweep 设计的缺陷？**

1. 单 seed——无法评估随机波动
2. 只在 Celeb-DF-v2 验证但在 6 数据集报告
3. 仅 10 epoch——可能低估 Mixup 长期优势
4. 没 sweep margin loss、LoRA rank、lr 等

---

## 第十一章：实验结果全面分析

**Q147: Baseline 是什么配置？和最优 Mixup 的差异？**

Baseline = `use_mixup: false`。最优 Mixup = K=1, γ=0.2, α=5.0。
Baseline：ACC=0.8200, video_auc=0.9501。
Mixup：ACC=0.8248 (+0.0048), video_auc=0.9439 (-0.0062)。

**Q148: 六大数据集的性能差异和原因？**

| 数据集 | ACC | AUC | 问题 |
|--------|-----|-----|------|
| FF++ (同域) | 0.80 | 0.82 | 最优 |
| Celeb-DF-v2 | 0.66 | 0.77 | 跨域掉 6 点 |
| DFDC | 0.51 | 0.75 | GAN 后处理 + 阈值漂移 |
| UADFV | 0.50 | 0.82 | AUC 好但阈值不对 |

核心：AUC 跨域鲁棒性远好于 ACC——排序能力泛化尚可，但 0.5 阈值漂移。

**Q149: 为什么 UADFV AUC=0.82 但 ACC=0.5？**

UADFV 早期低质换脸。模型能区分"此图比彼图更像假"（AUC 好），但整个分数分布被偏移——真假都在中高位。0.5 切在中位两边混。手动调阈值到 0.7-0.8 ACC 会显著提升。

**Q150: Mixup 对 deepfake 检测的提升为什么微小？**

1. FF++ 够大够多样，过拟合不严重→Mixup 正则化效果有限
2. CLIP 特征已很鲁棒→特征空间做 Mixup 效果打折扣
3. 10 epoch 太短→Mixup 需更多迭代发挥优势

**Q151: Mixup 代价-收益分析：值得吗？**

代价：几乎零（一次 `np.random.beta()` + 逐元素混合）。收益：ACC +0.0048。性价比极高——几乎免费的提升。

**Q152: 项目的主要贡献是什么？**

1. CLIP+LoRA 是 deepfake 检测的有效轻量组合
2. 不对称 Mixup (γ=0.2) 提供一致微小 ACC 提升
3. 系统 sweep 确定 K=1 最优性 + γ 曲线
4. 揭示 OWTTT 在此任务上的局限

**Q153: 项目的主要局限性是什么？**

1. 没和 ImageNet ViT / EfficientNet 对比
2. 仅 FF++ 训练，泛化边界限定
3. 10 epoch，Mixup 优势可能被低估
4. 未在 GenImage 验证
5. 单 seed——无方差评估

---

## 第十二章：代码架构详解

**Q154: 项目的文件结构？**

```
DeepfakeBench/
├── training/
│   ├── config/          ← YAML 配置
│   │   ├── detector/    ← 检测器配置（effort.yaml）
│   │   ├── train_config.yaml
│   │   └── test_config.yaml
│   ├── dataset/         ← 数据加载
│   ├── detectors/       ← 检测器模型
│   ├── loss/            ← 12 个注册损失函数
│   ├── networks/        ← 5 个注册 backbone + CLIP
│   ├── optimizor/       ← SAM, PCGrad, LinearLR
│   ├── trainer/         ← 训练器
│   ├── metrics/         ← 评估指标
│   ├── utils/           ← Registry
│   ├── train.py         ← 训练入口
│   ├── test.py          ← 测试脚本
│   └── demo.py          ← 单图推理
├── testall.py           ← 批量测试入口
└── run_sweep.sh         ← 参数扫描脚本
```

**Q155: Registry 是什么？四个注册表各管什么？**

Registry = 名字→类的全局字典。`@XXX.register_module(name)` 注册。四个单例：BACKBONE（网络骨干）、DETECTOR（检测器）、TRAINER（声明未用）、LOSSFUNC（损失函数）。

**Q156: Config 加载链？**

`effort.yaml` → `train_config.yaml` → `config.update(config2)` → CLI override。优先级：CLI > train_config > detector config（update 导致 train_config 覆盖 detector）。

**Q157: 训练脚本 `train.py` 完整执行流程？**

1. parse args → 2. load yaml → 3. merge + CLI → 4. init seed → 5. create dataloaders → 6. create model → 7. create optimizer+scheduler → 8. create trainer → 9. for epoch: train_epoch + test → 10. print best metric

**Q158: `train.py` L54 `torch.cuda.set_device(1)` 为什么硬编码？**

开发环境有 GPU 0（显示）和 GPU 1（计算）。硬编码固定用 GPU 1。如果只有单 GPU 会崩溃——应改为可配置。

**Q159: `logger.py` 日志系统怎么工作？**

`create_logger(log_path)`：FileHandler（写文件）+ StreamHandler（写 console）。格式：`时间 - 级别 - 消息`。路径 = `log_dir/training.log`。支持 DDP rank filter。

**Q160: `demo.py` 做什么？怎么用？**

单图推理 demo：dlib 检测人脸 → 68 关键点对齐 → CLIP 前向 → 输出 prob。用于快速测试和演示。

---

## 第十三章：实验复现

**Q161: 复现本项目的完整步骤？**

```bash
git clone git@github.com:sixtdreanight/LoRA-TextureTTA.git
cd DeepfakeBench
# 创建环境: conda create -n effort python=3.10 && conda activate effort
# 安装: pip install torch transformers albumentations scikit-learn loralib opencv-python tqdm pyyaml tensorboard
# 下载 CLIP ViT-L/14 → training/models--openai--clip-vit-large-patch14/
# 准备 FF++ 数据集 → JSON
# 修改 effort.yaml 路径
python3 training/train.py --detector_path ./training/config/detector/effort.yaml \
    --train_dataset FaceForensics++ --test_dataset Celeb-DF-v2
python3 testall.py --detector_path ... --weights_path <best_ckpt.pth> \
    --test_datasets Celeb-DF-v1 Celeb-DF-v2 DFDC DFDCP FF++ UADFV
```

**Q162: 修改什么配置切换 Mixup 开关和参数？**

`effort.yaml`：
- `use_mixup: true/false`（开关）
- `mixup_gamma: 0.2`（不对称强度）
- `mixup_k: 1`（候选数）
- `mixup_alpha: 5.0`（λ 分布）

**Q163: 怎么用 sweep 脚本？跑完怎么看结果？**

```bash
cd DeepfakeBench && chmod +x run_sweep.sh
nohup bash run_sweep.sh > sweep_master.log 2>&1 &
tail -50 sweep_master.log  # 看排序结果
cat sweep_results.tsv      # 看原始数据
```

**Q164: Checkpoint 在哪？怎么加载推理？**

路径：`log_dir/effort_{timestamp}/test/{dataset}/ckpt_best.pth`。
```python
ckpt = torch.load(path)
model.load_state_dict(ckpt)
```

**Q165: 硬件需求？**

GPU：≥12GB 显存。CPU：8 核+。存储：FF++ 数据集 ~2GB + CLIP 权重 1.6GB。训练时间：~2h。

---

## 第十四章：深度理论扩展

**Q166: 不对称 Mixup 标签的极限行为——γ→0 和 γ→∞？**

γ→0：$\lambda^\gamma \to 1$（∀λ>0），$\tilde{y} \to 0$——全判真。
γ→∞：$\lambda^\gamma \to 0$（∀λ<1），$\tilde{y} \to 1$——全判假。

**Q167: Hardest-K 损失最大值等价于什么统计量？**

K 个独立候选的 CE loss，argmax 来自 Gumbel 分布（极值类型 I）。$E[\max L] \approx \mu + \sigma \cdot (-\log\log K + const)$。K 越大期望损失越高→梯度惩罚越重。

**Q168: Mixup 对模型校准有什么影响？**

Mixup 训练通常改善校准（预测概率更接近真实准确率）。模型学会了"不确定"的软标签区域，不会对混合样本过自信。本项目未测量校准。

**Q169: 训练 α=5.0 和测试分布不匹配，Mixup 还有效吗？**

Mixup 仅训练。测试不混合。50/50 混合下模型学到的边界理论上更平滑，应对测试的纯样本时泛化可能更好。

**Q170: 不对称 Mixup 和 Focal Loss 有什么联系？**

Focal Loss：$-(1-p_t)^\gamma \log p_t$（加重难样本权重）
不对称 Mixup：$\tilde{y} = 1 - real\_prop^\gamma$（改变混合样本标签）
两者都用 γ 调"难度感知"，但机制不同。可组合使用。

**Q171: token 级别的 deepfake 检测——ViT 哪些 token 对检测最有信息量？**

人脸区域 token（约占 20-30%）对此任务最相关。换脸后的"边缘 token"（人脸-背景交界）可能含最丰富的混合痕迹。CLS token 全局聚合丢失空间信息——更好的聚合方式可能更优。

**Q172: 为什么只用 CLS token 而非所有 token 的 mean/pooling？**

CLS 被训练来聚合全局信息。但 deepfake 伪影可能仅局部（眼睛、嘴、边缘）——CLS 可能未充分关注。替代：(1) 所有 patch mean pooling；(2) attention-weighted pooling；(3) 只取人脸 token mean。未探索。

**Q173: Mixup 对 real/fake 二分类的决策边界几何影响？**

标准训练边界穿样本间。Mixup 在样本间填插值点→边界平滑。不对称标签使边界倾斜方向改变：γ<1 向 Fake 方向移（更难判假），γ>1 向 Real 方向移（更容易判假）。

**Q174: 如果真假样本数量不平衡（Real >> Fake），γ 该怎么调？**

Real 远多于 Fake：应调大 γ（>1），让模型对假图更敏感——否则模型把假图当成"稀有的真图变体"。Fake 远多于 Real：应调小 γ（<1），防止过度敏感。

**Q175: OWTTT 为什么不用于训练？训练用动态阈值会影响什么？**

OWTTT 是测试时适应，不依赖标签。训练用动态阈值 ACC 会随队列波动，不利于判定"模型有没有进步"。固定阈值 0.5 的趋势比 OWTTT 更可读。

---

## 第十五章：对比与展望

**Q176: 和从零训练 Xception 比，CLIP+LoRA 的优势？**

Xception 从零训需更多数据。CLIP 预训练起点更高。LoRA 只训 0.26% 参数，速度更快（2h vs ~6h），泛化可能更好。

**Q177: 和全量微调 ViT-L/14 比？**

全量微调 307M 参数→训练慢、显存大、更易过拟合。数据多（>10 万）可能更好。本项目 ~8000 样本，LoRA 是更安全的选择。

**Q178: 和最新 SOTA 方法比，什么位置？**

SOTA（2024-2025）Celeb-DF-v2 video_auc 普遍 >0.95。本项目 ~0.94，差 1-2 点。但训练成本极低（2h vs 数天）。

**Q179: 最优先的未来改进？**

1. 多数据集联合训练（FF++ + Celeb-DF + DFDC）
2. 更长时间训练（20-50 epoch）
3. 对比 CLIP vs ImageNet ViT vs DINOv2
4. GenImage 上验证 K>1
5. 多 seed 验证显著性

**Q180: 如果 GenImage K>1 有效，说明什么？**

说明 Hardest-K 确实需要"假图质量参差不齐"的场景。GenImage 含 8 种不同生成器→质量差异巨大→候选间有真正的难度差异→K>1 有用。FF++ 单一生成器掩盖了其价值。

---

## 第十六章：其他骨干与损失函数

**Q181: 项目中哪些 backbone 被注册（可用）？哪些代码存在但未注册？**

注册：Xception, ResNet34, Meso4, MesoInception4, EfficientNetB4。
未注册：adaface, cls_hrnet, iresnet, resnet（被 adaface 依赖不直接注册）, vgg（误放的损失文件）, xception_ffd。CLIP 不走注册表（直接从 transformers 加载）。

**Q182: 12 个注册损失函数各有什么用途？本项目为什么只用 2 个？**

注册：cross_entropy, bce, am_softmax, am_softmax_ohem, capsule_loss, consistency_loss, contrastive_regularization, classNseg_loss, id_loss, jsloss, l1loss, vgg_loss。只用了 cross_entropy + margin loss。其余供不同检测器使用。

**Q183: EffortDetector 里 CLIP 加载路径在哪？为什么本地化？**

`effort_detector.py` L128：`CLIPModel.from_pretrained("/home/.../models--openai--clip-vit-large-patch14")`。本地化避免了每次从 HuggingFace 下载 ~1.6GB 权重。

**Q184: 两个 `Registry` 类（`utils/` & `metrics/`）有什么区别？**

完全相同的代码。`utils/registry.py` 实际使用，`metrics/registry.py` 从未被 import——历史遗留。

---

## 第十七章：补充——训练管线细节

**Q185: `train_step` 中三个 optimizer 路径（标准/SAM/PCGrad）的逻辑？**

```python
# 路径1: config['optimizer']['type'] == 'sam'（SAM 作为基础优化器）
if config['optimizer']['type'] == 'sam':
    for i in range(2):
        predictions = model(data_dict)
        losses = model.get_losses(data_dict, predictions)
        optimizer.zero_grad()
        losses['overall'].backward()
        if i == 0: optimizer.first_step(zero_grad=True)
        else: optimizer.second_step(zero_grad=True)

# 路径2: optimizer_wrapper == 'sam' 或 'pcgrad'
elif isinstance(self.optimizer, SAM): ...  # SAM wrapper
elif isinstance(self.optimizer, PCGrad):
    optimizer.pc_backward([losses['real_loss'], losses['fake_loss']])
    optimizer.step()

# 路径3: 标准 forward/backward/step
else: optimizer.zero_grad(); losses['overall'].backward(); optimizer.step()
```

**Q186: PCGrad 的 `pc_backward` 具体做什么？**

1. 每个 loss 独立 backward（独立梯度）
2. 每对梯度 (g_i, g_j) 检查冲突（点积 < 0）
3. 冲突时：$g_i' = g_i - \frac{g_i \cdot g_j}{\|g_j\|^2}g_j$
4. 合并（mean 或 sum）
5. 赋给 `param.grad`

**Q187: PCGrad 非共享参数用 sum 累积、共享参数用 mean——导致什么？**

非共享参数梯度是共享的 N 倍（N=任务数），优化偏向非共享方向。当前 PCGrad 未启用，不影响。

**Q188: LinearDecayLR 是怎么衰减学习率的？**

$lr = base\_lr - \frac{base\_lr}{n\_epoch - start\_decay} \cdot (epoch - start\_decay)$（当 epoch > start_decay）。当前未启用。

**Q189: SAM 的扰动步和更新步具体做什么？**

扰动步：$w' = w + \rho \cdot g/\|g\|$（沿梯度方向扰动到更尖锐位置）
更新步：$w = w - \eta \cdot \nabla L(w')$（从扰动点计算梯度做更新）
$\rho = 0.05$。两步各需一次前向+反向。

**Q190: train_epoch 中 `times_per_epoch` 是什么？为什么 = 2？**

每 epoch 测试 2 次（半 epoch 一次）。更多测试 = 更频繁的 best ckpt 更新，但拖慢训练。2 是平衡点。

**Q191: 训练时 `data_dict` 里有哪些 key？各是什么？**

```python
{'image': [B,3,224,224],    # 图像 tensor（可能含 N 维 if multi_crop）
 'label': [B],               # 硬标签 (0/1)
 'label_soft': [B],          # 软标签 [0,1]（仅 Mixup 启用时）
 'landmark': [B,...] or None, # 人脸关键点（68 点 or None）
 'mask': [B,H,W] or None,    # 分割掩码（or None）
 'texture_scores': [B,N] or None}  # 纹理分数（多裁剪+纹理模式）
```

**Q192: collate_fn 怎么处理 None 值？**

```python
@staticmethod
def collate_fn(batch):
    image = torch.stack([b['image'] for b in batch])
    label = torch.LongTensor([b['label'] for b in batch])
    landmark = torch.stack([b['landmark']]) if batch[0]['landmark'] is not None else None
    mask = torch.stack([b['mask']]) if batch[0]['mask'] is not None else None
    texture_scores = torch.stack([b['texture_scores']]) if batch[0].get('texture_scores') is not None else None
    return {'image': image, 'label': label, 'landmark': landmark, 'mask': mask, 'texture_scores': texture_scores}
```

**Q193: `save_best` 为什么跳过 FFpp_pool 数据集？**

```python
FFpp_pool = ['FaceForensics++','FF-DF','FF-F2F','FF-FS','FF-NT']
if key not in FFpp_pool:
    self.save_ckpt('test', key, ...)
```

因为这些是训练域内数据集，ckpt 不应基于同域指标保存——会倾向选"对训练域最好而非泛化最好"的模型。

**Q194: TensorBoard 写了什么？怎么启动？**

每 300 iter 往 TensorBoard 写 loss 和 metric 曲线。每测试集一个 writer key。`tensorboard --logdir=<log_dir> --port=6006` 启动。可看到 epoch 级别的 training loss 和 testing metric 趋势。

**Q195: `parse_metric_for_print` 怎么格式化输出？**

```python
def parse_metric_for_print(metric_dict):
    for key, value in metric_dict.items():
        if key != 'avg':
            str += f"| {key}: " + " ".join(f"{k}={v}" for k,v in value.items()) + " |\n"
        else:
            for avg_key, avg_val in value.items():
                if avg_key == 'dataset_dict':
                    for k,v in avg_val.items(): str += f"| {k}: {v} |\n"
                else: str += f"| avg {avg_key}: {avg_val} |\n"
```

输出 `| avg auc: 0.92 |` 等。只输出 best metric（metric_scoring 指定的指标）。

**Q196: `get_respect_acc` 有什么已知问题？**

`trainer.py` L476-479：假设所有 real（label=0）在数组前半部分。shuffle 后不成立 → acc_real/acc_fake 计算错误。仅在 TensorBoard 打印、不影响训练。

**Q197: train.py L222 的 LMDB JSON 文件夹切换是什么？**

```python
if config['lmdb']:
    config['dataset_json_folder'] = 'preprocessing/dataset_json_v3'
```

LMDB 模式使用 v3 版本的 JSON 索引（匹配 LMDB key 命名）。文件系统模式使用默认版本。

**Q198: `build_backbone` 中用字符串匹配 `target_modules` 有什么风险？**

`"out_proj"` 可能会匹配 `"output_projection"`（如果存在）。但 CLIP ViT 中没有此类命名，实际不上触发误匹配。

**Q199: `self.center` 的初值怎么设？为什么用 randn？**

```python
self.center = nn.Parameter(torch.randn(1024))
```

随机初始化在特征空间中放一个随机锚点，随训练逐步收敛到真实样本的中心。randn 产生单位球面上的均匀分布，不偏向任何方向。

**Q200: 分类头 bias 是多少参数？能不能不用？**

bias 只有 2 个标量。PyTorch 的 `nn.Linear` 默认有 bias。对二分类，这两个标量不影响方向判别，但略改善数值稳定性。关掉影响极小。

---

## 第十八章：补充——数据集的更多细节

**Q201: `load_rgb` 中 L300-333 硬编码 `/home/user1/effort/data` 是什么？**

如果文件路径不以 `/` 开头，自动拼上硬编码前缀。是一种"默认数据目录"的快捷方式。在其他服务器/Windows 上会直接崩溃。应改为 config 项。

**Q202: dlib face detector 在数据集 `__init__` 中被加载但从未在 `__getitem__` 使用——为什么？**

历史遗留。`self.face_detector = dlib.get_frontal_face_detector()` 每次初始化数据集都加载。demo.py 中独立做人脸检测，数据集类不需要。冗余依赖。

**Q203: `data_aug` 方法和 config 中 `use_data_augmentation` flag 的关系？**

config `use_data_augmentation: true` → 训练时调用 `self.data_aug()`。为 false → 返回原始图像。测试时从来不调 `data_aug()`（由 mode='test' 分流）。

**Q204: Albumentations 增强的随机种子怎么保证可复现？**

Albumentations 用 `random` 和 `numpy` 的全局随机状态。`train.py` 中的 `init_seed(config)` 设置了 `random.seed(1024)` 和 `np.random.seed(1024)`，保证增强的可复现。

**Q205: 多裁剪时图像 tensor 的形状变化？**

训练：`[B, 3, 224, 224]`（4D）。
测试+多裁剪：`[B, N, 3, 224, 224]`（5D，N=num_crops=5）。
训练时不裁剪 → 保持 4D。

**Q206: 视频数据集取帧——clip 模式 vs uniform 模式？**

clip 模式：取 `clip_size` 帧的连续段。uniform 模式：按 `frame_num` 均匀取帧。FF++ 用 clip 模式（连续 8 帧，~0.27s）。保证帧间有运动连贯性。

**Q207: 如果某视频帧数不足 frame_num 怎么办？**

`abstract_dataset.py` 中有循环取帧逻辑——不够时重复取已选的帧。对极短视频（如 GIF）有处理。

**Q208: C23 vs C40 压缩质量的区别？本项目为什么用 C23？**

C23 = 高压缩（低质量），C40 = 轻压缩（高质量）。C23 更贴近社交媒体视频的真实退化情况——压缩已经抹去了部分伪影，检测更难。

**Q209: JSON 索引文件存在哪里？格式是？**

`preprocessing/dataset_json/`。每数据集一个 JSON 文件。格式：`[{"img_path": "...", "label": 0/1, "video_name": "..."}, ...]`。训练前需要预生成。

**Q210: `DeepfakeAbstractBaseDataset` 的 `__len__` 怎么算？**

返回 `len(self.image_list)`。image_list 是 `__init__` 中从 JSON 收集来的所有图像路径。每帧算一个样本。

---

## 第十九章：补充——评估与指标细节

**Q211: `calculate_metrics_for_train` 和 `get_test_metrics` 区别？**

`calculate_metrics_for_train`：每 batch 的快速 AUC/EER/ACC/AP 计算。用于训练时 TensorBoard。
`get_test_metrics`：全测试集一次性计算，含视频级指标（video_auc 等）。

**Q212: 视频级 ACC 怎么算？当前实现有什么问题？**

视频级 ACC：帧预测均值 > 0.5 → 判假。硬编码 0.5 阈值——没有用 OWTTT 结果。与帧级 ACC（使用 OWTTT 动态阈值）不一致。

**Q213: `Metrics_batch` 和 `Metrics_all` 的区别？**

`Metrics_batch`：逐 batch 累加，用 100 点插值估计 AUC。速度快但精度低。
`Metrics_all`：收集全部预测后统一算，精度高但内存大。测试时用后者。

**Q214: `Recorder` 类怎么用？**

```python
recorder = Recorder()
recorder.update(0.8)  # 累加
recorder.update(0.9)
avg = recorder.average()  # 0.85
recorder.clear()  # 重置
```

简单的运行均值追踪——维护 sum 和 count。

**Q215: testall.py 的 `METRIC_RE` 正则能匹配什么格式？**

```python
METRIC_RE = re.compile(r"^([a-zA-Z_]+):\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)$")
```

匹配 `metric_name: float_value`（支持科学计数法）。例如 `acc: 0.8273`、`best_th: 0.5950`。

**Q216: `Using Adaptive Threshold: 0.9900` 会不会被 testall.py 误解析？**

`Threshold` 符合 `[a-zA-Z_]+` → 会匹配正则。得到 `Threshold: 0.9900` 但无人使用该 key。不影响最终结果。

**Q217: KDE 画密度图的 `bw_method=0.08` 是否合理？**

固定 bandwidth，不随数据量自适应。对 800~36000 样本的不同数据集用同一 bandwidth → 小数据集过度平滑、大数据集过度细粒。用 Scott's rule 更合理。

**Q218: `prob_density.png` 保存后怎么看？**

用任意图片查看器打开。x 轴=预测分数(0→1)，y 轴=密度。理想 = 两曲线完全分离。重叠越大→模型越差。

**Q219: `save_data_dict` 做什么？为什么 pickle？**

```python
with open('data_dict_{phase}.pickle', 'wb') as f:
    pickle.dump(data_dict, f)
```

保存数据集元信息（图像路径列表等），供后续分析和可复现。pickle 序列化 Python 对象更快但不可读。json 更可读但略慢。

**Q220: `save_feat` 存什么？什么时候用？**

```python
np.save(feat_path, features)  # [N, 1024] 所有样本的特征
```

存储全测试集特征供后续分析：PCA 可视化、t-SNE、特征分布统计。`analysis/pca_rank.py` 依赖此文件。

---

## 第二十章：补充——训练中的其他问题

**Q221: Mixup 的 `alpha` 默认值和 config 值为什么不同？**

代码默认 `alpha=1.0`（向后兼容），config 设 `alpha=5.0`（sweep 最优）。config 值通过 kwargs 传入覆盖默认。

**Q222: `optimizer_wrapper: null` vs `optimizer_wrapper: sam` 的区别？**

null → 标准优化。sam → 用 SAM wrapper 包裹已有的 optimizer（如 Adam+SAM）。代码中 `train_step` 有两个 SAM 路径：一个处理 `optimizer.type == 'sam'`，另一个处理 `isinstance(optimizer, SAM)`。

**Q223: 训练中 `model.module` 检查的用意？**

DDP wrap 后 `model.module` 指向底层模型。单 GPU 时 `model.module` 不存在 → 直接取 `model`。兼容单/多 GPU 的防御性写法。

**Q224: 为什么要分别保存每个测试数据集的 checkpoint？**

`save_ckpt('test', 'Celeb-DF-v2', ...)` 和 `save_ckpt('test', 'avg', ...)`。avg ckpt 是最终使用的——在所有数据集上综合考虑。各数据集独立 ckpt 供特定场景选择。

**Q225: `manualSeed: 1024` 为什么是这个数？可以改吗？**

任意选定。改任何值都可以——重要的是**固定**并且**记录**。1024 是 2^10，计算机友好。

**Q226: `torch.backends.cudnn.benchmark = True` 做什么？**

让 cuDNN 自动搜索最优卷积算法（针对输入尺寸）。初始有 warmup 开销但后续加速。对 ViT（主要用矩阵乘法而非卷积）影响有限。但会让结果在 run 间不可复现——不同算法选择有微小浮点差异。

**Q227: 训练中 Tqdm 的控制字符残留会影响日志解析吗？**

`tqdm` 用 `\r` 和 `\033[A` 控制终端显示。重定向到文件时这些字符残留在日志中。但 `grep`/`regex` 可以跳过控制字符，不影响指标解析。

**Q228: `train.py` 的 CLI `--mixup_gamma` 和 yaml `mixup_gamma` 的优先级？**

CLI 覆盖 yaml：`if args.mixup_gamma is not None: config['mixup_gamma'] = args.mixup_gamma`。但 `--mixup_k` 和 `--mixup_alpha` 没有 CLI 参数——必须改 yaml。

**Q229: 训练中被 `try/except` 保护的区域——有哪些？**

`train_epoch` 整体无 try/except——任何错误直接终止。`test_one_dataset` 无 try/except。`get_test_metrics` 中视频级计算有 try/except（L163-168），视频级失败时 fallback 到帧级 AUC。

**Q230: `train.py` 加载权重时 `strict=True` 和 `False` 的区别？**

`model.load_state_dict(weights, strict=True)`（train.py/test.py 训后用） → 要求 checkpoint 和模型结构完全匹配，不匹配则报错。`strict=False`（demo.py 中） → 静默忽略不匹配的 key。严格加载更安全。

---

## 第二十一章：补充——架构与工程深度

**Q231: 项目中哪些代码路径因为没有调用而从未在线运行？**

`loss/classNseg_loss.py`（forward 引用不存在的变量）、`loss/det_loss.py`（已注释掉）、`analysis/logits_decision_boundary.py`（依赖不存在的 Dataset 类）、`networks/vgg.py`（误放在 networks 目录且未注册）、`metrics/registry.py`（重复且未 import）。

**Q232: `script.py` 做什么？什么时候用？**

权重诊断工具：加载 .pth → 对比 ckpt keys vs model state_dict keys → 打印交集/ckpt 独有/model 独有的 keys。开发调试用，非训练流程。

**Q233: `demo.py` 的推理流程和 test.py 有什么不同？**

demo.py：单图 → dlib 人脸检测 → 68 关键点对齐 → CLIP 前向 → prob。不做 multi_crop，不做 TAA。适用场景：快速单图测试和演示。

**Q234: 如果要让项目支持新数据集，需要改哪些文件？**

1. `train_config.yaml`：添加 `label_dict` 条目
2. `effort.yaml`：添加数据集名到 `all_dataset` 和/或 `test_dataset`
3. `preprocessing/dataset_json/`：准备 JSON 索引文件
4. 如果数据路径不标准：修改 `abstract_dataset.py` 的路径拼接逻辑

**Q235: `effort.yaml` 中每个字段都有什么用途？**

log_dir（日志路径）、model_name（模型名/注册 key）、backbone_name（骨干名）、train_dataset/test_dataset（数据列表）、compression（压缩质量）、train/test_batchSize、workers（DataLoader 并行数）、frame_num（取帧数）、resolution（输入尺寸）、data_aug（增强参数）、mean/std（归一化统计量）、optimizer（优化器参数）、lr_scheduler、nEpochs、loss_func（损失函数名）、metric_scoring（选 ckpt 标准）、ngpu/cuda/cudnn、use_loralib、multi_crop 系列、use_texture_crop 系列、margin_loss 系列、optimizer_wrapper、sam_rho、use_mixup 系列。

**Q236: 模型保存和加载的完整路径是？**

保存：`{log_dir}/{model_name}_{timestamp}/test/{dataset}/ckpt_best.pth`
加载：`torch.load(path, map_location='cpu')` → `model.load_state_dict(ckpt)`

**Q237: CUDA_VISIBLE_DEVICES 环境变量和代码中 `torch.cuda.set_device(1)` 哪个优先级高？**

`CUDA_VISIBLE_DEVICES` 先发生（OS 级别，限制可见 GPU），`set_device(1)` 在可见 GPU 中选 index=1。两者组合可能导致：如果 `CUDA_VISIBLE_DEVICES=0` 只暴露一块 GPU，`set_device(1)` 会报错。

**Q238: `find_unused_parameters=True` 在 DDP 中做什么？**

DDP 初始化时选项。检测哪些参数没有在 loss 中用到（梯度为 None）。这些参数不会在所有 GPU 间同步梯度，避免因 freeze 参数导致的 DDP 错误。本项目 LoRA 仅更新少量参数，此选项确保稳定。

---

## 第二十二章：补充——理论延展

**Q239: LoRA rank=4 时，每个 attention 矩阵的 BA 乘积能表达什么？**

B [1024×4] 和 A [4×1024] 的乘积 = 1024×1024 满秩矩阵，但秩最高为 4。相当于原始权重 W 在 4 个独立方向上的"微调"——这四个方向是训练学到的"deepfake 检测相关方向"。如果 CLIP 的 1024 维特征空间中刚好有 4 个方向与 deepfake 伪影相关，rank=4 就够了。

**Q240: 如果 Mixup γ 和 Focal Loss γ 都设，效果会怎样？**

Mixup γ=0.2（标签偏真）+ Focal Loss γ=2（难样本重加权）→ 模型既会因 Mixup 保守判定、又会因 Focal Loss 关注难样本。两者相互作用复杂，可能相互抵消或放大。未实验——是一个值得探索的组合。

**Q241: K=1 的 asymmetric_mixup 和 hardest_k_mixup 在数值上完全等价吗？**

当 K=1，`hardest_k_mixup` fallback 到 `asymmetric_mixup`，完全等价（同 batch 同 λ 同配对）。但当 `hardest_k_mixup` 被直接调用且 K=1 时，走 if 分支返回 — 跟 `asymmetric_mixup` 共享 λ 但配对可能不同（因为 `asymmetric_mixup` 用 `randperm` 而 `hardest_k_mixup` 用 `randint(fake_idx)`）。不完全等价——但结果上无显著差异。

**Q242: OWTTT 和 GMM 在理论上谁更优？为什么都不 work？**

OWTTT 假设双峰分布通过最小化类内方差找谷底——不假设分布形式（非参数），但假设了双峰存在。GMM 假设两个高斯分布，找到它们的贝叶斯决策边界——假设了分布形式（参数化），但不需要双峰明显。都不 work 的原因相同：当模型分数分布不是双峰（重叠严重）时，任何"找最优切割点"的方法都在找一个不存在的切割点。

**Q243: ViT 的 16 头分别关注什么？本项目有分析吗？**

无。可通过可视化各头 attention map 分析——如某头关注人脸区域、某头关注背景、某头关注边缘。对 deepfake 检测，可能发现"关注换脸边界"的头和"关注眼睛反射"的头。但本项目未做 attention 可视化。

**Q244: 为什么 CLIP (ViT) 而非 CLIP (ResNet)？如果两个都试会怎样？**

ResNet 感受野逐层增大，对局部纹理敏感但对全局一致性检测不如 ViT。如果 ResNet 版本在跨域泛化上更好，可能说明全局一致性没那么重要——这本身就很有信息量。未做对比是本项目最大的缺失实验之一。

---

## 第二十三章：补充——复现与调试

**Q245: 训练时怎么知道没有过拟合？**

看 TensorBoard 中训练 loss 和测试 AUC 的曲线。如果训练 loss 持续降但测试 AUC 不再上升 → 过拟合开始。本项目没有早停——固定 10 epoch。建议监控 `dataset: avg` 的 AUC 趋势。

**Q246: 训练中 metric 突然全变 NaN 或 Inf 怎么办？**

检查：lr 是否太大、weight_decay 是否太大、数据中是否有 NaN 值、归一化是否正确。用 `torch.autograd.set_detect_anomaly(True)` 定位哪个操作为首次产生 NaN。通常在 backward 之前某个操作就出了问题。

**Q247: `CUDA out of memory` 怎么办？**

减小 batch_size、减小 num_crops（测试时）、关闭 DDP、使用 `torch.cuda.empty_cache()` 清理碎片、使用 gradient checkpointing（未实现）。

**Q248: 怎么确认 LoRA 真的在工作？训练初期 loss 应该接近随机吗？**

训练初期（epoch 0, iteration 1）：B=0 使 LoRA 输出为 0，模型行为 = 冻结 CLIP + 随机初始化的分类头。loss 应该接近 `-log(0.5) ≈ 0.693`（二分类随机水平）。如果 loss 远高于 0.693，说明分类头初始化或归一化有问题。

---

## 第二十四章：总结

**Q249: 做这个项目最大的收获是什么？**

1. CLIP 预训练特征的泛化能力确实强——冻结后仅微调 0.26% 参数就能跨域检测 deepfake
2. 不对称 Mixup 的 γ=0.2 特效——保守标签策略在 deepfake 检测比标准 Mixup 好
3. Hardest-K 失败的经验——方法的理论价值取决于数据条件，FF++ 不够多样来支撑它
4. OWTTT 的局限——自适应方法是美好的理论，但在分布严重重叠时是无能为力的

**Q250: 如果一切从头开始，你会做什么不同的？**

1. 先做 CLIP vs ImageNet ViT vs EfficientNet 的基准对比，确认 CLIP 预训练是否有价值——这是所有决策的基石
2. LoRA rank 做消融（1/2/4/8/16）确定最优
3. 在 GenImage 多生成器数据集上测试——这才是 Hardest-K Mixup 真正的用武之地
4. 训更久（50 epoch）看 Mixup 的长期效果
5. 多 seed 实验确保结果的统计可靠性
6. 加入更丰富的增强（CutMix, FMix）做对比

---

## 附录 A：概念速查表

| 概念 | 本项目取值 |
|------|-----------|
| backbone | CLIP ViT-L/14 |
| LoRA rank (attn/head) | 4 / 2 |
| LoRA α (attn/head) | 16 / 8 |
| input resolution | 224×224 |
| batch_size | 32 |
| epoch | 10 |
| lr | 2e-4 |
| weight_decay | 5e-4 |
| frame_num | 8 |
| num_crops | 5 |
| λ ~ Beta(α,α) | α=5.0 |
| γ (mixup) | 0.2 |
| K (mixup) | 1 |
| margin m | 0.5 |
| OWTTT max_len | 512 |
| total params | 789,510 |
| train dataset | FF++ c23 |
| test datasets | 6 个 |
| optimizer | Adam |
| metric_scoring | auc |

## 附录 B：核心公式索引

| 公式 | 含义 |
|------|------|
| $h = Wx + b + BAx \cdot \alpha/r$ | LoRA 前向 |
| $\tilde{y} = 1 - (real\_prop)^\gamma$ | 不对称 Mixup 标签 |
| $\min w_0 Var_0 + w_1 Var_1 - \alpha\cdot gap$ | OWTTT |
| $S(I) = \beta s_{full} + (1-\beta)\sum w_j s_j$ | TAA |
| $\lambda \sim Beta(\alpha, \alpha)$ | 混合系数采样 |
| $L_{CE} = -\frac{1}{N}\sum[y\log p + (1-y)\log(1-p)]$ | 交叉熵 |

---

> **全文完。** 250 问覆盖项目全部细节，从"计算机怎么存储图像"到"Hardest-K 为什么失败"。希望这篇文档让你完全掌握这个项目。最重要的——动手跑一遍代码。深度学习的真谛在实践里。
