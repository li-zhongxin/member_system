/**
 * Vercel API 路由 - 统计数据
 */
const VikaService = require('../src/vikaService');

// 维格表配置
const VIKA_TOKEN = 'usk3ff9QIs2UFqjvQZD4yYQ';
const DATASHEET_ID = 'dst4AHXevG2Hp7P3Kf';
const vikaService = new VikaService(VIKA_TOKEN, DATASHEET_ID);

// CORS 头部设置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

module.exports = async function handler(req, res) {
  // 设置 CORS 头部
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log(`${new Date().toISOString()} - GET /api/stats`);
    
    const response = await vikaService.getStatistics();
    return res.json(response);
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
}