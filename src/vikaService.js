/**
 * 维格表服务 - 会员管理系统
 * 提供会员信息的查询、新增、修改、删除功能
 */
const { Vika } = require('@vikadata/vika');

class VikaService {
  constructor(token, datasheetId, fieldKey = 'name') {
    this.vika = new Vika({ token, fieldKey });
    this.datasheet = this.vika.datasheet(datasheetId);
    
    // 缓存配置
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30秒缓存
    
    // QPS限制配置
    this.requestQueue = [];
    this.isProcessing = false;
    this.maxQPS = 1.5; // 设置为1.5 QPS，低于2 QPS限制
    this.requestInterval = 1000 / this.maxQPS; // 请求间隔
  }
  
  /**
   * 请求队列处理器
   */
  async processRequestQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const { resolve, reject, fn, args } = this.requestQueue.shift();
      
      try {
        const result = await fn.apply(this, args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      // 等待请求间隔
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.requestInterval));
      }
    }
    
    this.isProcessing = false;
  }
  
  /**
   * 添加请求到队列
   */
  queueRequest(fn, args) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, fn, args });
      this.processRequestQueue();
    });
  }
  
  /**
   * 获取缓存键
   */
  getCacheKey(method, params) {
    return `${method}_${JSON.stringify(params)}`;
  }
  
  /**
   * 获取缓存数据
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }
  
  /**
   * 设置缓存数据
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * 清除缓存
   */
  clearCache(pattern = null) {
    if (pattern) {
      // 清除匹配模式的缓存
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
    console.log(`缓存已清除${pattern ? ` (模式: ${pattern})` : ''}`);
  }
  
  /**
   * 获取单个会员信息 - 带缓存和QPS控制
   * @param {string} recordId - 会员记录ID
   * @returns {Promise} - 返回会员信息
   */
  async getMember(recordId) {
    if (!recordId) {
      console.error('获取会员信息失败: recordId为空');
      return {
        success: false,
        code: 400,
        message: '会员ID不能为空',
        data: null
      };
    }
    
    const cacheKey = this.getCacheKey('getMember', { recordId });
    
    // 检查缓存
    const cachedResult = this.getCache(cacheKey);
    if (cachedResult) {
      console.log(`从缓存获取会员信息，recordId: ${recordId}`);
      return cachedResult;
    }
    
    // 使用请求队列控制QPS
    return this.queueRequest(this._getMemberInternal, [recordId, cacheKey]);
  }
  
  /**
   * 内部方法：实际执行获取单个会员信息
   */
  async _getMemberInternal(recordId, cacheKey) {
    try {
      console.log(`正在获取会员信息，recordId: ${recordId}`);
      
      const response = await this.datasheet.records.query({
        recordIds: [recordId]
      });
      
      console.log(`维格表API响应:`, JSON.stringify(response, null, 2));
      
      // 处理成功响应
      if (response.success && response.data && response.data.records && response.data.records.length > 0) {
        console.log(`成功获取会员信息，recordId: ${recordId}`);
        const record = response.data.records[0];
        const result = {
          success: true,
          code: 200,
          message: 'Request successful',
          data: {
            recordId: record.recordId,
            fields: record.fields,
            createdTime: record.createdTime
          }
        };
        
        // 缓存结果
        this.setCache(cacheKey, result);
        return result;
      }
      
      // 处理API返回的错误响应
      if (!response.success) {
        const errorCode = response.code;
        let errorMessage = response.message || '未知错误';
        
        console.error(`维格表API错误，recordId: ${recordId}，错误码: ${errorCode}，错误信息: ${errorMessage}`);
        
        // 根据不同错误码返回相应的错误信息
        switch (errorCode) {
          case 401:
            return {
              success: false,
              code: 401,
              message: 'API Token无效或已过期',
              data: null
            };
          case 403:
            return {
              success: false,
              code: 403,
              message: '没有权限访问该数据表',
              data: null
            };
          case 404:
            return {
              success: false,
              code: 404,
              message: '数据表不存在或记录不存在',
              data: null
            };
          case 429:
            return {
              success: false,
              code: 429,
              message: 'API调用频率超限，请稍后重试',
              data: null
            };
          case 500:
            return {
              success: false,
              code: 500,
              message: '维格表服务器内部错误',
              data: null
            };
          default:
            return {
              success: false,
              code: errorCode || 500,
              message: errorMessage,
              data: null
            };
        }
      }
      
      // 成功响应但没有找到记录
      console.log(`会员不存在，recordId: ${recordId}`);
      return {
        success: false,
        code: 404,
        message: '会员不存在',
        data: null
      };
      
    } catch (error) {
      console.error(`获取会员信息失败，recordId: ${recordId}，错误:`, error);
      return {
        success: false,
        code: error.code || 500,
        message: error.message || '获取会员信息失败',
        data: null
      };
    }
  }

  /**
   * 查询会员信息 - 带缓存和QPS控制
   * @param {Object} options - 查询选项
   * @param {string} options.viewId - 视图ID
   * @param {Array} options.sort - 排序条件
   * @param {Array} options.recordIds - 指定记录ID
   * @param {Array} options.fields - 指定返回字段
   * @param {string} options.filterByFormula - 筛选公式
   * @param {number} options.maxRecords - 最大记录数
   * @param {string} options.cellFormat - 单元格格式
   * @returns {Promise} - 返回查询结果
   */
  async queryMembers(options = {}) {
    const cacheKey = this.getCacheKey('queryMembers', options);
    
    // 检查缓存
    const cachedResult = this.getCache(cacheKey);
    if (cachedResult) {
      console.log('从缓存获取会员查询结果');
      return cachedResult;
    }
    
    // 使用请求队列控制QPS
    return this.queueRequest(this._queryMembersInternal, [options, cacheKey]);
  }
  
  /**
   * 内部方法：实际执行查询会员信息
   */
  async _queryMembersInternal(options = {}, cacheKey) {
    try {
      console.log('正在查询会员信息...', options);
      const response = await this.datasheet.records.query(options);
      
      // 缓存结果
      this.setCache(cacheKey, response);
      
      return response;
    } catch (error) {
      console.error('查询会员信息失败:', error);
      return {
        success: false,
        code: error.code || 500,
        message: error.message || '查询会员信息失败',
        data: null
      };
    }
  }

  /**
   * 获取所有会员信息（自动处理分页）- 带缓存和QPS控制
   * @param {Object} options - 查询选项
   * @returns {Promise} - 返回所有查询结果
   */
  async queryAllMembers(options = {}) {
    const cacheKey = this.getCacheKey('queryAllMembers', options);
    
    // 检查缓存
    const cachedResult = this.getCache(cacheKey);
    if (cachedResult) {
      console.log('从缓存获取所有会员信息');
      return cachedResult;
    }
    
    // 使用请求队列控制QPS
    return this.queueRequest(this._queryAllMembersInternal, [options, cacheKey]);
  }
  
  /**
   * 内部方法：实际执行查询所有会员信息
   */
  async _queryAllMembersInternal(options = {}, cacheKey) {
    try {
      console.log('正在查询所有会员信息...');
      const allRecords = [];
      const allRecordsIter = this.datasheet.records.queryAll(options);
      
      for await (const eachPageRecords of allRecordsIter) {
        allRecords.push(...eachPageRecords);
      }
      
      const result = {
        success: true,
        code: 200,
        message: 'Request successful',
        data: {
          total: allRecords.length,
          records: allRecords
        }
      };
      
      // 缓存结果
      this.setCache(cacheKey, result);
      console.log(`成功查询所有会员信息，共${allRecords.length}条记录`);
      
      return result;
    } catch (error) {
      console.error('查询所有会员信息失败:', error);
      return {
        success: false,
        code: error.code || 500,
        message: error.message || '查询所有会员信息失败',
        data: null
      };
    }
  }
  
  /**
   * 创建会员 - 带缓存清除
   * @param {Object} fields - 会员字段数据
   * @returns {Promise} - 返回创建结果
   */
  async createMember(fields) {
    try {
      const response = await this.datasheet.records.create([{ fields }]);
      
      // 创建成功后清除相关缓存
      if (response.success) {
        this.clearCache('queryAllMembers');
        this.clearCache('queryMembers');
        console.log('会员创建成功，已清除相关缓存');
      }
      
      return response;
    } catch (error) {
      console.error('创建会员失败:', error);
      return {
        success: false,
        code: error.code || 500,
        message: error.message || '创建会员失败',
        data: null
      };
    }
  }
  
  /**
   * 更新会员信息 - 带缓存清除
   * @param {string} recordId - 会员记录ID
   * @param {Object} fields - 要更新的字段数据
   * @returns {Promise} - 返回更新结果
   */
  async updateMember(recordId, fields) {
    try {
      console.log(`尝试更新会员信息，recordId: ${recordId}`);
      console.log('更新字段数据:', JSON.stringify(fields, null, 2));
      
      if (!recordId) {
        console.error('recordId为空，无法更新会员信息');
        return {
          success: false,
          code: 400,
          message: 'recordId不能为空',
          data: null
        };
      }
      
      const response = await this.datasheet.records.update([{
        recordId,
        fields
      }]);
      
      console.log('维格表API更新响应:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log(`成功更新会员信息，recordId: ${recordId}`);
        
        // 更新成功后清除相关缓存
        this.clearCache('queryAllMembers');
        this.clearCache('queryMembers');
        this.clearCache(`getMember_${JSON.stringify({ recordId })}`);
        console.log('会员更新成功，已清除相关缓存');
      } else {
        console.error(`更新会员信息失败，recordId: ${recordId}`);
      }
      
      return response;
    } catch (error) {
      console.error('更新会员信息失败:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
      return {
        success: false,
        code: error.code || 500,
        message: error.message || '更新会员信息失败',
        data: null
      };
    }
  }
  
  /**
   * 删除会员 - 带缓存清除
   * @param {string} recordId - 会员记录ID
   * @returns {Promise} - 返回删除结果
   */
  async deleteMember(recordId) {
    try {
      const response = await this.datasheet.records.delete([recordId]);
      
      // 删除成功后清除相关缓存
      if (response.success) {
        this.clearCache('queryAllMembers');
        this.clearCache('queryMembers');
        this.clearCache(`getMember_${JSON.stringify({ recordId })}`);
        console.log('会员删除成功，已清除相关缓存');
      }
      
      return response;
    } catch (error) {
      console.error('删除会员失败:', error);
      return {
        success: false,
        code: error.code || 500,
        message: error.message || '删除会员失败',
        data: null
      };
    }
  }
  



}

module.exports = VikaService;