import React, { useState, useEffect, useRef } from 'react';
import ApiService from '../services/apiService';
// BusinessOverview组件已移至独立的营业分析页面
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import '../styles/dashboard.css';
import '../styles/global-enhancement.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function Dashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    goldMembers: 0,
    silverMembers: 0,
    bronzeMembers: 0,
    platinumMembers: 0,
    diamondMembers: 0,
    blackMembers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const chartRef = useRef(null);
  const doughnutChartRef = useRef(null);

  // 导出图表功能
  const exportChart = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = '会员等级分布图表.png';
      link.href = url;
      link.click();
    }
  };

  // 获取最近活动数据
  const fetchRecentActivities = async (showLoading = false) => {
    if (showLoading) {
      setActivityLoading(true);
    }
    try {
      const apiService = new ApiService();
      //获取5条记录
      const response = await apiService.getRecentActivities(5);
      if (response.success) {
        const activities = response.data.map(activity => {
          const isRecharge = activity.type === 'recharge';
          const timeAgo = getTimeAgo(activity.date);
          
          return {
            type: isRecharge ? '会员充值' : '会员消费',
            icon: isRecharge ? 'fa-credit-card' : 'fa-shopping-cart',
            color: isRecharge ? 'bg-success' : 'bg-warning',
            desc: `${activity.memberName} ${activity.action}`,
            timeAgo,
            member: activity.memberName
          };
        });
        
        setRecentActivities(activities);
      } else {
        console.error('获取最近活动失败:', response.message);
        // 如果获取消费记录失败，显示默认消息
        setRecentActivities([]);
      }
    } catch (err) {
      console.error('获取最近活动失败:', err);
      setRecentActivities([]);
    } finally {
      if (showLoading) {
        setActivityLoading(false);
      }
    }
  };
  
  // 计算时间差
  const getTimeAgo = (dateString) => {
    if (!dateString) return '未知时间';
    
    const now = new Date();
    const activityDate = new Date(dateString);
    const diffMs = now - activityDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return activityDate.toLocaleDateString();
  };

  useEffect(() => {
    fetchMemberStats();
    fetchRecentActivities();
    
    // 设置定时器，每30秒刷新一次最近活动
    const activityInterval = setInterval(() => {
      fetchRecentActivities();
    }, 30000); // 30秒
    
    // 设置定时器，每60秒刷新一次统计数据
    const statsInterval = setInterval(() => {
      fetchMemberStats();
    }, 60000); // 60秒
    
    // 清理定时器
    return () => {
      clearInterval(activityInterval);
      clearInterval(statsInterval);
    };
  }, []);

  const fetchMemberStats = async () => {
    try {
      const response = await ApiService.getAllMembers();
      if (response.success) {
        const members = response.data.records;
        
        // 计算统计数据
        const totalMembers = members.length;
        const activeMembers = members.filter(m => m.fields.member_status === '启用').length;
        const inactiveMembers = members.filter(m => m.fields.member_status === '停用').length;
        const goldMembers = members.filter(m => m.fields.member_level === '黄金').length;
        const silverMembers = members.filter(m => m.fields.member_level === '白银').length;
        const bronzeMembers = members.filter(m => m.fields.member_level === '青铜').length;
        const platinumMembers = members.filter(m => m.fields.member_level === '铂金').length;
        const diamondMembers = members.filter(m => m.fields.member_level === '钻石').length;
        const blackMembers = members.filter(m => m.fields.member_level === '黑金').length;
        
        setStats({
          totalMembers,
          activeMembers,
          inactiveMembers,
          goldMembers,
          silverMembers,
          bronzeMembers,
          platinumMembers,
          diamondMembers,
          blackMembers
        });
        setError(null);
      } else {
        setError('获取会员数据失败: ' + (response.message || '未知错误'));
      }
    } catch (err) {
      setError('获取会员数据失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="dashboard-container">
      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}
      
      {/* 营业概况已移至独立的营业分析页面 */}
      
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="stat-card total fade-in hover-lift" style={{animationDelay: '0.1s'}}>
            <div className="stat-card-body">
              <div className="stat-card-icon pulse">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-card-info">
                <h5>会员总数</h5>
                <h2 className="text-gradient">{stats.totalMembers}</h2>
                <div className="stat-trend">
                  <i className="fas fa-arrow-up text-success"></i>
                  <span className="text-success">+12%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="stat-card active fade-in hover-lift" style={{animationDelay: '0.2s'}}>
            <div className="stat-card-body">
              <div className="stat-card-icon pulse">
                <i className="fas fa-user-check"></i>
              </div>
              <div className="stat-card-info">
                <h5>启用会员</h5>
                <h2 className="text-gradient">{stats.activeMembers}</h2>
                <div className="stat-trend">
                  <i className="fas fa-arrow-up text-success"></i>
                  <span className="text-success">+8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="stat-card inactive fade-in hover-lift" style={{animationDelay: '0.3s'}}>
            <div className="stat-card-body">
              <div className="stat-card-icon pulse">
                <i className="fas fa-user-times"></i>
              </div>
              <div className="stat-card-info">
                <h5>禁用会员</h5>
                <h2 className="text-gradient">{stats.inactiveMembers}</h2>
                <div className="stat-trend">
                  <i className="fas fa-arrow-down text-danger"></i>
                  <span className="text-danger">-3%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mt-4">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">最近活动 <small className="text-muted">(每30秒自动刷新)</small></h5>
              <button 
                className="btn btn-sm btn-outline-secondary" 
                onClick={() => fetchRecentActivities(true)}
                disabled={activityLoading}
              >
                <i className={`fas fa-sync ${activityLoading ? 'fa-spin' : ''}`}></i> 
                {activityLoading ? '刷新中...' : '刷新'}
              </button>
            </div>
            <div className="card-body">
              <ul className="activity-list">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <li key={index}>
                      <div className={`activity-icon ${activity.color}`}>
                        <i className={`fas ${activity.icon}`}></i>
                      </div>
                      <div className="activity-info">
                        <h6>{activity.type}</h6>
                        <p>{activity.desc}</p>
                        <small>{activity.timeAgo}</small>
                      </div>
                    </li>
                  ))
                ) : (
                  <li>
                    <div className="activity-icon bg-secondary">
                      <i className="fas fa-info-circle"></i>
                    </div>
                    <div className="activity-info">
                      <h6>暂无活动</h6>
                      <p>暂时没有最近的会员活动记录</p>
                      <small>-</small>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;