/**
 * 会员管理系统 API 服务器
 */
const express = require('express');
const VikaService = require('./vikaService');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 添加CORS支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  // 记录API请求日志
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  next();
});

// 维格表配置
const VIKA_TOKEN = 'usk3ff9QIs2UFqjvQZD4yYQ'; // 请替换为您的实际token
const DATASHEET_ID = 'dst4AHXevG2Hp7P3Kf'; // 请替换为您的实际datasheetId
const vikaService = new VikaService(VIKA_TOKEN, DATASHEET_ID);

// 路由配置

/**
 * 查询会员信息
 * GET /api/members
 * 查询参数:
 * - viewId: 视图ID
 * - filterByFormula: 筛选公式
 * - maxRecords: 最大记录数
 */
app.get('/api/members', async (req, res) => {
  try {
    const { viewId, filterByFormula, maxRecords } = req.query;
    
    const options = {};
    if (viewId) options.viewId = viewId;
    if (filterByFormula) options.filterByFormula = filterByFormula;
    if (maxRecords) options.maxRecords = parseInt(maxRecords, 10);
    
    const response = await vikaService.queryMembers(options);
    res.json(response);
  } catch (error) {
    console.error('查询会员信息失败:', error);
    res.status(500).json({
      success: false,
      message: '查询会员信息失败',
      error: error.message
    });
  }
});

/**
 * 查询所有会员信息（自动处理分页）
 * GET /api/members/all
 */
app.get('/api/members/all', async (req, res) => {
  try {
    const { viewId, filterByFormula } = req.query;
    
    const options = {};
    if (viewId) options.viewId = viewId;
    if (filterByFormula) options.filterByFormula = filterByFormula;
    
    const response = await vikaService.queryAllMembers(options);
    res.json(response);
  } catch (error) {
    console.error('查询所有会员信息失败:', error);
    res.status(500).json({
      success: false,
      message: '查询所有会员信息失败',
      error: error.message
    });
  }
});

/**
 * 获取单个会员信息
 * GET /api/members/:id
 */
app.get('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`收到获取会员请求，会员ID: ${id}`);
    
    if (!id) {
      console.error('获取会员信息失败: 会员ID为空');
      return res.status(400).json({
        success: false,
        message: '会员ID不能为空',
        code: 400
      });
    }
    
    const response = await vikaService.getMember(id);
    console.log(`获取会员信息结果:`, JSON.stringify(response, null, 2));
    
    if (response.success) {
      res.json(response);
    } else {
      res.status(response.code || 404).json(response);
    }
  } catch (error) {
    console.error('获取会员信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会员信息失败',
      error: error.message
    });
  }
});

/**
 * 创建会员
 * POST /api/members
 */
app.post('/api/members', async (req, res) => {
  try {
    const memberData = req.body;
    
    // 验证必填字段
    if (!memberData.member_name || !memberData.phonenumber) {
      return res.status(400).json({
        success: false,
        message: '会员姓名和手机号码为必填项'
      });
    }
    
    // 检查手机号是否已存在
    const existingMembersResponse = await vikaService.queryAllMembers();
    if (existingMembersResponse.success && existingMembersResponse.data && existingMembersResponse.data.records) {
      const existingMember = existingMembersResponse.data.records.find(member => 
        member.fields.phonenumber === memberData.phonenumber
      );
      
      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: `手机号 ${memberData.phonenumber} 已被会员 "${existingMember.fields.member_name}" 使用，请使用其他手机号`
        });
      }
    }
    
    const response = await vikaService.createMember(memberData);
    
    if (response.success) {
      res.status(201).json(response);
    } else {
      res.status(response.code || 500).json(response);
    }
  } catch (error) {
    console.error('创建会员失败:', error);
    res.status(500).json({
      success: false,
      message: '创建会员失败',
      error: error.message
    });
  }
});

/**
 * 更新会员信息
 * PUT /api/members/:id
 */
app.put('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const memberData = req.body;
    
    console.log(`收到更新会员请求，会员ID: ${id}`);
    console.log('更新数据:', JSON.stringify(memberData, null, 2));
    
    // 验证会员ID
    if (!id) {
      console.error('会员ID为空');
      return res.status(400).json({
        success: false,
        message: '会员ID不能为空'
      });
    }
    
    // 验证必填字段
    if (!memberData.member_name || !memberData.phonenumber) {
      console.error('必填字段缺失');
      return res.status(400).json({
        success: false,
        message: '会员姓名和手机号码为必填项'
      });
    }
    
    const response = await vikaService.updateMember(id, memberData);
    console.log('更新会员信息结果:', JSON.stringify(response, null, 2));
    
    if (response.success) {
      res.json(response);
    } else {
      res.status(response.code || 500).json(response);
    }
  } catch (error) {
    console.error('更新会员信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新会员信息失败',
      error: error.message
    });
  }
});

/**
 * 删除会员
 * DELETE /api/members/:id
 */
app.delete('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await vikaService.deleteMember(id);
    
    if (response.success) {
      res.json(response);
    } else {
      res.status(response.code || 404).json(response);
    }
  } catch (error) {
    console.error('删除会员失败:', error);
    res.status(500).json({
      success: false,
      message: '删除会员失败',
      error: error.message
    });
  }
});



/**
 * 会员充值
 * POST /api/members/:id/recharge
 */
app.post('/api/members/:id/recharge', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    console.log(`收到充值请求，会员ID: ${id}, 充值金额: ${amount}`);
    
    // 验证参数
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '会员ID不能为空'
      });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '充值金额必须大于0'
      });
    }
    
    // 获取当前会员信息
    const memberResponse = await vikaService.getMember(id);
    if (!memberResponse.success) {
      return res.status(404).json({
        success: false,
        message: '会员不存在'
      });
    }
    
    const member = memberResponse.data;
    const currentBalance = member.fields['Remaining sum'] || member.fields.Remaining_sum || 0;
    const newBalance = parseFloat(currentBalance) + parseFloat(amount);
    
    // 更新余额
    const updateResponse = await vikaService.updateMember(id, {
      'Remaining sum': newBalance
    });
    
    if (updateResponse.success) {
      console.log(`充值成功，会员ID: ${id}, 新余额: ${newBalance}`);
      res.json({
        success: true,
        message: '充值成功',
        data: {
          memberId: id,
          memberName: member.fields.member_name,
          rechargeAmount: parseFloat(amount),
          previousBalance: parseFloat(currentBalance),
          newBalance: newBalance
        }
      });
    } else {
      res.status(updateResponse.code || 500).json(updateResponse);
    }
  } catch (error) {
    console.error('充值失败:', error);
    res.status(500).json({
      success: false,
      message: '充值失败',
      error: error.message
    });
  }
});

/**
 * 会员消费
 * POST /api/members/:id/consume
 */
app.post('/api/members/:id/consume', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    console.log(`收到消费请求，会员ID: ${id}, 消费金额: ${amount}`);
    
    // 验证参数
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '会员ID不能为空'
      });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '消费金额必须大于0'
      });
    }
    
    // 获取当前会员信息
    const memberResponse = await vikaService.getMember(id);
    if (!memberResponse.success) {
      return res.status(404).json({
        success: false,
        message: '会员不存在'
      });
    }
    
    const member = memberResponse.data;
    const currentBalance = member.fields['Remaining sum'] || member.fields.Remaining_sum || 0;
    const consumeAmount = parseFloat(amount);
    
    // 检查余额是否足够
    if (currentBalance < consumeAmount) {
      return res.status(400).json({
        success: false,
        message: '余额不足，无法完成消费',
        data: {
          currentBalance: parseFloat(currentBalance),
          requiredAmount: consumeAmount,
          shortfall: consumeAmount - parseFloat(currentBalance)
        }
      });
    }
    
    const newBalance = parseFloat(currentBalance) - consumeAmount;
    
    // 更新余额
    const updateResponse = await vikaService.updateMember(id, {
      'Remaining sum': newBalance
    });
    
    if (updateResponse.success) {
      console.log(`消费成功，会员ID: ${id}, 新余额: ${newBalance}`);
      res.json({
        success: true,
        message: '消费成功',
        data: {
          memberId: id,
          memberName: member.fields.member_name,
          consumeAmount: consumeAmount,
          previousBalance: parseFloat(currentBalance),
          newBalance: newBalance
        }
      });
    } else {
      res.status(updateResponse.code || 500).json(updateResponse);
    }
  } catch (error) {
    console.error('消费失败:', error);
    res.status(500).json({
      success: false,
      message: '消费失败',
      error: error.message
    });
  }
});



// 启动服务器
app.listen(PORT, () => {
  console.log(`会员管理系统服务器已启动，监听端口: ${PORT}`);
});