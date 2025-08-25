import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/frontend-navigation.css';

function FrontendNavigation() {
  const location = useLocation();

  const navigationItems = [
    {
      path: '/frontend/cashier',
      label: '收银',
      icon: '💰',
      description: '商品销售与结算'
    },
    {
      path: '/frontend/recharge',
      label: '充值',
      icon: '💳',
      description: '会员余额充值'
    },
    {
      path: '/frontend/registration',
      label: '办卡',
      icon: '👤',
      description: '新会员注册办卡'
    }
  ];

  return (
    <div className="frontend-navigation">
      <div className="nav-header">
        <h2>前台收银系统</h2>
        <div className="system-info">
          <span className="store-name">智慧门店收银台</span>
          <span className="current-time">
            {new Date().toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })}
          </span>
        </div>
      </div>

      <nav className="nav-menu">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-icon">{item.icon}</div>
              <div className="nav-content">
                <div className="nav-label">{item.label}</div>
                <div className="nav-description">{item.description}</div>
              </div>
              {isActive && <div className="active-indicator"></div>}
            </Link>
          );
        })}
      </nav>

      <div className="nav-footer">
        <div className="system-status">
          <div className="status-item">
            <span className="status-dot online"></span>
            <span>系统在线</span>
          </div>
          <div className="status-item">
            <span className="status-dot"></span>
            <span>收银员：管理员</span>
          </div>
        </div>
        
        <Link to="/" className="switch-system-btn">
          <span>🔄</span>
          切换到后台管理
        </Link>
      </div>
    </div>
  );
}

export default FrontendNavigation;