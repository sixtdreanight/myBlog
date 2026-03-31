---
title: PyTorch 入门教程
date: 2026-04-01
summary: 欢迎来到我的博客第一篇文章！这是一篇简短的PyTorch教程。
category: 教程
tags: [AI, DeepLearning, pytorch]
sticky: 1
---

# PyTorch 入门教程

> "工欲善其事，必先利其器。"

嗨，欢迎来到我的博客第一篇文章！如果你正在为"PyTorch 怎么入门"而焦虑，那你来对地方了（大概）。今天我们就来聊聊如何**从零开始，把 PyTorch 跑起来**。（不过其实这篇文档默认你有一点点开发基础）

---

## PyTorch 是何意味？

PyTorch 是 Meta（前 Facebook）开源的深度学习框架。如果你听说过 TensorFlow（不过看这篇文章的大部分应该都不知道罢），PyTorch 就是它最强劲的竞争对手。 而且在学术界和工业界，PyTorch 如今已经是当之无愧的主流选择。

PyTorch 最大的特点是**动态计算图**（Dynamic Computation Graph），这就是说，你写的代码就像普通 Python 一样直观，随时可以调试、随时可以修改，不像早期的 TensorFlow 那样需要先"定义图"再"运行图"。

---

## 环境安装

### 安装 PyTorch

推荐直接去官网 [pytorch.org](https://pytorch.org/get-started/locally/) 选择你的环境配置，会自动生成安装命令。

```bash
# 以 CPU 版本为例（适合入门练手）
pip install torch torchvision torchaudio
```

> **tips**：如果你有 NVIDIA 显卡，建议安装 CUDA 版本，训练速度会有质的飞跃。可以在官网上选对应的 CUDA 版本就行。

安装完成后，验证一下：

```python
import torch
print(torch.__version__)       # 打印版本号
print(torch.cuda.is_available()) # 检查 GPU 是否可用
```

---

## 核心概念：Tensor（张量）

PyTorch 的核心数据结构是 **Tensor**（张量）。你可以把它理解成一个"超级 NumPy 数组"——支持 GPU 加速，还能自动求导的NumPy数组。

### 创建 Tensor

```python
import torch

# 从列表创建
a = torch.tensor([1.0, 2.0, 3.0])
print(a)  # tensor([1., 2., 3.])

# 创建全零 / 全一矩阵
zeros = torch.zeros(3, 4)   # 3行4列的零矩阵
ones  = torch.ones(2, 3)    # 2行3列的一矩阵

# 随机初始化（训练中最常用）
rand  = torch.randn(3, 3)   # 从标准正态分布采样
```

### Tensor 的基本运算

```python
x = torch.tensor([1.0, 2.0, 3.0])
y = torch.tensor([4.0, 5.0, 6.0])

print(x + y)      # tensor([5., 7., 9.])
print(x * y)      # tensor([ 4., 10., 18.])
print(torch.dot(x, y))  # 点积：tensor(32.)

# 改变形状
z = torch.randn(4, 6)
print(z.reshape(2, 12).shape)  # torch.Size([2, 12])
print(z.view(3, 8).shape)      # torch.Size([3, 8])
```

---

## 自动微分：autograd（夯爆了）

这是 PyTorch 最神奇的地方之一。深度学习的核心是**反向传播**（Backpropagation），本质就是对损失函数求梯度。而 PyTorch 通过 `autograd` 帮你自动完成这件事。

```python
import torch

x = torch.tensor(3.0, requires_grad=True)  # 告诉 PyTorch 需要对 x 求导

y = x ** 2 + 2 * x + 1   # y = x² + 2x + 1

y.backward()  # 反向传播，自动计算梯度

print(x.grad)  # dy/dx = 2x + 2 = 2*3 + 2 = 8
               # 输出：tensor(8.)
```

`requires_grad=True` 就像给 PyTorch 贴了个小纸条：「嘿，记得跟踪这个变量的梯度！」

---

## 搭建神经网络：nn.Module

在 PyTorch 里，搭建一个神经网络需要用到 `torch.nn.Module`。你只需要继承它，定义好网络层和前向传播逻辑就行。

下面我们来搭一个最简单的**全连接网络**（Fully Connected Network）：

```python
import torch
import torch.nn as nn

class SimpleNet(nn.Module):
    def __init__(self):
        super(SimpleNet, self).__init__()
        self.fc1 = nn.Linear(784, 256)  # 输入784维，输出256维
        self.fc2 = nn.Linear(256, 128)
        self.fc3 = nn.Linear(128, 10)   # 输出10类（如手写数字识别）
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        x = self.fc3(x)
        return x

model = SimpleNet()
print(model)
```

输出大概长这样：

```
SimpleNet(
  (fc1): Linear(in_features=784, out_features=256, bias=True)
  (fc2): Linear(in_features=256, out_features=128, bias=True)
  (fc3): Linear(in_features=128, out_features=10, bias=True)
  (relu): ReLU()
)
```

干净、清晰，一目了然。这就是 PyTorch 的魅力。

---

## 模型初体验（）

光有网络还不够，我们来看一个完整的"小闭环"——数据 → 前向传播 → 计算损失 → 反向传播 → 更新权重。

```python
import torch
import torch.nn as nn
import torch.optim as optim

# 1. 准备假数据（实际场景中替换成真实数据集）
X = torch.randn(100, 784)   # 100个样本，每个784维
y = torch.randint(0, 10, (100,))  # 100个标签（0-9）

# 2. 实例化模型、损失函数、优化器
model = SimpleNet()
criterion = nn.CrossEntropyLoss()         # 交叉熵损失（分类任务常用）
optimizer = optim.Adam(model.parameters(), lr=0.001)  # Adam 优化器

# 3. 训练循环
for epoch in range(10):
    # 前向传播
    outputs = model(X)
    loss = criterion(outputs, y)

    # 反向传播 + 权重更新
    optimizer.zero_grad()   # 清空上一步的梯度，这步千万别忘！
    loss.backward()         # 计算梯度
    optimizer.step()        # 更新参数

    print(f"Epoch [{epoch+1}/10], Loss: {loss.item():.4f}")
```

这段代码是 PyTorch 训练的**标准模板**，建议抄下来背熟，以后你会反复用到。

---

## What's your mission next？

恭喜你，你已经掌握了 PyTorch 最核心的几个模块！接下来你可以探索：

数据加载  `torch.utils.data.Dataset` 和 `DataLoader` 
计算机视觉  `torchvision`、卷积神经网络（CNN）
自然语言处理  Transformer、Hugging Face + PyTorch
模型保存与加载  `torch.save()` / `torch.load()` 
GPU 训练  `.to('cuda')` 把模型和数据搬到显卡上

官方文档写得非常好，强烈推荐推荐：[pytorch.org/docs](https://pytorch.org/docs/stable/index.html)

---

## 总结

回顾一下今天学到的核心内容：

- **Tensor** 是 PyTorch 的基本数据单元，可以理解为支持 GPU 的 NumPy 数组
- **autograd** 帮你自动计算梯度，不需要手推偏导数
- **nn.Module** 是搭建神经网络的基类，继承它来定义你的模型
- **训练循环** 的四步口诀：前向传播 → 计算 Loss → `zero_grad()` → 反向传播 → 更新参数

深度学习看起来很难，但其实入门并不难。最重要的其实是**动手敲代码**，把每一段示例跑一遍，改一改参数，其实就能掌握一些了。

如果这篇文章对你有帮助，欢迎收藏或分享给同样有困境的朋友。我们下篇文章见！👋

---
