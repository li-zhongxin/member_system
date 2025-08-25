import { Vika } from '@vikadata/vika';

// 维格表配置
const VIKA_CONFIG = {
  token: 'usk3ff9QIs2UFqjvQZD4yYQ',
  datasheetId: 'dsteGp1BCnw8XvcxDF',
  viewId: 'viwhTiHpEPkz0'
};

// 初始化维格表SDK
const vika = new Vika({ 
  token: VIKA_CONFIG.token, 
  fieldKey: 'name' 
});

const datasheet = vika.datasheet(VIKA_CONFIG.datasheetId);

/**
 * 维格表用户服务
 */
class VikaUserService {
  /**
   * 获取用户资料（用于登录验证）
   * @param {string} username - 用户名
   * @returns {Promise<Object|null>} 用户信息或null
   */
  async getUserProfile(username = 'admin') {
    try {
      const response = await datasheet.records.query({
        viewId: VIKA_CONFIG.viewId,
        filterByFormula: `{username} = "${username}"`
      });

      if (response.success && response.data.records.length > 0) {
        const record = response.data.records[0];
        return {
          recordId: record.recordId,
          username: record.fields.username,
          postbox: record.fields.postbox,
          phonenumber: record.fields.phonenumber,
          department: record.fields.department,
          photo: record.fields.photo,
          login_password: record.fields.login_password
        };
      }
      return null;
    } catch (error) {
      console.error('获取用户资料失败:', error);
      return null;
    }
  }

  /**
   * 验证用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<boolean>} 验证结果
   */
  async validateLogin(username, password) {
    try {
      const userProfile = await this.getUserProfile(username);
      if (userProfile && userProfile.login_password === password) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('登录验证失败:', error);
      return false;
    }
  }

  /**
   * 更新用户资料
   * @param {string} username - 用户名
   * @param {Object} updateData - 更新的数据
   * @returns {Promise<boolean>} 更新结果
   */
  async updateUserProfile(username, updateData) {
    try {
      const userProfile = await this.getUserProfile(username);
      if (!userProfile) {
        console.error('用户不存在');
        return false;
      }

      const response = await datasheet.records.update([
        {
          recordId: userProfile.recordId,
          fields: updateData
        }
      ]);

      return response.success;
    } catch (error) {
      console.error('更新用户资料失败:', error);
      return false;
    }
  }

  /**
   * 创建新用户（如果需要）
   * @param {Object} userData - 用户数据
   * @returns {Promise<boolean>} 创建结果
   */
  async createUser(userData) {
    try {
      const response = await datasheet.records.create([
        {
          fields: userData
        }
      ]);

      return response.success;
    } catch (error) {
      console.error('创建用户失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const vikaUserService = new VikaUserService();
export default vikaUserService;