import { Component } from "react";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Грешка на картата:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error">
          Има проблем при зареждането на картата. Моля опитайте да презаредите.
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
