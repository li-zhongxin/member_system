import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import vikaUserService from '../services/vikaService';
import '../styles/profile.css';

function Profile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    username: '',
    postbox: '',
    phonenumber: '',
    department: '',
    photo: null,
    login_password: ''
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await vikaUserService.getUserProfile('admin');
      if (userProfile) {
        setProfileData({
          username: userProfile.username || '',
          postbox: userProfile.postbox || '',
          phonenumber: userProfile.phonenumber || '',
          department: userProfile.department || '',
          photo: userProfile.photo || null,
          login_password: userProfile.login_password || ''
        });
      }
    } catch (error) {
      console.error('获取用户资料失败:', error);
      setMessage({ type: 'error', text: '获取用户资料失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setTempData({ ...profileData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempData({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const updateData = {
        username: tempData.username,
        postbox: tempData.postbox,
        phonenumber: tempData.phonenumber,
        department: tempData.department,
        photo: tempData.photo
      };
      
      const success = await vikaUserService.updateUserProfile('admin', updateData);
      if (success) {
        setProfileData({ ...tempData });
        setIsEditing(false);
        setMessage({ type: 'success', text: '个人资料更新成功！' });
      } else {
        setMessage({ type: 'error', text: '更新失败，请稍后重试' });
      }
    } catch (error) {
      console.error('更新用户资料失败:', error);
      setMessage({ type: 'error', text: '更新失败，请稍后重试' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleInputChange = (field, value) => {
    setTempData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: '新密码和确认密码不匹配！' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: '密码长度至少6位！' });
      return;
    }
    if (passwordData.currentPassword !== profileData.login_password) {
      setMessage({ type: 'error', text: '当前密码不正确！' });
      return;
    }
    
    try {
      const success = await vikaUserService.updateUserProfile('admin', {
        login_password: passwordData.newPassword
      });
      
      if (success) {
        setProfileData(prev => ({ ...prev, login_password: passwordData.newPassword }));
        setMessage({ type: 'success', text: '密码修改成功！' });
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: '密码修改失败，请稍后重试' });
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      setMessage({ type: 'error', text: '密码修改失败，请稍后重试' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };



  const currentData = isEditing ? tempData : profileData;

  return (
    <div className="profile-container">
      <div className="page-header">
        <h1 className="page-title">个人资料</h1>
        <p className="page-subtitle">管理您的个人信息和账户设置</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}>
          <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2`}></i>
          {message.text}
        </div>
      )}

      <div className="row">
        <div className="col-md-4">
          <div className="card profile-card">
            <div className="card-body text-center">
              <div className="avatar-container">
                {currentData.photo ? (
                  <img src={currentData.photo} alt="头像" className="profile-avatar" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    <i className="fas fa-user fa-3x"></i>
                  </div>
                )}
              </div>
              <h4 className="mt-3">{currentData.username || '管理员'}</h4>
              <p className="text-muted">系统管理员</p>
              <p className="text-muted">
                <i className="fas fa-building me-2"></i>
                {currentData.department || '系统管理部'}
              </p>
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-body">
              <h6 className="card-title">账户信息</h6>
              <div className="stat-item">
                <span className="stat-label">用户类型</span>
                <span className="stat-value">系统管理员</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">状态</span>
                <span className="stat-value">正常</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">基本信息</h5>
              <div>
                {!isEditing ? (
                  <button className="btn btn-primary btn-sm" onClick={handleEdit}>
                    <i className="fas fa-edit me-2"></i>编辑资料
                  </button>
                ) : (
                  <div>
                    <button className="btn btn-success btn-sm me-2" onClick={handleSave}>
                      <i className="fas fa-save me-2"></i>保存
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
                      <i className="fas fa-times me-2"></i>取消
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group mb-3">
                    <label className="form-label">用户名</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-control"
                        value={currentData.username || ''}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                      />
                    ) : (
                      <p className="form-control-plaintext">{currentData.username}</p>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group mb-3">
                    <label className="form-label">邮箱</label>
                    {isEditing ? (
                      <input
                        type="email"
                        className="form-control"
                        value={currentData.postbox || ''}
                        onChange={(e) => handleInputChange('postbox', e.target.value)}
                      />
                    ) : (
                      <p className="form-control-plaintext">{currentData.postbox}</p>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group mb-3">
                    <label className="form-label">手机号码</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        className="form-control"
                        value={currentData.phonenumber || ''}
                        onChange={(e) => handleInputChange('phonenumber', e.target.value)}
                      />
                    ) : (
                      <p className="form-control-plaintext">{currentData.phonenumber}</p>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group mb-3">
                    <label className="form-label">部门</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-control"
                        value={currentData.department || ''}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                      />
                    ) : (
                      <p className="form-control-plaintext">{currentData.department}</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-header">
              <h5 className="mb-0">安全设置</h5>
            </div>
            <div className="card-body">
              <div className="security-item">
                <div className="security-info">
                  <h6>登录密码</h6>
                  <p className="text-muted">定期更新密码有助于保护账户安全</p>
                </div>
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setShowPasswordModal(true)}
                >
                  修改密码
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 修改密码模态框 */}
      {showPasswordModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">修改密码</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPasswordModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label className="form-label">当前密码</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">新密码</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">确认新密码</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPasswordModal(false)}
                >
                  取消
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handlePasswordSubmit}
                >
                  确认修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPasswordModal && <div className="modal-backdrop show"></div>}
    </div>
  );
};

export default Profile;