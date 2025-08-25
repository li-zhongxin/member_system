import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/sidebar.css';

function Sidebar({ isOpen }) {
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);

  const toggleMemberMenu = () => {
    setMemberMenuOpen(!memberMenuOpen);
  };

  const toggleProductMenu = () => {
    setProductMenuOpen(!productMenuOpen);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h3>会员管理系统</h3>
      </div>
      <div className="sidebar-menu">
        <ul>
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
              <i className="fas fa-tachometer-alt"></i>
              <span>控制面板</span>
            </NavLink>
          </li>
          
          {/* 会员管理菜单 */}
          <li className="menu-item-with-submenu">
            <div className="menu-item" onClick={toggleMemberMenu}>
              <div className="menu-link">
                <i className="fas fa-users"></i>
                <span>会员管理</span>
              </div>
              <i className={`fas fa-chevron-${memberMenuOpen ? 'down' : 'right'} submenu-arrow`}></i>
            </div>
            <ul className={`submenu ${memberMenuOpen ? 'open' : ''}`}>
              <li>
                <NavLink to="/members" className={({ isActive }) => isActive ? 'active' : ''}>
                  <i className="fas fa-list"></i>
                  <span>会员列表</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/members/add" className={({ isActive }) => isActive ? 'active' : ''}>
                  <i className="fas fa-user-plus"></i>
                  <span>新增会员</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/members/recharge" className={({ isActive }) => isActive ? 'active' : ''}>
                  <i className="fas fa-credit-card"></i>
                  <span>会员充值</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/members/consume" className={({ isActive }) => isActive ? 'active' : ''}>
                  <i className="fas fa-shopping-cart"></i>
                  <span>会员消费</span>
                </NavLink>
              </li>
            </ul>
          </li>

          {/* 商品管理菜单 */}
          <li className="menu-item-with-submenu">
            <div className="menu-item" onClick={toggleProductMenu}>
              <div className="menu-link">
                <i className="fas fa-box"></i>
                <span>商品管理</span>
              </div>
              <i className={`fas fa-chevron-${productMenuOpen ? 'down' : 'right'} submenu-arrow`}></i>
            </div>
            <ul className={`submenu ${productMenuOpen ? 'open' : ''}`}>
              <li>
                <NavLink to="/products" className={({ isActive }) => isActive ? 'active' : ''}>
                  <i className="fas fa-boxes"></i>
                  <span>商品信息</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/products/inventory" className={({ isActive }) => isActive ? 'active' : ''}>
                  <i className="fas fa-clipboard-list"></i>
                  <span>库存盘点</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/inventory-records" className={({ isActive }) => isActive ? 'active' : ''}>
                  <i className="fas fa-file-alt"></i>
                  <span>盘点记录</span>
                </NavLink>
              </li>
            </ul>
          </li>

          <li>
            <NavLink to="/consumption-records" className={({ isActive }) => isActive ? 'active' : ''}>
              <i className="fas fa-history"></i>
              <span>消费记录</span>
            </NavLink>
          </li>

          <li>
            <NavLink to="/business-analysis" className={({ isActive }) => isActive ? 'active' : ''}>
              <i className="fas fa-chart-bar"></i>
              <span>营业分析</span>
            </NavLink>
          </li>
          
        </ul>
      </div>
      <div className="sidebar-footer">
        <p>© 2025 会员管理系统</p>
      </div>
    </div>
  );
}

export default Sidebar;