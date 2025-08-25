/**
 * Vercel API 路由 - 会员管理
 */
const VikaService = require('../src/vikaService');

// 维格表配置
const VIKA_TOKEN = 'usk3ff9QIs2UFqjvQZD4yYQ';
const DATASHEET_ID = 'dst4AHXevG2Hp7P3Kf';
const vikaService = new VikaService(VIKA_TOKEN, DATASHEET_ID);

// CORS 头部设置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  try {
    const { method, query, body } = req;
    
    console.log(`${new Date().toISOString()} - ${method} /api/members`);

    switch (method) {
      case 'GET':
        return await handleGet(req, res, query);
      case 'POST':
        return await handlePost(req, res, body);
      case 'PUT':
        return await handlePut(req, res, query, body);
      case 'DELETE':
        return await handleDelete(req, res, query);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
}

// 处理GET请求
async function handleGet(req, res, query) {
  const { id, all, viewId, filterByFormula, maxRecords } = query;
  
  // 获取单个会员
  if (id) {
    const response = await vikaService.getMember(id);
    return res.json(response);
  }
  
  // 获取所有会员（自动分页）
  if (all === 'true') {
    const options = {};
    if (viewId) options.viewId = viewId;
    if (filterByFormula) options.filterByFormula = filterByFormula;
    
    const response = await vikaService.queryAllMembers(options);
    return res.json(response);
  }
  
  // 查询会员（带分页）
  const options = {};
  if (viewId) options.viewId = viewId;
  if (filterByFormula) options.filterByFormula = filterByFormula;
  if (maxRecords) options.maxRecords = parseInt(maxRecords, 10);
  
  const response = await vikaService.queryMembers(options);
  return res.json(response);
}

// 处理POST请求 - 创建会员
async function handlePost(req, res, body) {
  const response = await vikaService.createMember(body);
  return res.json(response);
}

// 处理PUT请求 - 更新会员
async function handlePut(req, res, query, body) {
  const { id } = query;
  if (!id) {
    return res.status(400).json({ success: false, message: '缺少会员ID' });
  }
  
  const response = await vikaService.updateMember(id, body);
  return res.json(response);
}

// 处理DELETE请求 - 删除会员
async function handleDelete(req, res, query) {
  const { id } = query;
  if (!id) {
    return res.status(400).json({ success: false, message: '缺少会员ID' });
  }
  
  const response = await vikaService.deleteMember(id);
  return res.json(response);
}