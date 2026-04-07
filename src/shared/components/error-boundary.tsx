"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <p className="font-medium text-destructive">
            Algo salió mal
          </p>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message ?? "Error inesperado"}
          </p>
          <Button variant="outline" onClick={this.handleRetry}>
            Intentar de nuevo
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
