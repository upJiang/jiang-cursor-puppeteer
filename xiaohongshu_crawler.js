const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// 配置参数
const keyword = '小米手机'; // 爬取的关键词
const crawlCount = 2; // 爬取的数量
const token = 'sk-esvuhwigovazzljmtcmwgsmwcrgbrnrtzokaireqyytezgdh'; // AI分析的token

// 随机延迟函数，避免被反爬
const randomDelay = async (min = 1000, max = 3000) => {
  const delay = Math.floor(Math.random() * (max - min) + min);
  await new Promise(resolve => setTimeout(resolve, delay));
};

// 分析笔记情感倾向
async function analyzeNote(title, content, keyword) {
  const prompt = `
  你是一位专业的舆情分析师，请分析以下小红书笔记对"${keyword}"品牌的评价倾向。
  笔记标题：${title}
  笔记内容：${content}
  
  请根据笔记内容判断对"${keyword}"的评价是正面、中性还是负面，只需回复"正面"、"中性"或"负面"这三个词之一。
  `;

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "model": "Qwen/QwQ-32B",
      "messages": [{"role": "user", "content": prompt}],
      "stream": false,
      "max_tokens": 512,
      "stop": null,
      "temperature": 0.7,
      "top_p": 0.7,
      "top_k": 50,
      "frequency_penalty": 0.5,
      "n": 1,
      "response_format": {"type": "text"}
    })
  };

  try {
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options);
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI分析出错:', error);
    return '分析失败';
  }
}

// 保存数据到Excel
async function saveToExcel(dataList) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('小红书数据');

  // 设置表头
  worksheet.columns = [
    { header: '笔记标题', key: 'title', width: 30 },
    { header: '笔记作者', key: 'author', width: 20 },
    { header: '发布时间', key: 'date', width: 20 },
    { header: '笔记链接', key: 'url', width: 50 },
    { header: '笔记内容', key: 'content', width: 100 },
    { header: '情感倾向', key: 'sentiment', width: 15 }
  ];

  // 添加数据
  dataList.forEach(item => {
    worksheet.addRow(item);
  });

  // 设置样式
  worksheet.getRow(1).font = { bold: true };

  // 保存文件
  const fileName = `小红书_${keyword}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await workbook.xlsx.writeFile(fileName);
  console.log(`数据已保存到 ${fileName}`);
}

// 主函数
async function main() {
  console.log(`开始爬取关键词"${keyword}"的小红书笔记，计划爬取${crawlCount}条`);
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    // 访问搜索页面
    const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_notes&type=51`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    console.log('等待页面加载完成...');
    await page.waitForSelector('.cover.ld.mask', { timeout: 30000 });
    
    // 滚动页面以加载更多内容
    console.log('滚动页面加载更多内容...');
    let currentHrefs = [];
    while (currentHrefs.length < crawlCount) {
      await page.evaluate(() => {
        window.scrollBy(0, 1000);
      });
      await randomDelay(800, 1500);
      
      currentHrefs = await page.evaluate(() => {
        const links = document.querySelectorAll('.cover.ld.mask');
        return Array.from(links).map(link => {
          const href = link.getAttribute('href');
          if (href && href.includes('/')) {
            return "https://www.xiaohongshu.com/explore/" + href.split("/")[2];
          }
          return null;
        }).filter(Boolean);
      });
      
      // 防止无限循环
      if (currentHrefs.length >= crawlCount || await page.evaluate(() => {
        return window.innerHeight + window.scrollY >= document.body.scrollHeight;
      })) {
        break;
      }
    }
    
    // 获取唯一的链接
    const uniqueHrefs = [...new Set(currentHrefs)].slice(0, crawlCount);
    console.log(`成功获取${uniqueHrefs.length}条笔记链接`);
    
    // 爬取每个笔记详情
    const dataList = [];
    for (let i = 0; i < uniqueHrefs.length; i++) {
      const url = uniqueHrefs[i];
      console.log(`正在爬取第${i+1}/${uniqueHrefs.length}条笔记: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await randomDelay();
        
        // 提取笔记信息
        const noteData = await page.evaluate(() => {
          return {
            title: document.querySelector('.title')?.textContent.trim() || '无标题',
            author: document.querySelector('.username')?.textContent.trim() || '未知作者',
            date: document.querySelector('.date')?.textContent.trim() || '未知时间',
            url: window.location.href,
            content: document.querySelector('.note-text')?.textContent.trim() || '无内容'
          };
        });
        
        console.log(`笔记标题: ${noteData.title}`);
        
        // 分析情感倾向
        console.log('正在分析情感倾向...');
        const sentiment = await analyzeNote(noteData.title, noteData.content, keyword);
        noteData.sentiment = sentiment;
        
        dataList.push(noteData);
        console.log(`情感分析结果: ${sentiment}`);
        
        await randomDelay(2000, 5000);
      } catch (error) {
        console.error(`爬取笔记失败: ${url}`, error);
      }
    }
    
    // 保存数据到Excel
    if (dataList.length > 0) {
      await saveToExcel(dataList);
      console.log('数据分析汇总:');
      const sentimentCount = {
        '正面': dataList.filter(item => item.sentiment === '正面').length,
        '中性': dataList.filter(item => item.sentiment === '中性').length,
        '负面': dataList.filter(item => item.sentiment === '负面').length,
        '分析失败': dataList.filter(item => item.sentiment === '分析失败').length
      };
      console.log(sentimentCount);
    } else {
      console.log('未获取到有效数据');
    }
    
  } catch (error) {
    console.error('爬虫运行出错:', error);
  } finally {
    await browser.close();
    console.log('爬虫任务完成');
  }
}

// 运行主函数
main().catch(console.error); 