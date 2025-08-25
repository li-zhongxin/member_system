import React, { useState, useEffect } from 'react';
import { Card, Table, Button, DatePicker, Select, Space, message } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import ApiService from '../services/apiService';
import '../styles/business-analysis.css';
import '../styles/global-enhancement.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const { RangePicker } = DatePicker;
const { Option } = Select;

function BusinessAnalysis() {
  const [timeRange, setTimeRange] = useState('7days'); // 7days, 30days
  const [loading, setLoading] = useState(false);
  const [businessData, setBusinessData] = useState({
    summary: {
      newMembers: 0,
      totalMembers: 0,
      rechargeAmount: 0,
      consumeAmount: 0,
      profit: 0
    },
    dailyData: [],
    memberLevelData: [],
    rechargeRecords: [],
    consumeRecords: []
  });

  useEffect(() => {
    fetchBusinessData();
  }, [timeRange]);

  const fetchBusinessData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (timeRange === '7days' ? 7 : 30));

      // 获取会员数据
      const membersResponse = await ApiService.getAllMembers();
      let members = [];
      if (membersResponse.success) {
        members = membersResponse.data.records || [];
      }

      // 获取充值记录
      const rechargeResponse = await ApiService.getRechargeRecords();
      let rechargeRecords = [];
      if (rechargeResponse.success) {
        rechargeRecords = rechargeResponse.data.records || [];
      }

      // 获取消费记录
      const consumeResponse = await ApiService.getConsumeRecords();
      let consumeRecords = [];
      if (consumeResponse.success) {
        consumeRecords = consumeResponse.data.records || [];
      }

      // 过滤时间范围内的数据
      const filteredRecharge = rechargeRecords.filter(record => {
        try {
          const recordDate = new Date(record.fields.date);
          return recordDate >= startDate && recordDate <= endDate;
        } catch (error) {
          console.warn('充值记录日期解析错误:', record.fields.date);
          return false;
        }
      });

      const filteredConsume = consumeRecords.filter(record => {
        try {
          const recordDate = new Date(record.fields.date);
          return recordDate >= startDate && recordDate <= endDate;
        } catch (error) {
          console.warn('消费记录日期解析错误:', record.fields.date);
          return false;
        }
      });

      // 计算汇总数据
      const newMembers = members.filter(member => {
        const createTime = new Date(member.createdAt);
        return createTime >= startDate;
      }).length;

      const rechargeAmount = filteredRecharge.reduce((sum, record) => {
        try {
          // 从record字段中提取金额，格式如"充值100元"
          const match = record.fields.record?.match(/充值(\d+(?:\.\d+)?)元/);
          const amount = match ? parseFloat(match[1]) : 0;
          return sum + amount;
        } catch (error) {
          console.warn('充值金额解析错误:', record.fields.record);
          return sum;
        }
      }, 0);

      const consumeAmount = filteredConsume.reduce((sum, record) => {
        try {
          // 从record字段中提取金额，格式如"消费50元"
          const match = record.fields.record?.match(/消费(\d+(?:\.\d+)?)元/);
          const amount = match ? parseFloat(match[1]) : 0;
          return sum + amount;
        } catch (error) {
          console.warn('消费金额解析错误:', record.fields.record);
          return sum;
        }
      }, 0);

      // 生成每日数据
      const dailyData = generateDailyData(startDate, endDate, filteredRecharge, filteredConsume, members);

      // 生成会员等级分布数据
      const memberLevelData = generateMemberLevelData(members);

      setBusinessData({
        summary: {
          newMembers,
          totalMembers: members.length,
          rechargeAmount,
          consumeAmount,
          profit: rechargeAmount - consumeAmount
        },
        dailyData,
        memberLevelData,
        rechargeRecords: filteredRecharge,
        consumeRecords: filteredConsume
      });

    } catch (error) {
      console.error('获取营业数据失败:', error);
      message.error('获取营业数据失败');
    } finally {
      setLoading(false);
    }
  };

  const generateDailyData = (startDate, endDate, rechargeRecords, consumeRecords, members) => {
    const dailyData = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayRecharge = rechargeRecords
        .filter(record => {
          try {
            const recordDate = record.fields.date || '';
            // 将记录日期转换为YYYY-MM-DD格式进行比较
            const normalizedRecordDate = new Date(recordDate).toISOString().split('T')[0];

            return normalizedRecordDate === dateStr;
          } catch (error) {
            console.warn('日期解析错误:', record.fields.date);
            return false;
          }
        })
        .reduce((sum, record) => {
          try {
            const match = record.fields.record?.match(/充值(\d+(?:\.\d+)?)元/);
            const amount = match ? parseFloat(match[1]) : 0;
            return sum + amount;
          } catch (error) {
            console.warn('充值金额解析错误:', record.fields.record);
            return sum;
          }
        }, 0);
      
      const dayConsume = consumeRecords
        .filter(record => {
          try {
            const recordDate = record.fields.date || '';
            // 将记录日期转换为YYYY-MM-DD格式进行比较
            const normalizedRecordDate = new Date(recordDate).toISOString().split('T')[0];
            return normalizedRecordDate === dateStr;
          } catch (error) {
            console.warn('日期解析错误:', record.fields.date);
            return false;
          }
        })
        .reduce((sum, record) => {
          try {
            const match = record.fields.record?.match(/消费(\d+(?:\.\d+)?)元/);
            const amount = match ? parseFloat(match[1]) : 0;
            return sum + amount;
          } catch (error) {
            console.warn('消费金额解析错误:', record.fields.record);
            return sum;
          }
        }, 0);
      
      const dayNewMembers = members
        .filter(member => {
          try {
            const memberDate = member.createdAt ? new Date(member.createdAt).toISOString().split('T')[0] : '';
            return memberDate === dateStr;
          } catch (error) {
            console.warn('日期解析错误:', member.createdAt);
            return false;
          }
        })
        .length;

      dailyData.push({
        date: dateStr,
        dateDisplay: currentDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        recharge: dayRecharge,
        consume: dayConsume,
        newMembers: dayNewMembers,
        profit: dayRecharge - dayConsume
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyData;
  };

  const generateMemberLevelData = (members) => {
    const levelCount = {};
    members.forEach(member => {
      const level = member.fields.member_level || '普通会员';
      levelCount[level] = (levelCount[level] || 0) + 1;
    });

    return Object.entries(levelCount).map(([level, count]) => ({
      level,
      count,
      percentage: ((count / members.length) * 100).toFixed(1)
    }));
  };

  // 导出数据
  const exportData = (type) => {
    let data, filename, headers;
    
    switch (type) {
      case 'summary':
        data = [businessData.summary];
        filename = `营业汇总_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['新增会员', '总会员数', '充值金额', '消费金额', '利润'];
        break;
      case 'daily':
        data = businessData.dailyData;
        filename = `每日数据_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['日期', '充值金额', '消费金额', '新增会员', '利润'];
        break;
      case 'recharge':
        data = businessData.rechargeRecords;
        filename = `充值记录_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['会员姓名', '手机号', '充值金额', '充值时间', '备注'];
        break;
      case 'consume':
        data = businessData.consumeRecords;
        filename = `消费记录_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['会员姓名', '手机号', '消费金额', '消费时间', '备注'];
        break;
      default:
        return;
    }

    exportToCSV(data, filename, headers, type);
  };

  const exportToCSV = (data, filename, headers, type) => {
    let csvContent;
    
    if (type === 'summary') {
      csvContent = [
        headers.join(','),
        `${data[0].newMembers},${data[0].totalMembers},${data[0].rechargeAmount},${data[0].consumeAmount},${data[0].profit}`
      ].join('\n');
    } else if (type === 'daily') {
      csvContent = [
        headers.join(','),
        ...data.map(item => `${item.date},${item.recharge},${item.consume},${item.newMembers},${item.profit}`)
      ].join('\n');
    } else {
      csvContent = [
        headers.join(','),
        ...data.map(record => [
          record.fields.member_name || '',
          record.fields.phonenumber || '',
          record.fields.amount || 0,
          new Date(record.createdAt).toLocaleString('zh-CN'),
          (record.fields.note || '').replace(/,/g, '；')
        ].join(','))
      ].join('\n');
    }

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('导出成功！');
  };

  // 图表配置
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // 每日数据表格列
  const dailyColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (text) => new Date(text).toLocaleDateString('zh-CN')
    },
    {
      title: '新增会员',
      dataIndex: 'newMembers',
      key: 'newMembers',
    },
    {
      title: '充值金额',
      dataIndex: 'recharge',
      key: 'recharge',
      render: (value) => `¥${value.toFixed(2)}`
    },
    {
      title: '消费金额',
      dataIndex: 'consume',
      key: 'consume',
      render: (value) => `¥${value.toFixed(2)}`
    },
    {
      title: '利润',
      dataIndex: 'profit',
      key: 'profit',
      render: (value) => (
        <span className={value >= 0 ? 'text-success' : 'text-danger'}>
          ¥{value.toFixed(2)}
        </span>
      )
    }
  ];

  return (
    <div className="business-analysis">
      <div className="page-header business-analysis">
        <h2>营业分析</h2>
        <Space>
          <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
            <Option value="7days">近7天</Option>
            <Option value="30days">近30天</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchBusinessData} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 汇总统计卡片 */}
      <div className="summary-cards">
        <Card className="summary-card">
          <div className="card-content">
            <div className="card-icon new-members">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="card-info">
              <h3>{businessData.summary.newMembers}</h3>
              <p>新增会员</p>
            </div>
          </div>
        </Card>
        
        <Card className="summary-card">
          <div className="card-content">
            <div className="card-icon total-members">
              <i className="fas fa-users"></i>
            </div>
            <div className="card-info">
              <h3>{businessData.summary.totalMembers}</h3>
              <p>总会员数</p>
            </div>
          </div>
        </Card>
        
        <Card className="summary-card">
          <div className="card-content">
            <div className="card-icon recharge">
              <i className="fas fa-wallet"></i>
            </div>
            <div className="card-info">
              <h3>¥{businessData.summary.rechargeAmount.toFixed(2)}</h3>
              <p>充值收入</p>
            </div>
          </div>
        </Card>
        
        <Card className="summary-card">
          <div className="card-content">
            <div className="card-icon consume">
              <i className="fas fa-shopping-cart"></i>
            </div>
            <div className="card-info">
              <h3>¥{businessData.summary.consumeAmount.toFixed(2)}</h3>
              <p>消费支出</p>
            </div>
          </div>
        </Card>
        
        <Card className="summary-card">
          <div className="card-content">
            <div className={`card-icon profit ${businessData.summary.profit >= 0 ? 'positive' : 'negative'}`}>
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="card-info">
              <h3 className={businessData.summary.profit >= 0 ? 'text-success' : 'text-danger'}>
                ¥{businessData.summary.profit.toFixed(2)}
              </h3>
              <p>净利润</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="charts-section">
        <div className="chart-row">
          <Card title="每日收支趋势" className="chart-card" 
                extra={<Button icon={<DownloadOutlined />} onClick={() => exportData('daily')}>导出</Button>}>
            {businessData.dailyData && businessData.dailyData.length > 0 ? (
              <Bar
                data={{
                  labels: businessData.dailyData.map(item => item.dateDisplay),
                  datasets: [
                    {
                      label: '充值金额',
                      data: businessData.dailyData.map(item => item.recharge),
                      backgroundColor: 'rgba(54, 162, 235, 0.8)',
                      borderColor: 'rgba(54, 162, 235, 1)',
                      borderWidth: 1
                    },
                    {
                      label: '消费金额',
                      data: businessData.dailyData.map(item => item.consume),
                      backgroundColor: 'rgba(255, 99, 132, 0.8)',
                      borderColor: 'rgba(255, 99, 132, 1)',
                      borderWidth: 1
                    }
                  ]
                }}
                options={chartOptions}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                暂无数据
              </div>
            )}
          </Card>
        </div>
        
        <div className="chart-row">
          <Card title="每日新增会员" className="chart-card half-width">
            {businessData.dailyData && businessData.dailyData.length > 0 ? (
              <Line
                data={{
                  labels: businessData.dailyData.map(item => item.dateDisplay),
                  datasets: [{
                    label: '新增会员数',
                    data: businessData.dailyData.map(item => item.newMembers),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4
                  }]
                }}
                options={chartOptions}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                暂无数据
              </div>
            )}
          </Card>
          
          <Card title="会员等级分布" className="chart-card half-width">
            {businessData.memberLevelData && businessData.memberLevelData.length > 0 ? (
              <Doughnut
                data={{
                  labels: businessData.memberLevelData.map(item => item.level),
                  datasets: [{
                    data: businessData.memberLevelData.map(item => item.count),
                    backgroundColor: [
                      'rgba(255, 99, 132, 0.8)',
                      'rgba(54, 162, 235, 0.8)',
                      'rgba(255, 205, 86, 0.8)',
                      'rgba(75, 192, 192, 0.8)',
                      'rgba(153, 102, 255, 0.8)'
                  ]
                }]
              }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                  暂无数据
                </div>
              )}
            </Card>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="tables-section">
        <Card title="每日数据明细" 
              extra={<Button icon={<DownloadOutlined />} onClick={() => exportData('daily')}>导出表格</Button>}>
          <Table
            columns={dailyColumns}
            dataSource={businessData.dailyData}
            rowKey="date"
            pagination={{ pageSize: 10 }}
            loading={loading}
            size="small"
          />
        </Card>
      </div>

      {/* 导出按钮组 */}
      <div className="export-section">
        <Card title="数据导出">
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={() => exportData('summary')}>
              导出汇总数据
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportData('daily')}>
              导出每日数据
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportData('recharge')}>
              导出充值记录
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportData('consume')}>
              导出消费记录
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
}

export default BusinessAnalysis;