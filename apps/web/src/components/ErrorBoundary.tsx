import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** 全局错误边界：渲染异常时显示可读提示，不暴露堆栈给用户。 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 保留错误日志（08 规则 §4），便于诊断
    console.error('[CampusSchedule] 渲染错误:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <div className="card empty-state">
            <h2>😵 页面出现了问题</h2>
            <p className="muted">{this.state.error.message}</p>
            <p className="note">
              你的课表数据仍保存在本地，不会丢失。刷新页面通常可以恢复。
            </p>
            <button className="btn primary" onClick={() => window.location.reload()}>
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
