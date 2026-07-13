import { Component, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center px-8 py-20 gap-3 bg-dark-bg">
          <Text className="text-gray-300 text-lg font-semibold text-center">
            {this.props.fallbackTitle ?? "Algo deu errado"}
          </Text>
          <Text className="text-gray-500 text-sm text-center">
            {this.state.error?.message}
          </Text>
          <Pressable
            onPress={this.handleReset}
            className="mt-4 px-5 py-2.5 rounded-xl bg-brand-primary/15 border border-brand-primary/20 active:opacity-70"
          >
            <Text className="text-brand-primary text-sm font-semibold">
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
