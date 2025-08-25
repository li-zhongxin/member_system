import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/apiService';
import '../styles/navbar.css';

function Navbar({ toggleSidebar }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      logout();
      navigate('/login');
    }
  };

  // 全局搜索功能
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await ApiService.getAllMembers();
      if (response.success) {
        const members = response.data.records;
        const filtered = members.filter(member => 
          member.fields.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.fields.phonenumber?.includes(searchTerm) ||
          member.fields.member_level?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.fields.member_status?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSearchResults(filtered.slice(0, 5)); // 限制显示5个结果
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 处理搜索输入
  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!value.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // 选择搜索结果
  const handleSelectResult = (member) => {
    navigate(`/members/edit/${member.recordId}`);
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // 点击外部关闭菜单和搜索结果
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    if (showUserMenu || showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showSearchResults]);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
        <h4>会员管理系统</h4>
      </div>
      <div className="navbar-right">
        <div className="search-box" ref={searchRef}>
          <input 
            type="text" 
            placeholder="搜索会员..." 
            value={searchTerm}
            onChange={handleSearchInput}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={isSearching}>
            <i className={`fas ${isSearching ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
          </button>
          
          {showSearchResults && (
            <div className="search-results-dropdown">
              {searchResults.length > 0 ? (
                <>
                  {searchResults.map((member) => (
                    <div 
                      key={member.recordId} 
                      className="search-result-item"
                      onClick={() => handleSelectResult(member)}
                    >
                      <div className="result-info">
                        <span className="result-name">{member.fields.member_name}</span>
                        <span className="result-phone">{member.fields.phonenumber}</span>
                      </div>
                      <div className="result-meta">
                        <span className="result-level">{member.fields.member_level}</span>
                        <span className={`result-status ${member.fields.member_status === '启用' ? 'active' : 'inactive'}`}>
                          {member.fields.member_status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="search-result-footer">
                    <button 
                      className="view-all-btn"
                      onClick={() => {
                        navigate('/members');
                        setSearchTerm('');
                        setShowSearchResults(false);
                      }}
                    >
                      查看所有结果
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-results">
                  <i className="fas fa-search"></i>
                  <span>未找到相关会员</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 切换到前台按钮 */}
        <button 
          className="switch-frontend-btn"
          onClick={() => navigate('/frontend')}
          title="切换到前台收银"
        >
          <i className="fas fa-cash-register"></i>
          <span>前台收银</span>
        </button>
        
        <div className="user-profile" ref={userMenuRef} onClick={() => setShowUserMenu(!showUserMenu)}>
          <div className="user-avatar">
            <i className="fas fa-user-circle fa-2x"></i>
          </div>
          <span>管理员</span>
          <i className="fas fa-chevron-down ms-2"></i>
          
          {showUserMenu && (
            <div className="user-menu">
              <div className="user-menu-item" onClick={() => {
                navigate('/profile');
                setShowUserMenu(false);
              }}>
                <i className="fas fa-user me-2"></i>
                个人资料
              </div>
              <hr className="user-menu-divider" />
              <div className="user-menu-item logout-item" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt me-2"></i>
                退出登录
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;