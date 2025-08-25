/**
 * 前端一体化 API 服务
 * 直接在前端调用维格表 API
 */
import { Vika } from '@vikadata/vika';

// 维格表配置
const VIKA_TOKEN = 'usk3ff9QIs2UFqjvQZD4yYQ';
const DATASHEET_ID = 'dst4AHXevG2Hp7P3Kf';
const CONSUMPTION_RECORDS_DATASHEET_ID = 'dstDjt1AquoJThWmZu'; // 消费记录表ID
// 使用专门的库存盘点记录表
const INVENTORY_RECORDS_DATASHEET_ID = 'dstq0VaNc1f6FvrhSp'; // 库存盘点记录表ID
const INVENTORY_RECORDS_TOKEN = 'uskvQeeQdSpDjFSKJoXddN3'; // 库存盘点记录表的API Token
const INVENTORY_RECORDS_VIEW_ID = 'viwGgjlyroQQp'; // 库存盘点记录表的视图ID

// 创建维格表实例
const vika = new Vika({ token: VIKA_TOKEN, fieldKey: 'name' });
const datasheet = vika.datasheet(DATASHEET_ID);
const consumptionRecordsDatasheet = vika.datasheet(CONSUMPTION_RECORDS_DATASHEET_ID);
// 为库存盘点记录表创建单独的实例
const inventoryVikaInstance = new Vika({ token: INVENTORY_RECORDS_TOKEN, fieldKey: 'name' });
const inventoryRecordsDatasheet = inventoryVikaInstance.datasheet(INVENTORY_RECORDS_DATASHEET_ID);

// QPS控制配置
class RequestQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.maxQPS = 1.5; // 设置为1.5 QPS，低于2 QPS限制
    this.requestInterval = 1000 / this.maxQPS; // 请求间隔
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();

      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // 等待请求间隔
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.requestInterval));
      }
    }

    this.isProcessing = false;
  }
}

const requestQueue = new RequestQueue();

/**
 * API 服务类
 */
class ApiService {
  /**
   * 获取所有会员信息
   */
  static async getAllMembers() {
    return requestQueue.add(async () => {
      try {
        console.log('正在获取所有会员信息...');
        
        const response = await datasheet.records.query({
          maxRecords: 1000 // 获取更多记录
        });
        
        if (response.success) {
          console.log(`成功获取会员信息，共${response.data.records.length}条记录`);
          return {
            success: true,
            data: response.data,
            message: '获取成功'
          };
        } else {
          console.error('获取会员信息失败:', response);
          return {
            success: false,
            message: response.message || '获取会员信息失败',
            data: null
          };
        }
      } catch (error) {
        console.error('获取会员信息异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 获取单个会员信息
   */
  static async getMember(recordId) {
    return requestQueue.add(async () => {
      try {
        console.log(`正在获取会员信息，ID: ${recordId}`);
        
        const response = await datasheet.records.query({
          recordIds: [recordId]
        });
        
        if (response.success && response.data.records.length > 0) {
          return {
            success: true,
            data: {
              recordId: response.data.records[0].recordId,
              fields: response.data.records[0].fields,
              createdTime: response.data.records[0].createdTime
            },
            message: '获取成功'
          };
        } else {
          return {
            success: false,
            message: '会员不存在',
            data: null
          };
        }
      } catch (error) {
        console.error('获取会员信息异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 创建会员
   */
  static async createMember(memberData) {
    return requestQueue.add(async () => {
      try {
        console.log('正在创建会员:', memberData);
        
        const response = await datasheet.records.create([
          {
            fields: memberData
          }
        ]);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: '创建成功'
          };
        } else {
          return {
            success: false,
            message: response.message || '创建会员失败',
            data: null
          };
        }
      } catch (error) {
        console.error('创建会员异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 更新会员信息
   */
  static async updateMember(recordId, memberData) {
    return requestQueue.add(async () => {
      try {
        console.log(`正在更新会员，ID: ${recordId}`, memberData);
        
        const response = await datasheet.records.update([
          {
            recordId: recordId,
            fields: memberData
          }
        ]);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: '更新成功'
          };
        } else {
          return {
            success: false,
            message: response.message || '更新会员失败',
            data: null
          };
        }
      } catch (error) {
        console.error('更新会员异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 删除会员
   */
  static async deleteMember(recordId) {
    return requestQueue.add(async () => {
      try {
        console.log(`正在删除会员，ID: ${recordId}`);
        
        const response = await datasheet.records.delete([recordId]);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: '删除成功'
          };
        } else {
          return {
            success: false,
            message: response.message || '删除会员失败',
            data: null
          };
        }
      } catch (error) {
        console.error('删除会员异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 会员充值
   */
  static async rechargeMember(recordId, amount) {
    return requestQueue.add(async () => {
      try {
        // 先获取当前会员信息
        const response = await datasheet.records.query({
          recordIds: [recordId]
        });
        
        if (!response.success || !response.data.records.length) {
          return {
            success: false,
            message: '会员不存在',
            data: null
          };
        }
        
        const member = response.data.records[0];
        const currentBalance = parseFloat(member.fields['Remaining sum'] || member.fields.Remaining_sum || 0);
        const newBalance = currentBalance + amount;

        // 更新余额
        const updateResponse = await datasheet.records.update([
          {
            recordId: recordId,
            fields: {
              'Remaining sum': newBalance
            }
          }
        ]);

        if (updateResponse.success) {
          // 创建消费记录
          const consumptionRecordData = {
            member_name: member.fields.member_name,
            phonenumber: member.fields.phonenumber,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0],
            record: `充值${amount}元`
          };
          
          // 异步创建消费记录，不影响充值结果
          this.createConsumptionRecord(consumptionRecordData).catch(error => {
            console.error('创建充值记录失败:', error);
          });
          
          return {
            success: true,
            data: {
              memberName: member.fields.member_name,
              rechargeAmount: amount,
              previousBalance: currentBalance,
              newBalance: newBalance
            },
            message: '充值成功'
          };
        } else {
          return {
            success: false,
            message: updateResponse.message || '更新余额失败',
            data: null
          };
        }
      } catch (error) {
        console.error('充值异常:', error);
        return {
          success: false,
          message: error.message || '充值失败',
          data: null
        };
      }
    });
  }

  /**
   * 会员消费
   */
  static async consumeMember(recordId, amount, productDetails = null) {
    return requestQueue.add(async () => {
      try {
        // 先获取当前会员信息
        const response = await datasheet.records.query({
          recordIds: [recordId]
        });
        
        if (!response.success || !response.data.records.length) {
          return {
            success: false,
            message: '会员不存在',
            data: null
          };
        }
        
        const member = response.data.records[0];
        const currentBalance = parseFloat(member.fields['Remaining sum'] || member.fields.Remaining_sum || 0);
        
        if (currentBalance < amount) {
          return {
            success: false,
            message: '余额不足',
            data: null
          };
        }

        const newBalance = currentBalance - amount;

        // 更新余额
        const updateResponse = await datasheet.records.update([
          {
            recordId: recordId,
            fields: {
              'Remaining sum': newBalance
            }
          }
        ]);

        if (updateResponse.success) {
          // 创建消费记录
          const consumptionRecordData = {
            member_name: member.fields.member_name,
            phonenumber: member.fields.phonenumber,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0],
            record: `消费${amount}元`,
            product_details: productDetails || null
          };
          
          // 异步创建消费记录，不影响消费结果
          this.createConsumptionRecord(consumptionRecordData).catch(error => {
            console.error('创建消费记录失败:', error);
          });
          
          return {
            success: true,
            data: {
              memberName: member.fields.member_name,
              consumeAmount: amount,
              previousBalance: currentBalance,
              newBalance: newBalance
            },
            message: '消费成功'
          };
        } else {
          return {
            success: false,
            message: updateResponse.message || '更新余额失败',
            data: null
          };
        }
      } catch (error) {
        console.error('消费异常:', error);
        return {
          success: false,
          message: error.message || '消费失败',
          data: null
        };
      }
    });
  }

  /**
   * 获取统计数据
   */
  static async getStatistics() {
    try {
      const response = await this.getAllMembers();
      
      if (!response.success) {
        return response;
      }

      const members = response.data.records;
      const totalMembers = members.length;
      const totalBalance = members.reduce((sum, member) => {
        return sum + (parseFloat(member.fields['Remaining sum'] || member.fields.Remaining_sum) || 0);
      }, 0);

      // 按等级统计
      const levelStats = {};
      members.forEach(member => {
        const level = member.fields.level || '普通会员';
        levelStats[level] = (levelStats[level] || 0) + 1;
      });

      return {
        success: true,
        data: {
          totalMembers,
          totalBalance,
          levelStats
        },
        message: '获取统计数据成功'
      };
    } catch (error) {
      console.error('获取统计数据异常:', error);
      return {
        success: false,
        message: error.message || '获取统计数据失败',
        data: null
      };
    }
  }

  /**
   * 获取所有消费记录
   */
  static async getAllConsumptionRecords() {
    return requestQueue.add(async () => {
      try {
        console.log('正在获取所有消费记录...');
        
        const response = await consumptionRecordsDatasheet.records.query({
          viewId: 'viwgSA5HfQb7W',
          maxRecords: 1000,
          sort: [{ field: 'date', order: 'desc' }]
        });
        
        if (response.success) {
          console.log(`成功获取消费记录，共${response.data.records.length}条记录`);
          return {
            success: true,
            data: response.data,
            message: '获取成功'
          };
        } else {
          console.error('获取消费记录失败:', response);
          return {
            success: false,
            message: response.message || '获取消费记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('获取消费记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 获取充值记录
   */
  static async getRechargeRecords() {
    return requestQueue.add(async () => {
      try {
        console.log('正在获取充值记录...');
        
        const response = await consumptionRecordsDatasheet.records.query({
          viewId: 'viwgSA5HfQb7W',
          filterByFormula: "FIND('充值', {record}) > 0",
          maxRecords: 1000,
          sort: [{ field: 'date', order: 'desc' }]
        });
        
        if (response.success) {
          console.log(`成功获取充值记录，共${response.data.records.length}条记录`);
          return {
            success: true,
            data: response.data,
            message: '获取成功'
          };
        } else {
          console.error('获取充值记录失败:', response);
          return {
            success: false,
            message: response.message || '获取充值记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('获取充值记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 获取消费记录
   */
  static async getConsumeRecords() {
    return requestQueue.add(async () => {
      try {
        console.log('正在获取消费记录...');
        
        const response = await consumptionRecordsDatasheet.records.query({
          viewId: 'viwgSA5HfQb7W',
          filterByFormula: "FIND('消费', {record}) > 0",
          maxRecords: 1000,
          sort: [{ field: 'date', order: 'desc' }]
        });
        
        if (response.success) {
          console.log(`成功获取消费记录，共${response.data.records.length}条记录`);
          return {
            success: true,
            data: response.data,
            message: '获取成功'
          };
        } else {
          console.error('获取消费记录失败:', response);
          return {
            success: false,
            message: response.message || '获取消费记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('获取消费记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 创建消费记录
   */
  static async createConsumptionRecord(recordData) {
    return requestQueue.add(async () => {
      try {
        console.log('正在创建消费记录:', recordData);
        
        const fields = {
          'member_name': recordData.member_name,
          'phonenumber': recordData.phonenumber,
          'date': recordData.date,
          'time': recordData.time,
          'record': recordData.record
        };
        
        // 如果有商品详情，添加到字段中
        if (recordData.product_details) {
          fields['product_details'] = recordData.product_details;
        }
        
        const response = await consumptionRecordsDatasheet.records.create([
          {
            fields: fields
          }
        ]);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: '创建消费记录成功'
          };
        } else {
          return {
            success: false,
            message: response.message || '创建消费记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('创建消费记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 删除消费记录
   */
  static async deleteConsumptionRecord(recordId) {
    return requestQueue.add(async () => {
      try {
        console.log(`正在删除消费记录，ID: ${recordId}`);
        
        const response = await consumptionRecordsDatasheet.records.delete([recordId]);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: '删除消费记录成功'
          };
        } else {
          return {
            success: false,
            message: response.message || '删除消费记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('删除消费记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 批量删除消费记录
   */
  static async deleteMultipleConsumptionRecords(recordIds) {
    return requestQueue.add(async () => {
      try {
        console.log(`正在批量删除消费记录，IDs: ${recordIds.join(', ')}`);
        
        const response = await consumptionRecordsDatasheet.records.delete(recordIds);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: `成功删除${recordIds.length}条消费记录`
          };
        } else {
          return {
            success: false,
            message: response.message || '批量删除消费记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('批量删除消费记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 搜索消费记录（按会员手机号）
   */
  static async searchConsumptionRecords(memberPhone) {
    return requestQueue.add(async () => {
      try {
        console.log(`正在搜索消费记录，手机号: ${memberPhone}`);
        
        const response = await consumptionRecordsDatasheet.records.query({
          viewId: 'viwgSA5HfQb7W',
          filterByFormula: `{phonenumber} = "${memberPhone}"`,
          maxRecords: 1000,
          sort: [{ field: 'date', order: 'desc' }]
        });
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: '搜索成功'
          };
        } else {
          return {
            success: false,
            message: response.message || '搜索消费记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('搜索消费记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 检查手机号是否已存在
   */
  static async checkPhoneExists(phone, excludeRecordId = null) {
    return requestQueue.add(async () => {
      try {
        console.log(`正在检查手机号是否存在: ${phone}`);
        
        const response = await datasheet.records.query({
          filterByFormula: `{phonenumber} = "${phone}"`,
          maxRecords: 1000
        });
        
        if (response.success) {
          const existingRecords = response.data.records.filter(record => 
            excludeRecordId ? record.recordId !== excludeRecordId : true
          );
          
          return {
            success: true,
            data: {
              exists: existingRecords.length > 0,
              records: existingRecords
            },
            message: '检查完成'
          };
        } else {
          return {
            success: false,
            message: response.message || '检查手机号失败',
            data: null
          };
        }
      } catch (error) {
        console.error('检查手机号异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  // 获取最近活动记录
  async getRecentActivities(limit = 10) {
    return await requestQueue.add(async () => {
      try {
        console.log('正在获取最近活动记录...');
        
        const response = await consumptionRecordsDatasheet.records.query({
          maxRecords: limit,
          sort: [{ field: 'date', order: 'desc' }]
        });
        
        if (response.success) {
          const activities = response.data.records.map(record => {
            const actionRecord = record.fields['record'] || '';
            const isRecharge = actionRecord.includes('充值');
            
            return {
              id: record.recordId,
              memberName: record.fields['member_name'],
              memberPhone: record.fields['phonenumber'],
              date: record.fields['date'],
              action: actionRecord,
              type: isRecharge ? 'recharge' : 'consume',
              amount: parseFloat(actionRecord.match(/\d+(\.\d+)?/)?.[0] || 0)
            };
          });
          
          return {
            success: true,
            data: activities,
            message: '获取最近活动成功'
          };
        } else {
          return {
            success: false,
            message: response.message || '获取最近活动失败',
            data: []
          };
        }
      } catch (error) {
        console.error('获取最近活动异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: []
        };
      }
    });
  }

  /**
   * 创建库存盘点记录
   */
  static async createInventoryRecord(recordData) {
    return requestQueue.add(async () => {
      try {
        console.log('正在创建库存盘点记录:', recordData);
        
        // 确保所有数值字段都是数字类型
        const fields = {
          // 库存盘点记录表字段
          'product_name': recordData.product_name || '',
          'product_id': recordData.product_id || '',
          'expected_quantity': typeof recordData.expected_quantity === 'number' ? String(recordData.expected_quantity) : String(parseFloat(recordData.expected_quantity) || 0),
          'actual_quantity': typeof recordData.actual_quantity === 'number' ? String(recordData.actual_quantity) : String(parseFloat(recordData.actual_quantity) || 0),
          'operation': recordData.operation || (recordData.difference > 0 ? '增加' : (recordData.difference < 0 ? '减少' : '无变化')),
          'operation_quantity': typeof recordData.operation_quantity === 'number' ? String(recordData.operation_quantity) : String(Math.abs(parseFloat(recordData.difference) || 0)),
          'reason': recordData.inventory_reason || recordData.reason || '',
          'date': new Date().toISOString().split('T')[0],
          'time': new Date().toLocaleTimeString('zh-CN', { hour12: false })
        };
        
        // 如果有其他字段，也可以添加
        if (recordData.operator) {
          fields['operator'] = recordData.operator;
        }
        
        if (recordData.note) {
          fields['note'] = recordData.note;
        }
        
        const response = await inventoryRecordsDatasheet.records.create([
          {
            fields: fields
          }
        ]);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: '创建库存盘点记录成功'
          };
        } else {
          return {
            success: false,
            message: response.message || '创建库存盘点记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('创建库存盘点记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 获取所有库存盘点记录
   */
  static async getAllInventoryRecords() {
    return requestQueue.add(async () => {
      try {
        console.log('正在获取所有库存盘点记录...');
        
        const response = await inventoryRecordsDatasheet.records.query({
          maxRecords: 1000
          // 暂时移除排序参数，避免字段不存在错误
          // sort: [{ field: 'inventory_date', order: 'desc' }]
        });
        
        if (response.success) {
          console.log(`成功获取库存盘点记录，共${response.data.records.length}条记录`);
          // 输出第一条记录的字段信息用于调试
          if (response.data.records.length > 0) {
            console.log('第一条记录的字段:', Object.keys(response.data.records[0].fields));
            console.log('第一条记录的完整数据:', response.data.records[0]);
          }
          return {
            success: true,
            data: response.data,
            message: '获取成功'
          };
        } else {
          console.error('获取库存盘点记录失败:', response);
          return {
            success: false,
            message: response.message || '获取库存盘点记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('获取库存盘点记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 搜索库存盘点记录（按商品ID或商品名称）
   */
  static async searchInventoryRecords(searchTerm) {
    return requestQueue.add(async () => {
      try {
        console.log(`正在搜索库存盘点记录，搜索词: ${searchTerm}`);
        
        const response = await inventoryRecordsDatasheet.records.query({
          filterByFormula: `OR({product_id} = "${searchTerm}", FIND("${searchTerm}", {product_name}) > 0)`,
          maxRecords: 1000
          // 暂时移除排序参数，避免字段不存在错误
          // sort: [{ field: 'inventory_date', order: 'desc' }]
        });
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: '搜索成功'
          };
        } else {
          return {
            success: false,
            message: response.message || '搜索库存盘点记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('搜索库存盘点记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 删除库存盘点记录
   */
  static async deleteInventoryRecord(recordId) {
    return requestQueue.add(async () => {
      try {
        console.log(`正在删除库存盘点记录，ID: ${recordId}`);
        
        const response = await inventoryRecordsDatasheet.records.delete([recordId]);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: '删除库存盘点记录成功'
          };
        } else {
          return {
            success: false,
            message: response.message || '删除库存盘点记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('删除库存盘点记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 批量删除库存盘点记录
   */
  static async deleteMultipleInventoryRecords(recordIds) {
    return requestQueue.add(async () => {
      try {
        console.log(`正在批量删除库存盘点记录，IDs: ${recordIds.join(', ')}`);
        
        const response = await inventoryRecordsDatasheet.records.delete(recordIds);
        
        if (response.success) {
          return {
            success: true,
            data: response.data,
            message: `成功删除${recordIds.length}条库存盘点记录`
          };
        } else {
          return {
            success: false,
            message: response.message || '批量删除库存盘点记录失败',
            data: null
          };
        }
      } catch (error) {
        console.error('批量删除库存盘点记录异常:', error);
        return {
          success: false,
          message: error.message || '网络错误',
          data: null
        };
      }
    });
  }

  /**
   * 添加库存盘点记录（别名方法）
   */
  static async addInventoryRecord(recordData) {
    return this.createInventoryRecord(recordData);
  }
}

export default ApiService;