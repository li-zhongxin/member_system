import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../services/apiService';
import '../styles/memberform.css';

function MemberForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  console.log('会员表单模式:', isEditMode ? '编辑' : '新增', '会员ID:', id);
  
  const [formData, setFormData] = useState({
    member_name: '',
    phonenumber: '',
    member_level: '青铜',
    member_status: '启用',
    Remaining_sum: 0,
    note: '',
    date: new Date().toISOString().split('T')[0], // 添加日期字段，默认为今天
    time: new Date().toTimeString().split(' ')[0] // 添加时间字段，默认为当前时间（HH:MM:SS格式）
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditMode) {
      console.log('编辑模式，准备获取会员数据，ID:', id);
      fetchMemberData();
    } else {
      console.log('新增模式，不需要获取会员数据');
    }
  }, [id]);

  const fetchMemberData = async () => {
    try {
      setLoading(true);
      console.log(`开始获取会员数据，ID: ${id}`);
      
      if (!id) {
        console.error('会员ID为空，无法获取数据');
        setError('获取会员数据失败: 会员ID不能为空');
        setLoading(false);
        return;
      }
      
      // 使用ApiService获取会员数据
      console.log(`发送API请求: /api/members/${id}`);
      const response = await ApiService.getMember(id);
      console.log('API响应:', response);
      
      if (response.success && response.data) {
        // 处理日期字段，确保格式正确
        const fields = response.data.fields;
        console.log('获取到的会员字段:', fields);
        
        if (fields) {
          // 创建一个新对象，包含所有必要的字段，确保即使API返回的数据不完整也能正常显示
          const updatedFormData = {
            member_name: fields.member_name || '',
            phonenumber: fields.phonenumber || '',
            member_level: fields.member_level || '青铜',
            member_status: fields.member_status || '启用',
            Remaining_sum: fields['Remaining sum'] || fields.Remaining_sum || 0,
            note: fields.note || '',
            date: ''
          };
          
          // 处理日期
          if (fields.date) {
            // 如果日期存在，转换为YYYY-MM-DD格式
            const date = new Date(fields.date);
            if (!isNaN(date.getTime())) {
              updatedFormData.date = date.toISOString().split('T')[0];
              console.log('日期格式化成功:', updatedFormData.date);
            } else {
              updatedFormData.date = new Date().toISOString().split('T')[0]; // 如果日期无效，使用今天的日期
              console.log('日期无效，使用今天的日期:', updatedFormData.date);
            }
          } else {
            updatedFormData.date = new Date().toISOString().split('T')[0]; // 如果没有日期，使用今天的日期
            console.log('日期字段不存在，使用今天的日期:', updatedFormData.date);
          }
          
          console.log('更新表单数据:', updatedFormData);
          setFormData(updatedFormData);
          setError(null);
        } else {
          console.error('会员数据字段缺失');
          setError('获取会员数据失败: 会员数据格式不正确');
        }
      } else {
        console.error('API返回错误:', response.data);
        // 即使API返回错误，也尝试使用默认值填充表单
        const defaultFormData = {
          member_name: '',
          phonenumber: '',
          member_level: '青铜',
          member_status: '启用',
          Remaining_sum: 0,
          note: '',
          date: new Date().toISOString().split('T')[0]
        };
        console.log('使用默认表单数据:', defaultFormData);
        setFormData(defaultFormData);
        setError('获取会员数据失败: ' + (response.data.message || '未知错误') + '，但您仍可以编辑并保存');
      }
    } catch (err) {
      console.error('获取会员数据错误:', err);
      
      // 根据不同错误类型提供相应的处理
      const defaultFormData = {
        member_name: '',
        phonenumber: '',
        member_level: '青铜',
        member_status: '启用',
        Remaining_sum: 0,
        note: '',
        date: new Date().toISOString().split('T')[0]
      };
      
      if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message || '未知错误';
        
        switch (status) {
          case 429:
            console.log('API调用频率超限，使用空表单供用户编辑');
            setFormData(defaultFormData);
            setError('API调用频率超限，请稍后重试。您可以重新输入会员信息并保存');
            break;
          case 500:
            console.log('维格表服务器内部错误，使用空表单供用户编辑');
            setFormData(defaultFormData);
            setError('维格表服务器内部错误，无法加载原始数据，但您可以重新输入会员信息并保存');
            break;
          case 401:
            console.log('API Token无效，使用空表单供用户编辑');
            setFormData(defaultFormData);
            setError('API认证失败，请联系管理员。您可以重新输入会员信息并保存');
            break;
          case 403:
            console.log('没有权限访问数据表，使用空表单供用户编辑');
            setFormData(defaultFormData);
            setError('没有权限访问数据表，请联系管理员。您可以重新输入会员信息并保存');
            break;
          case 404:
            console.log('会员不存在，使用空表单供用户编辑');
            setFormData(defaultFormData);
            setError('会员不存在，您可以重新输入会员信息并保存');
            break;
          default:
            console.log('发生未知错误，使用空表单供用户编辑');
            setFormData(defaultFormData);
            setError(`获取会员数据失败: ${message}，但您仍可以编辑并保存`);
        }
      } else {
        // 网络错误或其他错误
        console.log('网络错误或其他错误，使用空表单供用户编辑');
        setFormData(defaultFormData);
        setError('网络连接错误: ' + (err.message || '未知错误') + '，但您仍可以编辑并保存');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 表单验证
    if (!formData.member_name.trim()) {
      setError('会员姓名不能为空');
      return;
    }
    
    if (!formData.phonenumber.trim() || !/^\d{11}$/.test(formData.phonenumber)) {
      setError('请输入有效的11位手机号码');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // 检查手机号是否已存在
      const phoneCheckResponse = await ApiService.checkPhoneExists(
        formData.phonenumber, 
        isEditMode ? id : null
      );
      
      if (!phoneCheckResponse.success) {
        setError('检查手机号失败: ' + phoneCheckResponse.message);
        setSubmitting(false);
        return;
      }
      
      if (phoneCheckResponse.data.exists) {
        setError('该手机号已被其他会员使用，请使用其他手机号');
        setSubmitting(false);
        return;
      }
      
      if (isEditMode) {
        // 编辑模式 - 更新会员信息
        // 将前端字段名映射为维格表字段名
        const submitData = {
          ...formData,
          'Remaining sum': formData.Remaining_sum
        };
        delete submitData.Remaining_sum;
        
        const response = await ApiService.updateMember(id, submitData);
        
        if (response.success) {
          alert('会员信息更新成功！');
          navigate('/members');
        } else {
          setError('更新会员失败: ' + response.message);
        }
      } else {
        // 新增模式 - 创建新会员
        // 将前端字段名映射为维格表字段名
        const submitData = {
          ...formData,
          'Remaining sum': formData.Remaining_sum
        };
        delete submitData.Remaining_sum;
        
        const response = await ApiService.createMember(submitData);
        
        if (response.success) {
          alert('会员创建成功！');
          navigate('/members');
        } else {
          setError('创建会员失败: ' + response.message);
        }
      }
      setSubmitting(false);
    } catch (err) {
      setError(`${isEditMode ? '更新' : '创建'}会员失败: ` + (err.message || '未知错误'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="member-form-container fade-in">
      <h1 className="page-title mb-4 slide-in-left">
        {isEditMode ? '编辑会员信息' : '新增会员'}
      </h1>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}
      
      <div className="card hover-lift">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label htmlFor="member_name" className="form-label">会员姓名 <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    id="member_name"
                    name="member_name"
                    value={formData.member_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label htmlFor="phonenumber" className="form-label">手机号码 <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    id="phonenumber"
                    name="phonenumber"
                    value={formData.phonenumber}
                    onChange={handleChange}
                    pattern="^\d{11}$"
                    required
                  />
                  <div className="form-text">请输入11位手机号码</div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label htmlFor="member_level" className="form-label">会员等级</label>
                  <select
                    className="form-select"
                    id="member_level"
                    name="member_level"
                    value={formData.member_level}
                    onChange={handleChange}
                  >
                    <option value="黑金">黑金</option>
                    <option value="钻石">钻石</option>
                    <option value="铂金">铂金</option>
                    <option value="黄金">黄金</option>
                    <option value="白银">白银</option>
                    <option value="青铜">青铜</option>
                  </select>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label htmlFor="member_status" className="form-label">会员状态</label>
                  <select
                    className="form-select"
                    id="member_status"
                    name="member_status"
                    value={formData.member_status}
                    onChange={handleChange}
                  >
                    <option value="启用">启用</option>
                    <option value="停用">停用</option>
                  </select>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label htmlFor="Remaining_sum" className="form-label">账户余额</label>
                  <div className="input-group">
                    <span className="input-group-text">¥</span>
                    <input
                      type="number"
                      className="form-control"
                      id="Remaining_sum"
                      name="Remaining_sum"
                      value={formData.Remaining_sum}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label htmlFor="date" className="form-label">注册日期</label>
                  <input
                    type="date"
                    className="form-control"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label htmlFor="time" className="form-label">注册时间</label>
                  <input
                    type="time"
                    className="form-control"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    step="1"
                  />
                  <div className="form-text">24小时制格式（HH:MM:SS）</div>
                </div>
              </div>
              
              <div className="col-12">
                <div className="form-group mb-3">
                  <label htmlFor="note" className="form-label">备注</label>
                  <textarea
                    className="form-control"
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    rows="3"
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/members')}
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    处理中...
                  </>
                ) : (
                  isEditMode ? '保存修改' : '创建会员'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default MemberForm;