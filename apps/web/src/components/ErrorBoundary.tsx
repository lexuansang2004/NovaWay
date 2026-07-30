import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Bọc quanh <App /> trong main.tsx. Không có hook tương đương —
// getDerivedStateFromError/componentDidCatch chỉ tồn tại ở class component.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-300/70" />
          <h1 className="text-xl font-semibold text-white">Đã có lỗi xảy ra</h1>
          <p className="max-w-sm text-sm text-slate-400">
            Một lỗi không lường trước đã xảy ra. Tải lại trang để tiếp tục.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-2 border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:from-cyan-300 hover:to-emerald-300"
          >
            Tải lại trang
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
