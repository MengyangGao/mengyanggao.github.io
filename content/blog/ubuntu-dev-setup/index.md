---
title_en: Ubuntu Environment Setup Guide
title_zh: Ubuntu 22.04/24.04 开发环境配置指南
summary: 本文面向带 NVIDIA GPU 和图形界面的 Ubuntu 桌面开发机（适用 22.04/24.04），覆盖基础开发工具、NVIDIA 驱动选择、CUDA Toolkit、Python 环境管理、PyTorch、GitHub SSH 配置、VS Code、中文输入法和 ROS 2。
publish_date: 2026-02-22
tags: [ubuntu, nvidia, cuda, pytorch, ros2, miniconda, uv, vscode, github]
draft: false
---


## 1. 基础开发工具

先更新系统并安装常用工具：
```bash
sudo apt update
sudo apt upgrade -y

sudo apt install -y \
  build-essential \
  cmake \
  git \
  curl \
  wget \
  vim \
  htop \
  tree \
  unzip \
  pkg-config \
  ca-certificates \
  software-properties-common \
  apt-transport-https
```

验证：
```bash
gcc --version
cmake --version
git --version
```

## 2. 安装 NVIDIA 驱动

先查看可用驱动列表：
```bash
sudo ubuntu-drivers list
```


* 安装推荐驱动：
    ```bash
    sudo ubuntu-drivers install
    ```
* 或者安装你选择的版本（以 570 为例）：
    ```bash
    sudo apt install -y nvidia-driver-570
    ```

重启：
```bash
sudo reboot
```

重启后验证：
```bash
nvidia-smi
```
如果 `nvidia-smi` 正常输出 GPU 信息，驱动层已经完成。

## 3. 安装 CUDA Toolkit

NVIDIA 官方文档区分了 `cuda-X-Y` 和 `cuda-toolkit-X-Y`。为了避免脚本覆盖我们手动选择的驱动，建议只安装 `toolkit`。

**注意：** 请根据你的 Ubuntu 版本修改下方的 `repos` 路径（如 `ubuntu2204` 或 `ubuntu2404`）。

添加 NVIDIA 官方 APT 源（以 24.04 为例）：
```bash
cd ~
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update
```

安装 CUDA Toolkit（以 CUDA 12.6 Toolkit 为例）：
```bash
sudo apt install -y cuda-toolkit-12-6
```

验证：
```bash
nvcc -V
```

## 4. 配置 CUDA 环境变量

将以下内容加入 `~/.bashrc`：
```bash
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
```

验证：
```bash
which nvcc
nvcc -V
```

## 5. Python 环境与包管理

在安装 PyTorch 之前，先建立隔离的 Python 环境。

### 5.1 方案 A：Miniconda

下载安装：
```bash
cd ~
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh
```

初始化并创建环境：
```bash
source ~/.bashrc
```

### 5.2 方案 B：uv

`uv` 是目前最快的 Python 包管理器，可与 Conda 配合使用。
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env
```

## 6. 安装 PyTorch 并验证 GPU

在激活的 Python 环境中，根据 [PyTorch 官网](https://pytorch.org/get-started/locally/) 生成对应的安装命令。

**注意：** 确保 `--index-url` 中的 CUDA 版本（如 `cu124` 或 `cu126`）与你安装的 Toolkit 匹配。


安装完成后验证：
```bash
python - <<'PY'
import torch
print("torch version:", torch.__version__)
print("torch cuda available:", torch.cuda.is_available())
print("torch cuda version:", torch.version.cuda)
if torch.cuda.is_available():
    print("gpu name:", torch.cuda.get_device_name(0))
PY
```

## 7. GitHub SSH 配置

生成新密钥：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

启动代理并添加密钥：
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

复制公钥内容：
```bash
cat ~/.ssh/id_ed25519.pub
```
将输出的内容添加到 GitHub [SSH and GPG keys](https://github.com/settings/keys) 设置中。

参考：[Generating a new SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

基础设置
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```
## 9. VS Code

### 9.1 Markdown 预览
- 当前窗口预览：`Ctrl+Shift+V`
- 侧边预览：`Ctrl+K V`

### 9.2 单回车在预览里直接换行
编辑 `~/.config/Code/User/settings.json`：
```json
{
  "markdown.preview.breaks": true
}
```

## 10. 中文输入法

1. Setting -> "Region and Language" -> "Manage installed languages" -> 
选择你需要的语言

2. 重启电脑
3. Settings -> Keyboard -> Input Sources -> + Add Input Source... -> Chinese -> Chinese (Intelligent Pinyin)

参考：https://www.reddit.com/r/Ubuntu/comments/1pdrji1/how_to_set_up_chinese_pinyin_input_method_ubuntu/


## 11. 通过 FishROS 安装 ROS 2

ROS 2 Humble 支持 22.04，ROS 2 Jazzy 支持 24.04。

安装时请参考 [FishROS 一键安装脚本](https://fishros.github.io/install/#/) 运行最新指令。

验证：
```bash
ros2 --help
```


## 参考链接

- Ubuntu NVIDIA 驱动安装：https://documentation.ubuntu.com/server/how-to/graphics/install-nvidia-drivers/
- NVIDIA CUDA Installation Guide for Linux：https://docs.nvidia.com/cuda/cuda-installation-guide-linux/
- CUDA 12.6 安装文档：https://docs.nvidia.com/cuda/archive/12.6.0/cuda-installation-guide-linux/index.html
- PyTorch 安装页面：https://pytorch.org/get-started/locally/
- PyTorch 历史版本页面：https://pytorch.org/get-started/previous-versions/
- Conda 安装文档：https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html
- Miniconda 页面：https://docs.conda.io/en/latest/miniconda.html
- uv 安装文档：https://docs.astral.sh/uv/getting-started/installation/
- VS Code Markdown 文档：https://code.visualstudio.com/docs/languages/markdown
- ROS 2 Humble 安装文档：https://docs.ros.org/en/humble/Installation.html
- ROS 2 Humble Ubuntu 安装文档：https://docs.ros.org/en/humble/Installation/Ubuntu-Install-Debs.html
- FishROS 文档：https://fishros.github.io/install/#/
