import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../services/api';

interface Notification {
  id: string;
  userId: string;
  type: 'reminder' | 'approval' | 'system' | 'freeze';
  title: string;
  content: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 获取通知列表
  const fetchNotifications = async (tab: 'all' | 'unread') => {
    setLoading(true);
    try {
      const response = await notificationApi.getMyNotifications(
        tab === 'unread' ? false : undefined
      );
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('获取通知列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(activeTab);
  }, [activeTab]);

  // 切换Tab
  const handleTabChange = (tab: 'all' | 'unread') => {
    setActiveTab(tab);
  };

  // 标记为已读
  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationApi.markAsRead(notification.id);
      
      // 更新本地状态
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
      
      // 如果在"未读"Tab且标记后已读，移除该项
      if (activeTab === 'unread') {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  // 全部标记为已读
  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      
      // 重新加载列表
      fetchNotifications(activeTab);
    } catch (error) {
      console.error('全部标记已读失败:', error);
    }
  };

  // 点击通知项
  const handleNotificationClick = async (notification: Notification) => {
    // 如果未读，先标记为已读
    if (!notification.read) {
      await handleMarkAsRead(notification);
    }
    
    // 跳转到对应页面
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // 获取通知类型图标颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reminder':
        return 'bg-orange-100 text-orange-600';
      case 'approval':
        return 'bg-blue-100 text-blue-600';
      case 'freeze':
        return 'bg-red-100 text-red-600';
      case 'system':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // 获取通知类型文字
  const getTypeText = (type: string) => {
    switch (type) {
      case 'reminder':
        return '提醒';
      case 'approval':
        return '审批';
      case 'freeze':
        return '冻结';
      case 'system':
        return '系统';
      default:
        return '通知';
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="h-6 w-6 text-gray-700" />
              <h1 className="text-2xl font-bold text-gray-900">消息中心</h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                <CheckCheck className="h-4 w-4" />
                <span>全部已读</span>
              </button>
            )}
          </div>

          {/* Tab切换 */}
          <div className="mt-4 flex space-x-1 border-b border-gray-200">
            <button
              onClick={() => handleTabChange('unread')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'unread'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              未读 {activeTab === 'unread' && unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => handleTabChange('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              全部
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">加载中...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500">
                {activeTab === 'unread' ? '暂无未读消息' : '暂无消息'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* 类型图标 */}
                    <div className={`p-2 rounded-full ${getTypeColor(notification.type)}`}>
                      <Bell className="h-5 w-5" />
                    </div>

                    {/* 内容 */}
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(notification.type)}`}>
                          {getTypeText(notification.type)}
                        </span>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <h3 className={`text-sm mb-1 ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification);
                        }}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="标记为已读"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
