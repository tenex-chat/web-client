import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught error:", error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Card className="p-6 m-4">
                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold">Something went wrong</h2>
                            <p className="text-sm text-muted-foreground">
                                An error occurred while rendering this component.
                            </p>
                            {this.state.error && (
                                <details className="mt-4 text-left">
                                    <summary className="cursor-pointer text-sm font-medium">
                                        Error details
                                    </summary>
                                    <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                                        {this.state.error.message}
                                    </pre>
                                </details>
                            )}
                        </div>
                        <Button onClick={this.handleReset} variant="outline" size="sm">
                            Try again
                        </Button>
                    </div>
                </Card>
            );
        }

        return this.props.children;
    }
}