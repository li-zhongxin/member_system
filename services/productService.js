import { Vika } from '@vikadata/vika';

// 商品维格表配置
const PRODUCT_VIKA_CONFIG = {
  token: 'uskDLBBvPp4L0LwEWFHeZ4V',
  datasheetId: 'dstnDZemXHlWWbzmt8',
  viewId: 'viwfUQV97FPmC',
  fieldKey: 'name'
};

// 初始化维格表SDK
const vika = new Vika({ 
  token: PRODUCT_VIKA_CONFIG.token, 
  fieldKey: PRODUCT_VIKA_CONFIG.fieldKey 
});

/**
 * 商品服务类
 */
class ProductService {
  constructor() {
    this.datasheet = vika.datasheet(PRODUCT_VIKA_CONFIG.datasheetId);
    this.cache = new Map();
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * 请求节流 - 确保每秒最多2次请求
   */
  async throttleRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // 确保请求间隔至少500ms（每秒2次）
      if (timeSinceLastRequest < 500) {
        await new Promise(resolve => setTimeout(resolve, 500 - timeSinceLastRequest));
      }

      const { requestFn, resolve, reject } = this.requestQueue.shift();
      this.lastRequestTime = Date.now();

      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessingQueue = false;
  }
  /**
   * 获取所有商品
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 商品列表
   */
  async getAllProducts(options = {}) {
    const cacheKey = `products_${JSON.stringify(options)}`;
    
    // 检查缓存（5分钟有效期）
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.data;
      }
    }

    try {
      const response = await this.throttleRequest(async () => {
        return await this.datasheet.records.query({
          viewId: PRODUCT_VIKA_CONFIG.viewId,
          ...options
        });
      });
      
      if (response.success) {
        const result = {
          success: true,
          data: response.data
        };
        
        // 缓存结果
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        return result;
      } else {
        console.error('获取商品失败:', response);
        return {
          success: false,
          error: response.message || '获取商品失败'
        };
      }
    } catch (error) {
      console.error('获取商品异常:', error);
      return {
        success: false,
        error: '网络异常，请稍后重试'
      };
    }
  }

  /**
   * 根据ID获取单个商品
   * @param {string} recordId - 记录ID
   * @returns {Promise<Object>} 商品信息
   */
  async getProductById(recordId) {
    try {
      const response = await this.datasheet.records.query({
        recordIds: [recordId]
      });
      
      if (response.success && response.data.records.length > 0) {
        return {
          success: true,
          data: response.data.records[0]
        };
      } else {
        return {
          success: false,
          error: '商品不存在'
        };
      }
    } catch (error) {
      console.error('获取商品详情异常:', error);
      return {
        success: false,
        error: '网络异常，请稍后重试'
      };
    }
  }

  /**
   * 搜索商品
   * @param {string} searchTerm - 搜索关键词
   * @returns {Promise<Object>} 搜索结果
   */
  async searchProducts(searchTerm) {
    try {
      const response = await this.datasheet.records.query({
        viewId: PRODUCT_VIKA_CONFIG.viewId,
        filterByFormula: `OR({name} = "${searchTerm}", {id} = "${searchTerm}", FIND("${searchTerm}", {name}) > 0)`
      });
      
      if (response.success) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: response.message || '搜索失败'
        };
      }
    } catch (error) {
      console.error('搜索商品异常:', error);
      return {
        success: false,
        error: '网络异常，请稍后重试'
      };
    }
  }

  /**
   * 创建新商品
   * @param {Object} productData - 商品数据
   * @returns {Promise<Object>} 创建结果
   */
  async createProduct(productData) {
    try {
      // 生成12位纯数字ID
      const productId = this.generateProductId();
      
      const newProduct = {
        name: productData.name,
        id: productId,
        kind: productData.kind,
        remaining_quantity: productData.remaining_quantity || 0,
        unit: productData.unit || '',
        specifications: productData.specifications,
        price: productData.price,
        status: productData.status,
        note: productData.note || ''
      };

      const response = await this.datasheet.records.create([
        { fields: newProduct }
      ]);
      
      if (response.success) {
        return {
          success: true,
          data: response.data.records[0]
        };
      } else {
        return {
          success: false,
          error: response.message || '创建商品失败'
        };
      }
    } catch (error) {
      console.error('创建商品异常:', error);
      return {
        success: false,
        error: '网络异常，请稍后重试'
      };
    }
  }

  /**
   * 更新商品信息
   * @param {string} recordId - 记录ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateProduct(recordId, updateData) {
    try {
      const response = await this.datasheet.records.update([
        {
          recordId: recordId,
          fields: updateData
        }
      ]);
      
      if (response.success) {
        return {
          success: true,
          data: response.data.records[0]
        };
      } else {
        return {
          success: false,
          error: response.message || '更新商品失败'
        };
      }
    } catch (error) {
      console.error('更新商品异常:', error);
      return {
        success: false,
        error: '网络异常，请稍后重试'
      };
    }
  }

  /**
   * 删除商品
   * @param {string} recordId - 记录ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteProduct(recordId) {
    try {
      const response = await this.datasheet.records.delete([recordId]);
      
      if (response.success) {
        return {
          success: true,
          message: '商品删除成功'
        };
      } else {
        return {
          success: false,
          error: response.message || '删除商品失败'
        };
      }
    } catch (error) {
      console.error('删除商品异常:', error);
      return {
        success: false,
        error: '网络异常，请稍后重试'
      };
    }
  }

  /**
   * 批量更新商品库存
   * @param {Array} updates - 更新数组 [{recordId, quantity}]
   * @returns {Promise<Object>} 更新结果
   */
  async batchUpdateStock(updates) {
    try {
      const updateRecords = updates.map(update => ({
        recordId: update.recordId,
        fields: {
          remaining_quantity: update.quantity
        }
      }));

      const response = await this.datasheet.records.update(updateRecords);
      
      if (response.success) {
        return {
          success: true,
          data: response.data.records
        };
      } else {
        return {
          success: false,
          error: response.message || '批量更新库存失败'
        };
      }
    } catch (error) {
      console.error('批量更新库存异常:', error);
      return {
        success: false,
        error: '网络异常，请稍后重试'
      };
    }
  }

  /**
   * 生成12位纯数字商品ID
   * @returns {string} 商品ID
   */
  generateProductId() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return (timestamp + random).slice(-12);
  }

  /**
   * 获取商品统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getProductStats() {
    try {
      const response = await this.getAllProducts();
      
      if (response.success) {
        const products = response.data.records;
        const stats = {
          total: products.length,
          active: products.filter(p => p.fields.status === '上架').length,
          inactive: products.filter(p => p.fields.status === '下架').length,
          lowStock: products.filter(p => p.fields.remaining_quantity < 10).length,
          services: products.filter(p => p.fields.kind === '服务项目').length,
          goods: products.filter(p => p.fields.kind === '普通商品').length
        };
        
        return {
          success: true,
          data: stats
        };
      } else {
        return response;
      }
    } catch (error) {
      console.error('获取商品统计异常:', error);
      return {
        success: false,
        error: '网络异常，请稍后重试'
      };
    }
  }

  /**
   * 更新库存数量
   * @param {string} recordId - 记录ID
   * @param {number} newQuantity - 新库存数量
   * @param {string} reason - 调整原因
   * @returns {Promise<Object>} 更新结果
   */
  async updateInventory(recordId, newQuantity) {
    try {
      const updateData = {
        remaining_quantity: String(newQuantity)
      };

      const response = await this.datasheet.records.update([
        {
          recordId: recordId,
          fields: updateData
        }
      ]);

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.message || '更新库存失败' };
      }
    } catch (error) {
      console.error('更新库存失败:', error);
      return { success: false, error: '更新库存失败' };
    }
  }

  /**
   * 更新商品状态（上架/下架）
   * @param {string} recordId - 记录ID
   * @param {string} status - 商品状态
   * @returns {Promise<Object>} 更新结果
   */
  async updateProductStatus(recordId, status) {
    try {
      const response = await this.datasheet.records.update([
        {
          recordId: recordId,
          fields: {
            status: status
          }
        }
      ]);

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.message || '更新商品状态失败' };
      }
    } catch (error) {
      console.error('更新商品状态失败:', error);
      return { success: false, error: '更新商品状态失败' };
    }
  }
}

// 导出类和单例实例
export { ProductService };
const productService = new ProductService();
export default productService;