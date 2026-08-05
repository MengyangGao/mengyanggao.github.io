---
# 主页个人信息与布局。简介正文位于本文件 frontmatter 之后。
profile:
  name:
    en: Mengyang Gao
    zhHans: 高梦扬
    zhHant: 高夢揚
  location:
    en: Hong Kong
    zhHans: 中国香港
    zhHant: 中國香港
  email: gao.mengyang@outlook.com
  avatar: profile/avatar.png

interests:
  en: []
  zhHans: []
  zhHant: []
interestsTitle:
  en: Interests
  zhHans: 兴趣
  zhHant: 興趣
selectedWorkTitle:
  en: Selected Work
  zhHans: 精选作品
  zhHant: 精選作品

contact:
  wechatQr: contact/wechat-qr.jpg

footer:
  signature:
    en: Stay hungry, stay foolish.
    zhHans: 仰望星空，脚踏实地。
    zhHant: 仰望星空，腳踏實地。
  copyrightYear: 2026
  ownerUrl: https://github.com/MengyangGao
  sourceCodeLabel: View Source Code
  sourceCodeUrl: https://github.com/MengyangGao/mengyanggao.github.io

socialLinks:
  - id: github
    label: GitHub
    href: https://github.com/MengyangGao
  - id: linkedin
    label: LinkedIn
    href: https://www.linkedin.com/in/mengyang-gao/
  - id: x
    label: X
    href: https://x.com/Mengyang_G
  - id: wechat
    label: Wechat
    href: /contact/wechat/
  - id: bilibili
    label: Bilibili
    href: https://m.bilibili.com/space/95498738
  - id: zhihu
    label: Zhihu
    href: https://www.zhihu.com/people/theburningdesire

# 子页面与主页共用这些 URL；GitHub/B站数据只抓取一次并写入 link-metadata.json。
linkTargets:
  sections:
    robotics:
      - https://github.com/MengyangGao/hand_exoskeleton
      - https://github.com/MengyangGao/LLM-Robot
      - https://github.com/MengyangGao/Awesome-Robotics-Embodied-AI
      - https://github.com/MengyangGao/visual_servo_tracking
      - https://www.bilibili.com/video/BV14qdhY5EEb/
      - https://www.bilibili.com/video/BV1GvGtzjEcc/
      - https://www.bilibili.com/video/BV1saVZz9EGr/
      - https://www.bilibili.com/video/BV1qQttzbETC/
    software:
      - https://github.com/MengyangGao/gzic.online
      - https://github.com/MengyangGao/flying.gzic.online
      - https://github.com/MengyangGao/RAG-system
      - https://github.com/MengyangGao/infoMatrix
      - https://github.com/MengyangGao/mengyanggao.github.io
    music:
      - https://www.bilibili.com/video/BV1ZXqfYwEed/

sectionOrder:
  - blog
  - robotics
  - software
  - music

navigation:
  - key: home
    href: /
    labels: { en: Home, zhHans: 主页, zhHant: 主頁 }
  - key: blog
    href: /blog/
    labels: { en: Blog, zhHans: 博客, zhHant: 博客 }
  - key: robotics
    href: /robotics/
    labels: { en: Robotics, zhHans: 机器人, zhHant: 機器人 }
  - key: software
    href: /software/
    labels: { en: Software, zhHans: 软件, zhHant: 軟體 }
  - key: music
    href: /music/
    labels: { en: Music, zhHans: 音乐, zhHant: 音樂 }
  - key: archives
    href: /archives/
    labels: { en: Archives, zhHans: 归档, zhHant: 歸檔 }

socialRows:
  - [github, linkedin, x]
  - [wechat, bilibili, zhihu]

# 只有 href 是必填项；标题和分类默认从已有页面/抓取数据推导，卡片按最新日期排序。
selectedWork:
  - href: https://github.com/MengyangGao/visual_servo_tracking
  - href: https://github.com/MengyangGao/Awesome-Robotics-Embodied-AI
  - href: https://github.com/MengyangGao/hand_exoskeleton
    resources:
      code: https://github.com/MengyangGao/hand_exoskeleton
      video: https://www.bilibili.com/video/BV1YzUzY8ETY/
      paper: https://github.com/MengyangGao/hand_exoskeleton/blob/main/A_Compact_and_Lightweight_Rigid-Tendon_Combined_Exoskeleton_for_Hand_Rehabilitation.pdf
  - href: /blog/advice-for-new-scut-students/
    title:
      en: A Note to New SCUT Students
      zhHans: 分享给华南理工大学新入学的学弟学妹
      zhHant: 分享給華南理工大學新入學的學弟學妹
  - href: /blog/why-rss/
    title:
      en: RSS - Be the Master of Your Information
      zhHans: RSS——做信息的主人，不做奴隶
      zhHant: RSS——做資訊的主人，不做奴隶
  - href: https://www.bilibili.com/video/BV14qdhY5EEb/
    title:
      en: 未来革命or资本泡沫——研发投入50年，人形机器人突破了什么？
      zhHans: 未来革命or资本泡沫——研发投入50年，人形机器人突破了什么？
      zhHant: 未來革命or資本泡沫——研發投入50年，人形機器人突破了什麼？
  - href: https://www.bilibili.com/video/BV1saVZz9EGr/
    title:
      en: 液压vs电驱——20分钟讲透人形机器人核心动力系统革命
      zhHans: 液压vs电驱——20分钟讲透人形机器人核心动力系统革命
      zhHant: 液壓vs電驅——20分鐘講透人形機器人核心動力系統革命
  - href: https://www.bilibili.com/video/BV1qQttzbETC/
    title:
      en: 人形机器人无法逾越的鸿沟是什么？——研究了30篇论文后，我看到了机器人发展的下一步。
      zhHans: 人形机器人无法逾越的鸿沟是什么？——研究了30篇论文后，我看到了机器人发展的下一步。
      zhHant: 人形機器人無法逾越的鴻溝是什麼？——研究了30篇論文後，我看到了機器人發展的下一步。
  - href: https://www.bilibili.com/video/BV1GvGtzjEcc/
    title:
      en: 核事故、机器人、赛博训练——研究了32篇论文，我搞懂了机器人运动背后的秘密【具身智能第2期】
      zhHans: 核事故、机器人、赛博训练——研究了32篇论文，我搞懂了机器人运动背后的秘密【具身智能第2期】
      zhHant: 核事故、機器人、賽博訓練——研究了32篇論文，我搞懂了機器人運動背後的秘密【具身智慧第2期】
  - href: https://github.com/MengyangGao/infoMatrix
  - href: https://github.com/MengyangGao/gzic.online
---

## en

I am a graduate student in Robotics at City University of Hong Kong (CityUHK), and I earned my bachelor's degree in Robotics Engineering from South China University of Technology (SCUT). My research interest is robot intelligence, including Computer Vision, Manipulation, Machine Learning, and Agentic AI.

I value technical practice and the free flow of information. At the end of 2022, my friends and I founded the [RobotIC Lab](https://github.com/SCUT-RobotIC) at SCUT. Under the guidance of [Associate Professor Dong Zhang](https://www2.scut.edu.cn/ft/2021/1102/c45109a489114/page.htm), we took part in ROBOCON 2023 and 2024 and won a National First Prize. I have interned at [Wuji Technology](https://wuji.tech), [vivo AI Lab](https://www.vivo.com.cn), and [Shenzhen InnoX Academy](https://www.innoxsz.com). I am the founder of [gzic.online](https://www.gzic.online/), the campus information aggregation platform, and I also served as a technical advisor for Bilibili creator "Neolithic Park"'s [robotics and AI video series](https://space.bilibili.com/489640651/lists/1326910), which has accumulated over 4 million views.

As a full-stack roboticist, I am committed to building general-purpose intelligent robots. My lifelong aspiration is to advance humanity’s journey into the cosmos.

## zhHans

我是香港城市大学机器人方向的研究生，本科毕业于华南理工大学机器人工程专业。我的研究兴趣是机器人智能，包括：Computer Vision, Manipulation, Machine Learning 与 Agentic AI。

我认可技术实践和信息流通的价值。2022 年底我与朋友们创建华工 [RobotIC 机器人实验室](https://github.com/SCUT-RobotIC)，在[张东副教授](https://www2.scut.edu.cn/ft/2021/1102/c45109a489114/page.htm)指导下参加 2023、2024 两届ROBOCON，并获得全国一等奖。我曾在[舞肌科技](https://wuji.tech)、[vivo AI Lab](https://www.vivo.com.cn)和[深圳科创学院](https://www.innoxsz.com)实习。我是校园信息聚合平台[华工手册](https://www.gzic.online/)的发起者，也是 B 站UP主“新石器公园”超400万播放的[机器人与 AI 系列视频](https://space.bilibili.com/489640651/lists/1326910)的技术顾问。

作为一名全栈机器人工程师，我致力于打造通用智能机器人。我的人生志向是投身航天与太空事业，推动人类迈向浩瀚宇宙。

## zhHant

我是香港城市大学機器人方向的研究生，大學本科畢業於華南理工大學機器人工程專業。我的研究興趣是機器人智能，包括：Computer Vision, Manipulation, Machine Learning 與 Agentic AI。

我認可技術實踐和資訊流通的價值。2022 年底我與朋友們建立華工 [RobotIC 機器人實驗室](https://github.com/SCUT-RobotIC)，在[張東副教授](https://www2.scut.edu.cn/ft/2021/1102/c45109a489114/page.htm)指導下參加 2023、2024 兩屆ROBOCON，並獲得全國一等獎。我曾在[舞肌科技](https://wuji.tech)、[vivo AI Lab](https://www.vivo.com.cn)和[深圳科創學院](https://www.innoxsz.com)實習。我是校園資訊聚合平台[華工手冊](https://www.gzic.online/)的發起者，也是 B 站UP主“新石器公園”超400萬播放的[機器人與 AI 系列影片](https://space.bilibili.com/489640651/lists/1326910)的技術顧問。

作為一名全端機器人工程師，我致力於打造通用智慧機器人。我的人生志向是投身航太與太空事業，推動人類邁向浩瀚宇宙。
