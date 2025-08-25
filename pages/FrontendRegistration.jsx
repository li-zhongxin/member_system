import React, { useState } from 'react';
import ApiService from '../services/apiService';
import '../styles/frontend-registration.css';
import '../styles/global-enhancement.css';

function FrontendRegistration() {
  const [formData, setFormData] = useState({
    member_name: '',
    phonenumber: '',
    member_level: '青铜',
    'Remaining sum': 0,
    Remaining_sum: 0,
    member_status: '启用',
    note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [initialRecharge, setInitialRecharge] = useState('');

  // 会员等级选项
  const memberLevels = ['青铜', '白银', '黄金', '铂金', '钻石', '黑金'];
  
  // 快捷充值金额
  const quickAmounts = [0, 50, 100, 200, 500, 1000];

  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 快捷设置初始充值金额
  const handleQuickRecharge = (amount) => {
    setInitialRecharge(amount.toString());
    setFormData(prev => ({
      ...prev,
      'Remaining sum': amount,
      Remaining_sum: amount
    }));
  };

  // 处理初始充值金额变化
  const handleRechargeChange = (e) => {
    const value = e.target.value;
    setInitialRecharge(value);
    setFormData(prev => ({
      ...prev,
      'Remaining sum': parseFloat(value) || 0,
      Remaining_sum: parseFloat(value) || 0
    }));
  };

  // 验证表单
  const validateForm = () => {
    if (!formData.member_name.trim()) {
      setMessage({ type: 'error', text: '请输入会员姓名' });
      return false;
    }

    if (!formData.phonenumber.trim()) {
      setMessage({ type: 'error', text: '请输入手机号码' });
      return false;
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.phonenumber)) {
      setMessage({ type: 'error', text: '请输入正确的手机号码格式' });
      return false;
    }

    if ((formData['Remaining sum'] || formData.Remaining_sum || 0) < 0) {
      setMessage({ type: 'error', text: '初始充值金额不能为负数' });
      return false;
    }

    return true;
  };

  // 检查手机号是否已存在
  const checkPhoneExists = async (phone) => {
    try {
      const response = await ApiService.getAllMembers();
      if (response.success) {
        const existingMember = response.data.records.find(
          member => member.fields.phonenumber === phone
        );
        return existingMember;
      }
      return null;
    } catch (error) {
      console.error('检查手机号失败:', error);
      return null;
    }
  };

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      // 检查手机号是否已存在
      const existingMember = await checkPhoneExists(formData.phonenumber);
      if (existingMember) {
        setMessage({ 
          type: 'error', 
          text: `手机号 ${formData.phonenumber} 已被会员 "${existingMember.fields.member_name}" 使用` 
        });
        setIsSubmitting(false);
        return;
      }

      // 准备提交数据
      const submitData = {
        ...formData,
        date: new Date().toISOString(),
        time: new Date().toISOString()
      };

      const response = await ApiService.createMember(submitData);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `会员 "${formData.member_name}" 注册成功！${(formData['Remaining sum'] || formData.Remaining_sum || 0) > 0 ? `初始余额：¥${(formData['Remaining sum'] || formData.Remaining_sum || 0)}` : ''}` 
        });
        
        // 重置表单
        setFormData({
          member_name: '',
          phonenumber: '',
          member_level: '青铜',
          'Remaining sum': 0,
          Remaining_sum: 0,
          note: ''
        });
        setInitialRecharge('');
      } else {
        setMessage({ type: 'error', text: '注册失败：' + response.message });
      }
    } catch (error) {
      console.error('注册会员失败:', error);
      setMessage({ type: 'error', text: '注册失败，请稍后重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    setFormData({
      member_name: '',
      phonenumber: '',
      member_level: '青铜',
      'Remaining sum': 0,
      Remaining_sum: 0,
      member_status: '启用',
      note: ''
    });
    setInitialRecharge('');
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="frontend-registration">
      <div className="registration-container">
        <div className="registration-header">
          <h2>会员办卡</h2>
          <p>请填写会员基本信息</p>
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          {/* 基本信息 */}
          <div className="form-section">
            <h3>基本信息</h3>
            
            <div className="form-group">
              <label htmlFor="member_name">会员姓名 *</label>
              <input
                type="text"
                id="member_name"
                name="member_name"
                value={formData.member_name}
                onChange={handleInputChange}
                placeholder="请输入会员姓名"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phonenumber">手机号码 *</label>
              <input
                type="tel"
                id="phonenumber"
                name="phonenumber"
                value={formData.phonenumber}
                onChange={handleInputChange}
                placeholder="请输入11位手机号码"
                className="form-input"
                maxLength="11"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="member_level">会员等级</label>
              <select
                id="member_level"
                name="member_level"
                value={formData.member_level}
                onChange={handleInputChange}
                className="form-select"
              >
                {memberLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="member_status">会员状态</label>
              <select
                id="member_status"
                name="member_status"
                value={formData.member_status}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="启用">启用</option>
                <option value="停用">停用</option>
              </select>
            </div>
          </div>

          {/* 初始充值 */}
          <div className="form-section">
            <h3>初始充值</h3>
            
            {/* 快捷充值按钮 */}
            <div className="quick-amounts">
              <label>快捷设置：</label>
              <div className="amount-buttons">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleQuickRecharge(amount)}
                    className={`amount-btn ${initialRecharge === amount.toString() ? 'active' : ''}`}
                  >
                    {amount === 0 ? '不充值' : `¥${amount}`}
                  </button>
                ))}
              </div>
            </div>

            {/* 自定义金额输入 */}
            <div className="form-group">
              <label htmlFor="initialRecharge">自定义金额</label>
              <div className="amount-input-group">
                <span className="currency">¥</span>
                <input
                  type="number"
                  id="initialRecharge"
                  value={initialRecharge}
                  onChange={handleRechargeChange}
                  placeholder="请输入初始充值金额"
                  className="amount-input"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* 充值预览 */}
            {(formData['Remaining sum'] || formData.Remaining_sum || 0) > 0 && (
              <div className="recharge-preview">
                <div className="preview-item">
                  <span>初始充值金额：</span>
                  <span className="amount">¥{(formData['Remaining sum'] || formData.Remaining_sum || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 备注信息 */}
          <div className="form-section">
            <h3>备注信息</h3>
            
            <div className="form-group">
              <label htmlFor="note">备注</label>
              <textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                placeholder="请输入备注信息（选填）"
                className="form-textarea"
                rows="3"
              />
            </div>
          </div>

          {/* 表单操作按钮 */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleReset}
              className="reset-btn"
              disabled={isSubmitting}
            >
              重置
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? '注册中...' : '确认办卡'}
            </button>
          </div>
        </form>

        {/* 会员信息预览 */}
        {(formData.member_name || formData.phonenumber) && (
          <div className="member-preview">
            <h3>会员信息预览</h3>
            <div className="preview-card">
              <div className="preview-item">
                <label>姓名：</label>
                <span>{formData.member_name || '未填写'}</span>
              </div>
              <div className="preview-item">
                <label>手机号：</label>
                <span>{formData.phonenumber || '未填写'}</span>
              </div>
              <div className="preview-item">
                <label>会员等级：</label>
                <span>{formData.member_level}</span>
              </div>
              <div className="preview-item">
                <label>会员状态：</label>
                <span>{formData.member_status}</span>
              </div>
              <div className="preview-item">
                <label>初始余额：</label>
                <span className="balance">¥{(formData['Remaining sum'] || formData.Remaining_sum || 0).toFixed(2)}</span>
              </div>
              {formData.note && (
                <div className="preview-item">
                  <label>备注：</label>
                  <span>{formData.note}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 消息提示 */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default FrontendRegistration;