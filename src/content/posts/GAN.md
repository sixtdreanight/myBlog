---
title: 正交子空间微调：面向物理约束的轻量化拓扑生成对抗网络
date: 2026-04-01
summary: 本文针对GAN-based拓扑优化中物理约束微调导致多样性坍塌的问题，提出了正交子空间微调框架。通过SVD分解将预训练生成器的权重矩阵分解为主成分与残差成分，在微调过程中冻结主成分并仅在残差子空间内进行物理适配，从而在保持生成多样性的同时满足物理约束。
category: 学术研究
tags: [GAN, 拓扑优化, 正交子空间微调, SVD, 物理约束, 生成对抗网络, 轻量化微调, AI]
---

# 正交子空间微调：面向物理约束的轻量化拓扑生成对抗网络

## 摘要

生成对抗网络在拓扑优化中的应用面临两大核心困境：生成结构的物理性能不可靠，以及物理约束引入导致的生成多样性坍塌。本文从几何视角剖析这一困境的成因，指出其根源于物理损失梯度在生成器参数空间主方向上的投影干扰了预训练知识的稳定性。基于此分析，提出一种正交子空间微调框架，通过奇异值分解将预训练生成器的权重矩阵分解为主成分与残差成分，在微调过程中冻结主成分并仅在残差子空间内进行物理适配。本文从一阶近似的角度论证该框架如何通过限制参数更新方向来保护生成器的生成能力，并设计了一套数值验证方案以检验核心假设的合理性，包括基于贝蒂数的拓扑消融实验、物理损失梯度的能量投影分析以及基于雅可比矩阵有效秩的多样性估计。该方案为后续实验验证提供了明确的量化指标和工程实现策略。本工作为生成式拓扑优化中物理一致性与多样性的协同优化提供了新的技术思路和可验证的理论框架。

**关键词：** 生成对抗网络；拓扑优化；正交子空间；奇异值分解；数值验证

---

## 1 引言

拓扑优化旨在给定设计域、载荷与边界条件下寻求最优的材料分布，以实现轻量化、高刚度等目标。传统方法如SIMP（Solid Isotropic Material with Penalization）[1]依赖反复的有限元分析，计算成本高昂，难以处理高分辨率或非线性问题。近年来，生成对抗网络（Generative Adversarial Networks, GAN）因其强大的数据生成能力被引入拓扑优化领域，形成了GAN-based拓扑优化的新范式[2]。其核心思想是：以载荷条件、体积分数等为条件输入，由生成器直接输出优化拓扑，从而大幅缩短设计周期。

然而，现有GAN-based拓扑优化方法普遍面临两大困境：

- **困境一：生成结构的物理性能不可靠。** 纯GAN生成的结构往往视觉合理但力学性能不佳，表现为柔度过大、应力集中甚至结构不连通[3]。其根源在于生成器仅学习了训练数据的分布模式，而未内化材料力学的基本约束。
- **困境二：物理约束引入导致的多样性坍塌。** 为提升物理性能，对生成器进行全参数微调往往导致生成器"灾难性遗忘"，生成多样性急剧下降，最终仅收敛到少数几种极值解[4]。这一现象严重限制了GAN在拓扑优化中的实用性。

上述困境的数学本质是什么？本文从几何视角提出如下观点：物理约束的梯度方向在生成器参数空间的主方向上有显著投影，导致优化过程不可避免地干扰了生成器原有的生成能力。预训练GAN在大规模结构数据集上习得了丰富的拓扑几何先验，这些先验编码于生成器参数空间的特定方向中[5]。当引入物理损失进行微调时，若物理损失梯度在这些方向上有显著分量，则必然破坏原有的生成能力，导致多样性坍塌。

基于这一认识，本文提出正交子空间微调框架。该框架通过奇异值分解（Singular Value Decomposition, SVD）将预训练生成器的权重矩阵分解为主成分与残差成分[6]，在微调过程中冻结主成分以保护预训练知识，仅允许残差成分更新以适配物理约束。通过这样的操作，我们期望实现两个目标：

1. 物理适配的优化方向被限制在残差子空间内，不会干扰主成分所对应的生成能力；
2. 残差子空间仍具有足够的表达能力，能够容纳物理约束所需的结构调整。

### 本文的主要贡献

- 从几何角度阐明物理约束微调导致多样性坍塌的直观原因，建立参数空间方向与生成能力之间的关联；
- 提出正交子空间微调框架，通过SVD分解与主成分冻结，实现物理适配与通用知识保持的分离；
- 设计一套数值验证方案，通过拓扑消融实验、梯度能量投影分析和雅可比矩阵有效秩估计，为检验核心假设提供了明确的量化指标，并给出工程实现建议。

---

## 2 理论基础

### 2.1 拓扑优化的数学表述

拓扑优化问题可表述为：在给定设计域 $\Omega \subset \mathbb{R}^2$、载荷条件 $f$ 及边界条件 $\partial\Omega = \Gamma_D \cup \Gamma_N$ 下，寻求最优的材料分布密度场 $\rho: \Omega \to [0,1]$，使结构柔度最小化[1]：

$$
\begin{aligned}
\min_{\rho} \quad & C(\rho) = u^T K(\rho) u \\
\text{s.t.} \quad & K(\rho) u = f \\
& \int_{\Omega} \rho(x) dV \leq \bar{V} \\
& 0 \leq \rho(x) \leq 1, \quad \forall x \in \Omega
\end{aligned}
$$

其中 $u$ 为位移场，$K(\rho)$ 为依赖密度分布的全局刚度矩阵，$\bar{V}$ 为体积约束上限。在有限元离散下，设计变量为各单元密度 $\{\rho_e\}_{e=1}^N$，$N$ 为单元总数。

SIMP方法引入幂律插值模型：

$$
E_e(\rho_e) = E_{\min} + \rho_e^p (E_0 - E_{\min})
$$

其中 $E_0$ 为固体材料杨氏模量，$E_{\min} \ll E_0$ 为避免刚度矩阵奇异的小量，$p \geq 3$ 为惩罚因子，驱使中间密度向 $0$ 或 $1$ 收敛。

### 2.2 生成对抗网络与拓扑生成

条件生成对抗网络（Conditional GAN）由生成器 $G$ 与判别器 $D$ 组成[7]。对于拓扑优化任务，生成器以随机噪声 $z \in \mathcal{Z} \subset \mathbb{R}^{d_z}$ 和条件向量 $c$（编码载荷、边界条件、体积分数等）为输入，输出材料分布密度场 $\hat{\rho} = G(z, c)$。判别器则试图区分生成的结构与真实的最优拓扑结构。

训练目标为极小极大博弈：

$$
\min_G \max_D \mathbb{E}_{\rho \sim p_{data}} [\log D(\rho, c)] + \mathbb{E}_{z \sim p_z} [\log(1 - D(G(z, c), c))]
$$

预训练完成后，生成器 $G$ 在高维参数空间 $\Theta$ 上编码了从条件到拓扑结构的映射关系。在TopologyGAN[3]等工作中，生成器能够学习到从边界条件到优化拓扑的映射，但其泛化能力受限于训练数据的分布。

### 2.3 物理约束微调与多样性坍塌

设预训练生成器参数为 $\theta_{pre} \in \mathbb{R}^P$。为引入物理约束，定义物理损失函数 $\mathcal{L}_{phy}(\theta)$，例如基于有限元计算的柔度：

$$
\mathcal{L}_{phy}(\theta) = \lambda_c \cdot C(G_\theta(z, c)) + \lambda_v \cdot \|V(G_\theta(z, c)) - V_{target}\|
$$

全参数微调的目标为：

$$
\theta^* = \arg\min_{\theta} [\mathcal{L}_{GAN}(\theta) + \mathcal{L}_{phy}(\theta)]
$$

实验观察表明[4]，全参数微调后生成结果的多样性显著下降。GANTL[4]通过迁移学习缓解了这一问题，但未能从根本上解决微调过程中的知识干扰。

为量化这一现象，定义多样性度量：

$$
\text{Div}(\theta) = \mathbb{E}_{z_1, z_2} [\|G_\theta(z_1, c) - G_\theta(z_2, c)\|_1]
$$

观察发现，$\text{Div}(\theta^*) \ll \text{Div}(\theta_{pre})$，且下降幅度与物理损失权重 $\lambda_c$ 正相关。

**直观解释：** 预训练生成器的参数空间中有一些方向，沿这些方向移动会显著改变生成结果的几何形态（如孔洞数量、支撑结构布局）。物理损失的梯度在这些方向上的投影不为零，导致优化过程将参数沿这些方向移动，从而改变了生成器原本的"生成规律"，使得原本可能生成多种形态的能力丧失，最终只能生成满足物理约束的少数几种结构。

### 2.4 奇异值分解与参数空间方向

为识别参数空间中的"主方向"，我们考察生成器中线性层的权重矩阵 $W \in \mathbb{R}^{d_1 \times d_2}$。奇异值分解将 $W$ 分解为[6]：

$$
W = U \Sigma V^T = \sum_{i=1}^{r} \sigma_i u_i v_i^T
$$

其中 $r \leq \min(d_1, d_2)$ 为矩阵的秩，$U = [u_1, \ldots, u_{d_1}]$、$V = [v_1, \ldots, v_{d_2}]$ 为正交矩阵，$\Sigma = \text{diag}(\sigma_1, \ldots, \sigma_r, 0, \ldots)$。

**奇异值的几何意义：** $\sigma_i$ 度量了权重矩阵在方向 $u_i v_i^T$ 上的变换强度。较大的奇异值对应输入空间中变化显著的方向，这些方向对输出的贡献也更大。在模型微调的相关研究中[8]，这一性质被用于分析参数更新的本征维度。

需要特别说明的是，奇异值分解的主成分方向与生成结果的拓扑逻辑之间并无直接的等价关系。这一假设是本方法的核心前提，其合理性需结合后续数值验证方案进行检验。

基于此，我们将权重矩阵分解为"主方向"与"细节方向"。保留前 $k$ 个最大的奇异值，构造主成分权重：

$$
W_{main} = \sum_{i=1}^{k} \sigma_i u_i v_i^T
$$

剩余部分为残差权重：

$$
W_{res} = \sum_{i=k+1}^{r} \sigma_i u_i v_i^T
$$

主成分对应的子空间 $\mathcal{S}_{main} = \text{span}\{u_i v_i^T : i = 1, \ldots, k\}$ 承载了生成器的主要生成能力，残差子空间 $\mathcal{S}_{res} = \text{span}\{u_i v_i^T : i = k+1, \ldots, r\}$ 对应细节调整。

---

## 3 正交子空间微调框架

### 3.1 核心思想

基于上述分析，我们提出正交子空间微调（Orthogonal Subspace Fine-tuning, OSFT）框架。其核心思想是：在物理约束微调过程中，将生成器的参数更新限制在残差子空间 $\mathcal{S}_{res}$ 内，而与主成分子空间 $\mathcal{S}_{main}$ 保持正交，从而保护生成器的主要生成能力不受干扰。

**具体操作步骤如下：**

1. **预训练权重分解：** 对预训练权重 $W_{pre}$ 进行SVD，得到 $U, \Sigma, V$。

2. **主成分提取：** 选择能量保留阈值 $\tau$（例如 $\tau = 0.95$），确定最小的 $k$ 使得 $\sum_{i=1}^{k} \sigma_i^2 \geq \tau \sum_{i=1}^{r} \sigma_i^2$。构造 $W_{main} = \sum_{i=1}^{k} \sigma_i u_i v_i^T$。

3. **残差初始化：** 令 $W_{res}^{(0)} = \sum_{i=k+1}^{r} \sigma_i u_i v_i^T$。

4. **冻结与微调：** 在后续训练中，$W_{main}$ 被冻结，仅 $W_{res}$ 作为可学习参数参与更新。最终权重为 $W = W_{main} + W_{res}$。

### 3.2 正交性保持

由于 $W_{main}$ 和 $W_{res}$ 来自不同奇异向量张成的空间，两者天然正交。在梯度更新过程中，由于 $W_{res}$ 被独立优化，其更新方向自然保持在 $\mathcal{S}_{res}$ 内，无需额外的投影操作。现代深度学习框架通过设置 `requires_grad` 属性即可实现这一分离。

需要指出的是，权重空间的正交性并不等价于输出空间（生成结果）的正交性或解耦性。两个正交的参数更新方向，在非线性激活函数的作用下，完全可能在输出空间产生高度耦合的变化。这一局限性将在后续讨论中进一步阐述。

### 3.3 对生成多样性的保护

**分析1（一阶近似下的输出变化）：** 考虑生成器输出关于权重的变化。对于输入 $z$，生成结果关于权重的一阶泰勒展开为：

$$
G_{W_{main} + \Delta W}(z) \approx G_{W_{main}}(z) + \nabla_W G(z) \cdot \Delta W
$$

其中 $\nabla_W G(z)$ 是输出关于权重的雅可比矩阵。当 $\Delta W$ 被限制在 $\mathcal{S}_{res}$ 内时，其对输出的影响主要由 $\nabla_W G(z)$ 在 $\mathcal{S}_{res}$ 上的投影决定。

**分析2（一阶近似的有效性范围）：** 上述线性近似仅在 $\|\Delta W\|$ 较小的邻域内有效。实际微调过程中，物理约束的梯度可能较大，导致参数变化超出线性范围。因此，上述公式仅作为理论分析的起点，其精确性需通过实验验证。

**分析3（多样性损失的上界估计）：** 在OSFT框架下，多样性损失的一阶估计为：

$$
\Delta \text{Div} \leq \mathbb{E}_{z_1, z_2} [\|\nabla_W G(z_1) - \nabla_W G(z_2)\| \cdot \|\Delta W_{res}\|]
$$

由于 $\|\Delta W_{res}\|$ 通常小于全参数微调中的参数变化量，多样性损失可能被控制在较小范围内。但这一估计忽略了高阶非线性项的贡献。

### 3.4 残差子空间的表达能力

一个关键问题是：仅靠残差子空间的调整能否充分满足物理约束的要求？即物理约束所需的最优参数变化 $\Delta W^*$ 是否主要落在 $\mathcal{S}_{res}$ 内？

**观察：** 在GAN-based拓扑优化中，生成器的主要几何特征（如结构拓扑类型）相对稳定，物理约束主要影响局部材料分布[3-4]。例如，在悬臂梁设计中，可能需要调整支撑部位的厚度或孔洞的大小，但整体的轮廓形状不变。这种局部调整对应权重空间中的细节方向，即残差子空间。

**假设：** 设 $\Delta W^*$ 为满足物理约束的最优权重变化。根据经验观察，$\Delta W^*$ 在 $\mathcal{S}_{main}$ 上的投影较小，主要能量集中在 $\mathcal{S}_{res}$ 上。这一假设的合理性需通过实验验证，本文将在第4节设计数值验证方案对其进行检验。

**能量分布讨论：** 深度神经网络的奇异值分布通常呈现长尾形态[9]，即前几个奇异值占主导，剩余的大量奇异值虽小但数量众多。这意味着残差子空间虽单个方向贡献有限，但其高维度可能提供足够的表达自由度。

### 3.5 损失函数设计

OSFT框架的总损失函数为：

$$
\mathcal{L}_{total}(\theta_{res}) = \mathcal{L}_{GAN}(\theta_{pre} + \theta_{res}) + \alpha \mathcal{L}_{phy}(\theta_{pre} + \theta_{res})
$$

其中 $\alpha$ 为平衡生成质量与物理性能的超参数。与全参数微调相比，OSFT的优化变量仅包含 $\theta_{res}$，参数量大幅减少，这也有助于降低过拟合风险。

---

## 4 核心假设的数值验证方案

为了证明"SVD主成分对应核心拓扑逻辑，残差成分对应局部细节"以及"物理梯度主要集中在残差空间"这两个核心假设，本节提出一套三步数值验证框架。该框架不依赖于具体实验结果，而是通过定义量化指标和预期结果，为后续实验验证提供明确的方案设计。需要指出的是，这些指标仅用作后处理评估，不参与微调过程中的梯度传播。

### 4.1 验证一：权重子空间的拓扑消融实验

**目的：** 直观证明 $W_{main}$ 和 $W_{res}$ 在输出空间中负责不同的几何特征。

**方案设计：**

1. **基准生成：** 从预训练的TopologyGAN[3]中随机采样噪声 $z$，生成基准拓扑结构图像 $\hat{\rho} = G_{W_{pre}}(z)$。

2. **主成分截断（只保留细节）：** 将生成器特定层（如反卷积层）的权重替换为单纯的残差矩阵 $W \leftarrow W_{res}$，生成图像 $\hat{\rho}_{res}$。

3. **残差截断（只保留主成分）：** 将权重替换为单纯的主成分矩阵 $W \leftarrow W_{main}$，生成图像 $\hat{\rho}_{main}$。

4. **拓扑不变量度量：** 引入代数拓扑中的贝蒂数（Betti Numbers）作为量化指标[10]。对于二维图像，$\beta_0$ 代表连通分量数，$\beta_1$ 代表孔洞数量。由于贝蒂数为离散不可导的拓扑不变量，此处仅用作后处理评估，不参与梯度计算。定义拓扑保持度指标：

$$
\Delta \beta_0 = |\beta_0(\hat{\rho}) - \beta_0(\hat{\rho}_{main})|, \quad \Delta \beta_1 = |\beta_1(\hat{\rho}) - \beta_1(\hat{\rho}_{main})|
$$

5. **预期结果：** 若假设成立，应当观察到 $\Delta \beta_0 \approx 0$ 且 $\Delta \beta_1 \approx 0$，即主成分保留了所有的宏观拓扑特征。而 $\hat{\rho}_{res}$ 应表现为无意义的高频噪声，其贝蒂数将远偏离基准值。

### 4.2 验证二：物理损失梯度的能量投影分析

**目的：** 证明物理约束（柔度最小化）所需的参数更新方向，天然倾向于残差子空间 $\mathcal{S}_{res}$。

**方案设计：**

1. **梯度采样：** 在一批生成样本上，计算物理损失关于预训练权重的真实梯度 $G_{phy} = \nabla_W \mathcal{L}_{phy}$。

2. **正交分解：** 将梯度矩阵投影到通过SVD获得的主子空间和残差子空间上：

$$
G_{main} = U_k U_k^T G_{phy} V_k V_k^T, \quad G_{res} = G_{phy} - G_{main}
$$

3. **能量对齐度：** 定义梯度在残差空间中的能量占比为：

$$
\eta = \frac{\|G_{res}\|_F^2}{\|G_{phy}\|_F^2}
$$

4. **预期结果：** 如果 $\eta \gg 1 - \tau$（即梯度在残差空间的能量占比远大于残差空间本身的能量阈值，例如 $\eta > 0.8$），则可以用数值证据表明：物理约束天然倾向于利用细节方向进行调整，OSFT框架顺应了这一优化流形，而非粗暴的强行约束。

### 4.3 验证三：多样性坍塌的局部雅可比估计

**目的：** 绕开复杂的非线性，用一阶雅可比矩阵的有效秩来量化多样性保护。

**方案设计：**

1. **雅可比矩阵计算：** 利用自动微分，计算生成器输出关于潜变量 $z$ 的雅可比矩阵 $J_z = \frac{\partial G(z)}{\partial z} \in \mathbb{R}^{d_{out} \times d_z}$。在实际计算中，由于全雅可比矩阵维度过高（例如 $16384 \times 128$），直接计算可能导致显存溢出。可考虑采用随机投影（Random Projection）或截断奇异值分解（Truncated SVD）来近似估计有效秩，以降低计算开销[11]。

2. **多样性度量：** $J_z$ 的奇异值分布直接反映了生成器在当前点 $z$ 附近张成的流形维度。定义有效秩为：

$$
\text{Rank}_\epsilon(J_z) = \#\{i : \sigma_i / \sigma_1 > \epsilon\}
$$

其中 $\sigma_i$ 为 $J_z$ 的奇异值，$\epsilon$ 为阈值（如 $0.01$）。如果模型发生多样性坍塌，$\text{Rank}_\epsilon(J_z)$ 会显著下降。

3. **对比实验：** 分别在"全参数微调模型"和"OSFT微调模型"上计算一批样本的平均有效秩：

$$
\bar{R}_{full} = \mathbb{E}_z [\text{Rank}_\epsilon(J_z^{full})], \quad \bar{R}_{OSFT} = \mathbb{E}_z [\text{Rank}_\epsilon(J_z^{OSFT})]
$$

4. **预期结果：** OSFT框架下的平均有效秩应显著高于全参数微调，即 $\bar{R}_{OSFT} \gg \bar{R}_{full}$，从而在数值上证实了关于多样性保护的理论推导。

---

## 5 讨论

### 5.1 与现有方法的对比

为阐明OSFT的定位，将其与现有方法进行对比：

- **全参数微调：** 允许所有参数自由更新，没有对主成分的保护机制。当物理损失梯度在主成分方向上有显著投影时，必然导致多样性下降。GANTL[4]通过迁移学习部分缓解了这一问题，但未从根本上解决知识干扰。

- **低秩适配（LoRA）[12]：** 引入低秩矩阵 $AB^T$ 作为可学习参数，但不对应于残差子空间。LoRA的更新方向可能与主成分不正交，仍可能干扰主成分。此外，LoRA的参数效率虽高，但其低秩结构限制了表达能力。

- **OSFT：** 通过显式冻结主成分，确保物理适配不改变生成器的主要几何特征，从而更好地保护多样性。与基于SVD的参数高效微调研究[13]相比，OSFT将这一思想首次应用于拓扑优化中的物理约束微调。

### 5.2 维度选择与能量保留

主子空间的维度 $k$ 由能量保留阈值 $\tau$ 决定。$\tau$ 越大，保留的主成分越多，多样性保护越强，但留给物理适配的残差空间越小，可能限制适配能力。$\tau$ 越小，残差空间越大，适配能力越强，但可能丢失部分生成能力。实践中需根据具体任务在两者间权衡。参考SVD在特征提取中的应用[6]，通常取 $\tau \in [0.9, 0.95]$ 可取得较好平衡。

### 5.3 局限性与未来工作

本文的核心假设之一是：权重空间的主成分对应生成结果的主要几何特征。然而，这一假设存在明显局限：

1. **主成分的非语义性：** 奇异值分解仅反映了权重的能量分布，并未编码任何语义信息。主成分方向可能与可解释的几何特征无直接对应。

2. **非线性的耦合作用：** 即使两个参数更新方向在权重空间正交，经过多层非线性变换后，其在输出空间的效应可能高度耦合。因此，权重空间的正交性无法保证输出空间功能的分离。

3. **长尾分布的挑战：** 深度神经网络的奇异值长尾分布意味着残差子空间虽包含大量方向，但每个方向的贡献有限。这可能限制其对显著物理变化的表达能力。

4. **验证依赖：** 第4节提出的数值验证方案虽然能够检验这些假设，但其有效性依赖于实验实施和阈值选择。

**未来工作**可从以下方向展开：

1. 实施第4节提出的数值验证方案，通过具体实验量化OSFT框架的有效性，检验核心假设的成立范围；
2. 探索动态子空间扩展策略，根据物理约束的强度自适应调整残差空间的维度；
3. 结合扩散模型在拓扑优化中的最新进展[14]，探索更高效的生成式拓扑优化方法；
4. 研究权重空间解耦与输出空间解耦之间的深层关系，发展更严格的理论框架。

---

## 6 结论

本文针对GAN-based拓扑优化中物理约束微调导致多样性坍塌的问题，提出了正交子空间微调框架。该框架通过奇异值分解识别预训练生成器的主成分方向，在微调过程中冻结主成分，仅允许参数在残差子空间内更新，从而保护生成器的主要生成能力不受干扰。从一阶近似的角度论证了该框架对多样性的保护机制，并设计了一套数值验证方案，为检验核心假设提供了明确的量化指标。

本工作为生成式拓扑优化中物理一致性与多样性的协同优化提供了新的技术思路和可验证的理论框架。

---

## 参考文献

[1] Bendsoe M P, Sigmund O. Topology optimization: theory, methods, and applications[M]. Springer Science & Business Media, 2003.

[2] Oh S, Jung Y, Kim S, et al. Deep generative design: Integration of topology optimization and generative models[J]. Journal of Mechanical Design, 2019, 141(11): 111405.

[3] Nie Z, Lin T, Jiang H, et al. Topologygan: Topology optimization using generative adversarial networks based on physical fields over the initial domain[J]. Journal of Mechanical Design, 2021, 143(3): 031715.

[4] Behzadi M M, Ilies H T. Gantl: Toward practical and real-time topology optimization with conditional generative adversarial networks and transfer learning[J]. Journal of Mechanical Design, 2022, 144(2): 021711.

[5] Wang Z, Melkote S, Rosen D W. Generative design by embedding topology optimization into conditional generative adversarial network[J]. Journal of Mechanical Design, 2023, 145(11): 111702.

[6] Golub G H, Van Loan C F. Matrix computations[M]. JHU press, 2013.

[7] Goodfellow I, Pouget-Abadie J, Mirza M, et al. Generative adversarial nets[C]//Advances in neural information processing systems. 2014: 2672-2680.

[8] Aghajanyan A, Zettlemoyer L, Gupta S. Intrinsic dimensionality explains the effectiveness of language model fine-tuning[A]. 2020.

[9] Saxe A M, McClelland J L, Ganguli S. Exact solutions to the nonlinear dynamics of learning in deep linear neural networks[A]. 2013.

[10] Edelsbrunner H, Harer J. Computational topology: an introduction[M]. American Mathematical Society, 2010.

[11] Halko N, Martinsson P G, Tropp J A. Finding structure with randomness: Probabilistic algorithms for constructing approximate matrix decompositions[J]. SIAM review, 2011, 53(2): 217-288.

[12] Hu E J, Shen Y, Wallis P, et al. Lora: Low-rank adaptation of large language models[A]. 2021.

[13] Qiu Z, Liu Z, Liu W, et al. Orthogonal subspace decomposition for transfer learning[C]//International Conference on Learning Representations. 2022.

[14] Mazé F, Ahmed F. Diffusion models beat gans on topology optimization[A]. 2022.
