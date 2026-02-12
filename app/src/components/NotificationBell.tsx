import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
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

export const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 获取未读数量
  const fetchUnreadCount = async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('获取未读数量失败:', error);
    }
  };

  // 获取最近的通知列表（最多显示5条）
  const fetchRecentNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationApi.getMyNotifications();
      if (response.success) {
        setNotifications(response.data.slice(0, 5));
      }
    } catch (error) {
      console.error('获取通知列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchUnreadCount();
    
    // 每30秒刷新一次未读数量
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 点击铃铛图标
  const handleBellClick = () => {
    if (!showDropdown) {
      fetchRecentNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  // 点击通知项
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // 标记为已读
      if (!notification.read) {
        await notificationApi.markAsRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // 更新本地状态
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
      }
      
      // 关闭下拉菜单
      setShowDropdown(false);
      
      // 跳转到对应页面
      if (notification.link) {
        navigate(notification.link);
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  // 查看全部
  const handleViewAll = () => {
    setShowDropdown(false);
    navigate('/notifications');
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // 获取通知类型图标颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reminder':
        return 'text-orange-600';
      case 'approval':
        return 'text-blue-600';
      case 'freeze':
        return 'text-red-600';
      case 'system':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
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
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 铃铛图标 */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉通知列表 */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">通知消息</h3>
          </div>

          {loading ? (
            <div className="p-4 text-center text-gray-500">加载中...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">暂无消息</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <div className={`mt-0.5 ${getTypeColor(notification.type)}`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-gray-200">
            <button
              onClick={handleViewAll}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
