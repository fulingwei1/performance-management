import React from 'react';
import {
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  BoltIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    icon: DevicePhoneMobileIcon,
    title: '响应式设计',
    description: '所有页面自动适配手机、平板和桌面设备'
  },
  {
    icon: BoltIcon,
    title: '快速访问',
    description: '底部导航栏提供4个常用功能快速入口'
  },
  {
    icon: ArrowDownTrayIcon,
    title: 'PWA 支持',
    description: '可添加到主屏幕，像原生应用一样使用'
  },
  {
    icon: CheckCircleIcon,
    title: '离线可用',
    description: 'Service Worker 缓存关键资源，离线也能访问'
  }
];

const installSteps = [
  { step: 1, text: '在手机浏览器中打开本应用' },
  { step: 2, text: '点击浏览器菜单中的"添加到主屏幕"' },
  { step: 3, text: '确认安装，图标将出现在桌面' },
  { step: 4, text: '从桌面启动，享受原生应用体验' }
];

export const MobileDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <DevicePhoneMobileIcon className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            移动端优化
          </h1>
          <p className="text-lg md:text-xl opacity-90">
            随时随地管理绩效，手机访问体验完美
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          核心特性
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <Icon className="h-10 w-10 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Installation Guide */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          如何安装到手机
        </h2>
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="space-y-6">
            {installSteps.map((item) => (
              <div key={item.step} className="flex items-start">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <p className="ml-4 text-gray-700 pt-1">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Browser-specific tips */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">
              📱 浏览器说明
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Safari (iOS)</strong>: 点击分享按钮 → 添加到主屏幕</li>
              <li>• <strong>Chrome (Android)</strong>: 菜单 → 安装应用</li>
              <li>• <strong>Edge/Firefox</strong>: 地址栏会显示安装提示</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Responsive Demo */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          响应式演示
        </h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-blue-100 p-4 rounded text-center">
                <p className="font-medium text-blue-900">手机</p>
                <p className="text-sm text-blue-700 mt-1">&lt; 640px</p>
              </div>
              <div className="flex-1 bg-green-100 p-4 rounded text-center hidden sm:block">
                <p className="font-medium text-green-900">平板</p>
                <p className="text-sm text-green-700 mt-1">640px - 1024px</p>
              </div>
              <div className="flex-1 bg-purple-100 p-4 rounded text-center hidden lg:block">
                <p className="font-medium text-purple-900">桌面</p>
                <p className="text-sm text-purple-700 mt-1">&gt; 1024px</p>
              </div>
            </div>
            
            <p className="text-center text-gray-600 text-sm">
              调整浏览器窗口大小，看看布局如何自动适配 👆
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">
            立即体验移动端
          </h3>
          <p className="mb-6 opacity-90">
            在手机上打开，感受原生应用般的流畅体验
          </p>
          <button
            onClick={() => {
              if ('share' in navigator) {
                navigator.share({
                  title: '绩效管理系统',
                  text: '随时随地管理绩效',
                  url: window.location.href
                });
              } else {
                alert('请在手机浏览器中打开此页面');
              }
            }}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            分享此页面
          </button>
        </div>
      </div>
    </div>
  );
};
