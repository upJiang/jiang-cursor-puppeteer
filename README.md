# 小红书爬虫舆情分析工具

这是一个使用Puppeteer爬取小红书笔记并进行舆情分析的工具。它可以根据关键词搜索小红书笔记，提取笔记内容，并使用AI进行情感分析，最终将结果保存为Excel文件。

## 功能特点

- 根据关键词自动搜索小红书笔记
- 自动提取笔记标题、作者、发布时间、链接和内容
- 使用AI对每条笔记进行情感分析（正面/中性/负面）
- 将所有数据保存为Excel文件
- 提供情感分析汇总统计

## 安装

```bash
# 克隆仓库
git clone [仓库地址]
cd xiaohongshu-crawler

# 安装依赖
npm install
```

## 使用方法

1. 在`xiaohongshu_crawler.js`文件中修改配置参数：
   ```javascript
   const keyword = '小米手机'; // 修改为你想搜索的关键词
   const crawlCount = 10; // 修改为你想爬取的笔记数量
   const token = 'your-token'; // 替换为你的AI API token
   ```

2. 运行爬虫：
   ```bash
   npm start
   ```

3. 程序会自动打开浏览器，执行爬取和分析过程，完成后会在当前目录生成Excel文件。

## 注意事项

- 请合理设置爬取间隔，避免频繁请求导致IP被封
- 爬虫可能需要根据小红书网站的更新进行调整
- 使用前请确保你的网络环境能够正常访问小红书网站
- 本工具仅供学习和研究使用，请勿用于商业用途

## 依赖项

- puppeteer: 网页自动化工具
- node-fetch: 用于发送HTTP请求
- exceljs: 用于生成Excel文件 