import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import ApiService from '../services/apiService';
import '../styles/business-overview.css';

function BusinessOverview() {
  const [businessData, setBusinessData] = useState({
    newMembers: 0,
    totalMembers: 0,
    rechargeAmount: 0,
    consumeAmount: 0
  });
  const [timeRange, setTimeRange] = useState('today'); // today, 7days, 30days
  const [chartData, setChartData] = useState({
    recharge: { labels: [], data: [] },
    newMembers: { labels: [], data: [] },
    consume: { labels: [], data: [] }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinessData();
  }, [timeRange]);

  const fetchBusinessData = async () => {
    setLoading(true);
    try {
      // 获取会员数据
      const membersResponse = await ApiService.getAllMembers();
      if (membersResponse.success) {
        const members = membersResponse.data.records || [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let startDate;
        if (timeRange === 'today') {
          startDate = today;
        } else if (timeRange === '7days') {
          startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        } else {
          startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
        }

        // 计算新会员数
        const newMembers = members.filter(member => {
          const createTime = new Date(member.createdAt);
          return createTime >= startDate;
        }).length;

        setBusinessData(prev => ({
          ...prev,
          newMembers,
          totalMembers: members.length
        }));
      }

      // 获取充值记录
      const rechargeResponse = await ApiService.getRechargeRecords();
      if (rechargeResponse.success) {
        const records = rechargeResponse.data.records || [];
        const rechargeAmount = records
          .filter(record => {
            const recordDate = new Date(record.createdAt);
            return recordDate >= getStartDate();
          })
          .reduce((sum, record) => sum + parseFloat(record.fields.amount || 0), 0);
        
        setBusinessData(prev => ({ ...prev, rechargeAmount }));
      }

      // 获取消费记录
      const consumeResponse = await ApiService.getConsumeRecords();
      if (consumeResponse.success) {
        const records = consumeResponse.data.records || [];
        const consumeAmount = records
          .filter(record => {
            const recordDate = new Date(record.createdAt);
            return recordDate >= getStartDate();
          })
          .reduce((sum, record) => sum + parseFloat(record.fields.amount || 0), 0);
        
        setBusinessData(prev => ({ ...prev, consumeAmount }));
      }

      // 生成图表数据
      generateChartData();
    } catch (error) {
      console.error('获取营业数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (timeRange === 'today') {
      return today;
    } else if (timeRange === '7days') {
      return new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    } else {
      return new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    }
  };

  const generateChartData = () => {
    const days = timeRange === 'today' ? 1 : (timeRange === '7days' ? 7 : 30);
    const labels = [];
    const rechargeData = [];
    const newMembersData = [];
    const consumeData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
      
      // 这里应该根据实际数据计算每日数值，暂时使用随机数据
      rechargeData.push(Math.floor(Math.random() * 5000));
      newMembersData.push(Math.floor(Math.random() * 20));
      consumeData.push(Math.floor(Math.random() * 3000));
    }

    setChartData({
      recharge: { labels, data: rechargeData },
      newMembers: { labels, data: newMembersData },
      consume: { labels, data: consumeData }
    });
  };

  const getChartOptions = (title) => ({
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: title
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  });

  if (loading) {
    return null;
  }

  return (
    <div className="business-overview">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="section-title mb-0">营业概况</h4>
        <div className="btn-group" role="group">
          <button 
            className={`btn btn-sm ${timeRange === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setTimeRange('today')}
          >
            今日
          </button>
          <button 
            className={`btn btn-sm ${timeRange === '7days' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setTimeRange('7days')}
          >
            近7天
          </button>
          <button 
            className={`btn btn-sm ${timeRange === '30days' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setTimeRange('30days')}
          >
            近30天
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="stat-card new-members">
            <div className="stat-card-body">
              <div className="stat-card-icon">
                <i className="fas fa-user-plus"></i>
              </div>
              <div className="stat-card-info">
                <h5>新会员数</h5>
                <h2>{businessData.newMembers}</h2>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="stat-card total-members">
            <div className="stat-card-body">
              <div className="stat-card-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-card-info">
                <h5>总会员数</h5>
                <h2>{businessData.totalMembers}</h2>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="stat-card recharge-amount">
            <div className="stat-card-body">
              <div className="stat-card-icon">
                <i className="fas fa-wallet"></i>
              </div>
              <div className="stat-card-info">
                <h5>充值收入</h5>
                <h2>¥{businessData.rechargeAmount.toFixed(2)}</h2>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="stat-card consume-amount">
            <div className="stat-card-body">
              <div className="stat-card-icon">
                <i className="fas fa-shopping-cart"></i>
              </div>
              <div className="stat-card-info">
                <h5>消费金额</h5>
                <h2>¥{businessData.consumeAmount.toFixed(2)}</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 图表 */}
      {timeRange !== 'today' && (
        <>
          {/* 会员数量图表单独一行 */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <Bar
                    data={{
                      labels: chartData.newMembers.labels,
                      datasets: [{
                        data: chartData.newMembers.data,
                        backgroundColor: 'rgba(75, 192, 192, 0.8)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                      }]
                    }}
                    options={getChartOptions(`${timeRange === '7days' ? '近7天' : '近30天'}每日新增会员数`)}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* 充值和消费图表共占一行 */}
          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-body">
                  <Bar
                    data={{
                      labels: chartData.recharge.labels,
                      datasets: [{
                        data: chartData.recharge.data,
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                      }]
                    }}
                    options={getChartOptions(`${timeRange === '7days' ? '近7天' : '近30天'}每日充值金额`)}
                  />
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-body">
                  <Bar
                    data={{
                      labels: chartData.consume.labels,
                      datasets: [{
                        data: chartData.consume.data,
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                      }]
                    }}
                    options={getChartOptions(`${timeRange === '7days' ? '近7天' : '近30天'}每日消费金额`)}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default BusinessOverview;